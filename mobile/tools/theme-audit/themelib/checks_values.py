"""Checks on the values a theme holds: too many, the same twice, too close to tell apart, off the grid. Pure."""
from __future__ import annotations

import re
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

from .cluster import INVISIBLE_DELTA_E, SPACING_GRID_PX, same_step
from .colors import delta_e, hue_family, to_hex
from .health import BUDGETS, Check, Context, Lead, census, scale
from .rules import HAIRLINE_MAX_PX
from .theme import Token

_OFF_GRID_ALLOWED = (2.0, 6.0)
_STEP_SUFFIX = re.compile(r"[-_.]?\d+$")
# This many separately named families of one hue is more than a brand ramp plus a tinted neutral ramp.
MAX_FAMILIES_PER_HUE = 2
# Tinted neutrals named one by one (`bg`, `surface`, `border`, `textDim`) are the steps of one neutral ramp,
# whatever each is called: a dark palette of six blue-grey roles and an accent is two families, not seven.
_MUTED = "muted "
_LONE_NEUTRALS = "neutrals named one by one"
STEPPED_KINDS = ("spacing", "radius", "font-size", "line-height", "font-weight")


def over_budget(context: Context) -> Optional[Lead]:
    counts = census(context.theme)
    over = tuple("%s: %d (budget %d)" % (name, counts[name], limit) for name, limit in BUDGETS.items()
                 if counts.get(name, 0) > limit)
    if not over:
        return None
    return Lead("over-budget", "More tokens than one product usually needs. For each scale over budget, say what "
                "every extra step buys on screen; steps nobody can tell apart or use once should go.", over)


def duplicate_values(context: Context) -> Optional[Lead]:
    theme = context.theme
    groups: Dict[Tuple[str, str], List[str]] = defaultdict(list)
    for token in theme.tokens():
        if token.alias or token.kind == "other":
            continue
        color = theme.color(token)
        groups[(token.kind, to_hex(color) if color else theme.resolved(token).lower())].append(token.name)
    items = tuple("%s %s: %s" % (kind, value, ", ".join(names))
                  for (kind, value), names in groups.items() if len(names) > 1)
    if not items:
        return None
    return Lead("duplicate-values", "The same raw value is written under more than one name. One should point at "
                "the other, or one should go.", items)


def near_twin_colors(context: Context) -> Optional[Lead]:
    theme = context.theme
    literal = [(token, theme.color(token)) for token in theme.tokens("color") if not token.alias]
    literal = [(token, color) for token, color in literal if color is not None]
    items = []
    for index, (first, one) in enumerate(literal):
        for second, two in literal[index + 1:]:
            distance = delta_e(one, two)
            if 0 < distance <= INVISIBLE_DELTA_E:
                items.append("%s %s ~ %s %s" % (first.name, to_hex(one), second.name, to_hex(two)))
    if not items:
        return None
    return Lead("near-twin-colors", "Colors nobody could tell apart side by side. Keep one of each pair.",
                tuple(items))


def crowded_steps(context: Context) -> Optional[Lead]:
    theme = context.theme
    items = []
    for kind in STEPPED_KINDS:
        steps = sorted((px, token.name) for token in scale(theme, kind) for px in [theme.px(token)]
                       if px is not None and abs(px) > HAIRLINE_MAX_PX)
        for (low, low_name), (high, high_name) in zip(steps, steps[1:]):
            if low != high and same_step(kind, low, high):
                items.append("%s: %s (%g) and %s (%g)" % (kind, low_name, low, high_name, high))
    if not items:
        return None
    return Lead("crowded-steps", "Neighbouring steps too close to tell apart in use. A scale needs steps that "
                "look different, or people pick between them at random.", tuple(items))


def off_grid_spacing(context: Context) -> Optional[Lead]:
    theme = context.theme
    items = tuple("%s: %g" % (token.name, px) for token in theme.tokens("spacing") for px in [theme.px(token)]
                  if px is not None and abs(px) > HAIRLINE_MAX_PX and px % SPACING_GRID_PX
                  and abs(px) not in _OFF_GRID_ALLOWED)
    if not items:
        return None
    return Lead("off-grid-spacing", "Spacing steps off the 4pt grid (2 and 6 are the usual exceptions). Fine if "
                "the app's rhythm really is different; say so in the theme file.", items)


def hue_families(context: Context) -> Optional[Lead]:
    """Many separately named ramps of the same hue usually mean harvested values, not a designed palette."""
    theme = context.theme
    stems: Dict[str, List[Token]] = defaultdict(list)
    for token in theme.tokens("color"):
        if not token.alias and (theme.is_primitive(token) or not theme.layered):
            stems[_STEP_SUFFIX.sub("", token.name)].append(token)
    by_hue: Dict[str, List[str]] = defaultdict(list)
    lone_neutrals: Dict[str, List[str]] = defaultdict(list)
    for stem, tokens in stems.items():
        named = [hue_family(color) for color in map(theme.color, tokens) if color is not None]
        hues = [name.replace(_MUTED, "") for name in named]
        if not hues:
            continue
        hue = max(set(hues), key=hues.count)
        if len(tokens) == 1 and named[0].startswith(_MUTED):
            lone_neutrals[hue].append(stem)
        else:
            by_hue[hue].append("%s (%d)" % (stem, len(tokens)))
    for hue, names in lone_neutrals.items():
        by_hue[hue].append("%s (%d: %s)" % (_LONE_NEUTRALS, len(names), " ".join(names)))
    items = tuple("%s: %s" % (hue, ", ".join(families)) for hue, families in by_hue.items()
                  if hue != "grey" and len(families) > MAX_FAMILIES_PER_HUE)
    if not items:
        return None
    return Lead("hue-families", "Several separately named color families share one hue (steps in brackets). A "
                "palette is usually one ramp per hue plus a neutral ramp; extra families are values harvested "
                "from the old styles and given names.", items)


def unnamed_in_theme_code(context: Context) -> Optional[Lead]:
    if not context.unnamed:
        return None
    return Lead("unnamed-in-theme", "Raw values written in the theme's own code rather than named as tokens (a theme "
                "built in code fills styleboxes with literals). They are part of the palette and scales, but no token "
                "census or use count sees them: name each, or fold it onto a token it matches.", context.unnamed)


CHECKS: Tuple[Check, ...] = (hue_families, over_budget, duplicate_values, near_twin_colors, crowded_steps,
                             off_grid_spacing, unnamed_in_theme_code)
