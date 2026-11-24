"""Checks on what tokens are called and who uses them: names that describe a look, layers skipped, dead names."""
from __future__ import annotations

import re
from collections import Counter
from typing import List, Optional, Set, Tuple

from .cluster import SUBTLE_DELTA_E
from .colors import delta_e, to_hex
from .health import Check, Context, Lead
from .theme import Token, words

# Words that say what a color looks like. A role is named for the job it does, so that the look can change.
HUE_WORDS = frozenset({
    "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet",
    "purple", "fuchsia", "pink", "rose", "brown", "grey", "gray", "black", "white", "navy", "olive", "mint", "gold",
    "silver", "cream", "ivory", "sand", "charcoal", "slate", "coral", "sage", "forest", "moss",
})
# Family names that already say a job, so a role may share them with its primitives.
_JOB_STEMS = frozenset({"color", "colors", "palette", "brand", "neutral", "primary", "secondary", "tertiary",
                        "accent", "base", "success", "warning", "danger", "error", "info"})
_STEP = re.compile(r"\d+$")


def appearance_named_roles(context: Context) -> Optional[Lead]:
    theme = context.theme
    look_words = set(HUE_WORDS) | _primitive_family_words(context)
    items = []
    for token in theme.tokens("color"):
        if not theme.is_role(token) or _is_second_name(context, token):
            continue
        found = [word for word in words(token.name) if word in look_words]
        if found:
            items.append("%s (%s)%s" % (token.name, ", ".join(found), _uses(context, token)))
    if not items:
        return None
    return Lead("appearance-named-roles", "Names that call sites use describe a look, not a job. When the palette "
                "changes the name becomes false, so nobody dares change it. Rename for what the color is for "
                "(surface, text, border, accent, a status) and how strong it is.", tuple(items))


def primitives_at_call_sites(context: Context) -> Optional[Lead]:
    if context.reach is None or not context.theme.layered:
        return None
    theme = context.theme
    items = tuple("%s: %d places" % (token.name, context.reach.uses[token.name]) for token in theme.tokens("color")
                  if theme.is_primitive(token) and context.reach.uses.get(token.name, 0))
    if not items:
        return None
    return Lead("primitives-at-call-sites", "Call sites name raw palette colors directly, skipping the roles. Those "
                "places won't follow a second theme. Give each a role.", items)


def raw_roles(context: Context) -> Optional[Lead]:
    theme = context.theme
    if not theme.layered:
        return None
    primitives = [(token, theme.color(token)) for token in theme.tokens("color") if theme.is_primitive(token)]
    items = []
    for token in theme.tokens("color"):
        color = theme.color(token)
        if token.alias or theme.is_primitive(token) or color is None:
            continue
        near = min(((delta_e(color, other), primitive.name) for primitive, other in primitives if other is not None),
                   default=(1.0, ""))
        note = ("almost %s: point at it" % near[1] if near[0] <= SUBTLE_DELTA_E
                else "translucent: derive it from a primitive" if color.a < 1 else "a color the palette does not have")
        items.append("%s: %s (%s)" % (token.name, to_hex(color), note))
    if not items:
        return None
    return Lead("raw-values-in-roles", "Roles that hold a raw color instead of pointing at the palette. Each is a "
                "color that a palette change will miss.", tuple(items))


def second_names(context: Context) -> Optional[Lead]:
    theme = context.theme
    items = []
    for token in theme.tokens():
        if _is_second_name(context, token):
            items.append("%s -> %s%s" % (token.name, token.refs[0], _uses(context, token)))
    if not items:
        return None
    return Lead("second-names", "Tokens that are only another name for a role. Component tokens (a button's own "
                "background) are fine; old names kept alive double the vocabulary, so finish the rename.",
                tuple(items))


def unused(context: Context) -> Optional[Lead]:
    if context.reach is None:
        return None
    theme = context.theme
    dead = [token for token in theme.tokens() if token.kind != "other" and not theme.referrers(token.name)
            and not context.reach.uses.get(token.name, 0) and not context.reach.internal.get(token.name, 0)]
    if not dead:
        return None
    by_kind = Counter(token.kind for token in dead)
    return Lead("unused", "Tokens nothing uses (%s). Check each in the code, then delete: an unused step is a "
                "choice someone has to rule out every time."
                % ", ".join("%s %d" % pair for pair in by_kind.most_common()), tuple(token.name for token in dead))


def single_use_roles(context: Context) -> Optional[Lead]:
    if context.reach is None:
        return None
    theme = context.theme
    items = tuple(token.name for token in theme.tokens("color") if theme.is_role(token)
                  and context.reach.uses.get(token.name, 0) == 1 and not theme.referrers(token.name))
    if not items:
        return None
    return Lead("single-use-roles", "Color roles used in exactly one place. A role earns its name by being a "
                "decision several places share; most of these are one-offs that an existing role could cover.", items)


def undefined(context: Context) -> Optional[Lead]:
    if context.reach is None or not context.reach.undefined:
        return None
    items = tuple("%s (%s)" % (name, ", ".join(places[:3])) for name, places in sorted(context.reach.undefined.items()))
    return Lead("undefined", "Custom properties that are read but defined nowhere. The browser drops the whole "
                "declaration without an error, so the style silently goes missing.", items)


def _is_second_name(context: Context, token: Token) -> bool:
    target = context.theme.get(token.refs[0]) if token.alias and token.refs else None
    return target is not None and target.alias


def _primitive_family_words(context: Context) -> Set[str]:
    theme = context.theme
    found: Set[str] = set()
    if not theme.layered:
        return found
    for token in theme.tokens("color"):
        if theme.is_primitive(token):
            found.update(word for word in words(_STEP.sub("", token.name)) if not word.isdigit())
    return found - _JOB_STEMS


def _uses(context: Context, token: Token) -> str:
    return "" if context.reach is None else ", %d places" % context.reach.uses.get(token.name, 0)


CHECKS: Tuple[Check, ...] = (appearance_named_roles, primitives_at_call_sites, raw_roles, second_names, unused,
                             single_use_roles, undefined)
