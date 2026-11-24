"""Checks on whether the theme reads well: named text styles, contrast of text on surfaces, scheme coverage."""
from __future__ import annotations

import re
from collections import defaultdict
from typing import Dict, List, Optional, Set, Tuple

from .colors import RGBA, composite, contrast_ratio, ratio_text, to_hex
from .health import Check, Context, Lead, scale
from .theme import Theme, Token, words

TEXT_CONTRAST = 4.5     # WCAG AA for body text
CONTROL_CONTRAST = 3.0  # WCAG AA for large text and for the boundary of a control

_TEXT_WORDS = frozenset({"text", "fg", "foreground", "ink", "label", "heading", "body", "link", "content", "on",
                         "title", "caption"})
_SURFACE_WORDS = frozenset({"bg", "background", "surface", "canvas", "page", "card", "sheet"})
_BORDER_WORDS = frozenset({"border", "divider", "separator", "outline", "stroke", "line", "ring"})
_PAGE_WORDS = frozenset({"bg", "background", "canvas", "page"})
# Text that is allowed to be faint, or whose background the name does not say.
_UNCHECKED_TEXT = frozenset({"disabled", "placeholder"})
_NOT_A_PLAIN_SURFACE = frozenset({"inverse", "overlay", "scrim", "backdrop"})
_MUST_BE_SEEN = frozenset({"focus", "ring", "emphasis", "strong", "control", "input"})
_STATES = frozenset({"hover", "hovered", "pressed", "active", "focus"})
_STATUSES = frozenset({"danger", "error", "warning", "success", "info"})
_TINTS = frozenset({"subtle", "soft", "bg", "background", "surface", "container"})
_TYPE_KINDS = ("font-size", "font-weight", "line-height", "letter-spacing", "font-family")
_TYPE_SUFFIX = re.compile(r"(?:[-_.]?(?:font|text))?[-_.]?(?:size|weight|line[-_]?height|leading|tracking"
                          r"|letter[-_]?spacing|family)$", re.I)
_COMPOSITE_STYLE = re.compile(r"TextStyle\(|\.system\(\s*size|Font\.custom\(|UIFont\b")


def named_text_styles(theme: Theme) -> List[str]:
    """Names under which the theme sets a size together with a weight, line height or family."""
    groups: Dict[str, Set[str]] = defaultdict(set)
    composite_styles = []
    for token in theme.tokens():
        if token.kind == "text-style" or _COMPOSITE_STYLE.search(token.value):
            composite_styles.append(token.name)
        elif token.kind in _TYPE_KINDS:
            stem = _TYPE_SUFFIX.sub("", token.name)
            if stem != token.name:
                groups[stem].add(token.kind)
    return composite_styles + [stem for stem, kinds in groups.items() if "font-size" in kinds and len(kinds) > 1]


def no_text_styles(context: Context) -> Optional[Lead]:
    theme = context.theme
    if named_text_styles(theme) or context.style_rules:
        return None
    sizes, weights, leadings = (len(scale(theme, kind)) for kind in ("font-size", "font-weight", "line-height"))
    if not sizes:
        return None
    return Lead("no-text-styles", "The theme has separate scales for size (%d), weight (%d) and line height (%d) "
                "but no named text styles, so any of the %d mixes is allowed and screens drift apart. Name the "
                "5-10 styles the app really uses (title, heading, body, label, caption...), each a fixed size, "
                "weight and line height." % (sizes, weights, leadings, sizes * max(weights, 1) * max(leadings, 1)))


def low_contrast(context: Context) -> Optional[Lead]:
    theme = context.theme
    items = []
    for scheme in [theme.primary] + theme.other_schemes():
        label = "" if len(theme.schemes) == 1 else "[%s] " % scheme
        roles = [token for token in theme.tokens("color", scheme) if theme.is_role(token)]
        surfaces = [token for token in roles if _job(token) == "surface"]
        plain = [token for token in surfaces if not set(words(token.name)) & _NOT_A_PLAIN_SURFACE]
        page = next((theme.color(token, scheme) for token in plain if set(words(token.name)) & _PAGE_WORDS), None)
        page = page or RGBA(1.0, 1.0, 1.0, 1.0)
        for token in roles:
            job, needed = _job(token), TEXT_CONTRAST
            if job == "border" and set(words(token.name)) & _MUST_BE_SEEN:
                backgrounds, needed = plain, CONTROL_CONTRAST
            elif job == "text":
                backgrounds = _backgrounds_for(token, roles, plain)
            else:
                continue
            color = theme.color(token, scheme)
            failing = []
            for background in backgrounds:
                under = theme.color(background, scheme)
                if color is None or under is None:
                    continue
                under = composite(under, page)
                ratio = contrast_ratio(composite(color, under), under)
                if ratio < needed:
                    # Rounded down, so a pair that just misses never prints as the number it needs.
                    failing.append("%s on %s" % (ratio_text(ratio), background.name))
            if failing:
                items.append("%s%s %s needs %.1f: %s" % (label, token.name, to_hex(color), needed, ", ".join(failing)))
    if not items:
        return None
    return Lead("low-contrast", "Pairs that fall short of WCAG AA, judged from names alone. Confirm on screen that "
                "the pair is really used together before changing a color.", tuple(items))


def scheme_gaps(context: Context) -> Optional[Lead]:
    theme = context.theme
    items = []
    for scheme in theme.other_schemes():
        roles = [token for token in theme.tokens("color", theme.primary) if theme.is_role(token)]
        same = [token.name for token in roles
                if theme.color(token, theme.primary) is not None
                and theme.color(token, theme.primary) == theme.color(theme.get(token.name, scheme) or token, scheme)]
        if same:
            items.append("%s: %d of %d color roles are the same as in %s: %s"
                         % (scheme, len(same), len(roles), theme.primary, ", ".join(same)))
    if not items:
        return None
    return Lead("scheme-gaps", "Color roles a second scheme does not change. Some are meant to stay (a brand "
                "color); the rest were forgotten and will look wrong there.", tuple(items))


def _job(token: Token) -> Optional[str]:
    """What a color role is for, from the last word in its name that says so."""
    for word in reversed(words(token.name)):
        if word in _TEXT_WORDS:
            return "text"
        if word in _SURFACE_WORDS:
            return "surface"
        if word in _BORDER_WORDS:
            return "border"
    return None


def _backgrounds_for(text: Token, roles: List[Token], plain: List[Token]) -> List[Token]:
    """The surfaces a text role is meant to sit on, as far as its name says."""
    parts = words(text.name)
    found = set(parts)
    if found & _UNCHECKED_TEXT:
        return []
    if "on" in parts:
        target = parts[parts.index("on") + 1:]
        return [role for role in roles if role is not text and _job(role) != "text"
                and _core(role) in (target, target[:-1] if target[-1:] and target[-1] in _STATES else None)]
    if "inverse" in found:
        return [role for role in roles if _job(role) == "surface" and "inverse" in words(role.name)]
    status = found & _STATUSES
    tints = [role for role in roles if role is not text and _job(role) != "text" and status
             and set(words(role.name)) & status and set(words(role.name)) & _TINTS]
    return plain + tints


def _core(role: Token) -> List[str]:
    """A role's name without the leading `color` and without a trailing state, for matching `on-<name>`."""
    parts = [word for word in words(role.name) if word not in ("color", "colors")]
    return parts[:-1] if parts and parts[-1] in _STATES else parts


STRUCTURE: Tuple[Check, ...] = (no_text_styles,)
LEGIBILITY: Tuple[Check, ...] = (scheme_gaps, low_contrast)
