"""What a theme-file check works from and reports: the context, a lead, and the token census with its budgets."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Tuple

from .theme import FULL_RADIUS_PX, Theme, Token
from .usage import Reach


@dataclass(frozen=True)
class Context:
    theme: Theme
    reach: Optional[Reach]  # None when no app folder was given: checks that need call sites are skipped
    style_rules: int        # rules in the theme files that set a font size together with a weight or line height
    unnamed: Tuple[str, ...] = ()  # raw values the theme files' own code writes outside any token (`file:line value`)


@dataclass(frozen=True)
class Lead:
    """Something to look at in the theme file. `items` name the tokens concerned."""
    check: str
    summary: str
    items: Tuple[str, ...] = ()


Check = Callable[[Context], Optional[Lead]]

# Roughly what one product needs before steps stop being told apart or the right choice stops being obvious.
# Going over is a question to answer (what does each extra one buy?), not a failure.
BUDGETS: Dict[str, int] = {
    "color roles": 32,   # text 4-5, surfaces 5-6, borders 3, accent 4-5, four statuses x 3, focus, overlay
    "spacing": 10,       # e.g. 2 4 8 12 16 24 32 48 64 and one spare
    "radius": 5,         # besides "full": small, controls, cards, sheets and one spare
    "font-size": 9,
    "font-weight": 4,
    "line-height": 4,
    "shadow": 4,
    "font-family": 3,
}
TEXT_STYLE_RANGE = (5, 10)
COUNTED_KINDS = ("spacing", "radius", "font-size", "font-weight", "line-height", "font-family", "shadow")


def scale(theme: Theme, kind: str) -> List[Token]:
    """The steps of one scale, leaving out a radius that only means "fully round"."""
    tokens = theme.tokens(kind)
    if kind == "radius":
        tokens = [token for token in tokens if (theme.px(token) or 0) < FULL_RADIUS_PX
                  and "%" not in theme.resolved(token)]
    return tokens


def census(theme: Theme) -> Dict[str, int]:
    """How many tokens of each sort the primary scheme has."""
    colors = theme.tokens("color")
    counts = {"color primitives": sum(theme.is_primitive(token) for token in colors),
              "color roles": sum(theme.is_role(token) for token in colors)}
    for kind in COUNTED_KINDS:
        counts[kind] = len(scale(theme, kind))
    return counts
