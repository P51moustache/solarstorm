"""Group raw values the way the eye does, and say how visible a change between two values is. Pure."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Mapping, Optional, Sequence, Tuple

from .colors import RGBA, delta_e, hue_family, parse_color

# OKLab distances. About 0.02 is one just-noticeable difference for colors side by side; under 0.05 a swap
# is only seen when comparing directly.
INVISIBLE_DELTA_E = 0.02
SUBTLE_DELTA_E = 0.05
# Neighbouring steps closer than this ratio can't be told apart in use (16 vs 18 px padding, 13 vs 14 px text).
CROWD_RATIO = 1.13
# Line height multiplies over every line of a paragraph, so smaller differences show.
_STEP_RATIO = {"line-height": 1.06}
# Font weights come in hundreds; anything between two of them renders as one or the other.
WEIGHT_STEP = 100
# A value carrying this share of a category's uses is a real step in the app today, whatever a default scale says.
HEAVY_SHARE = 0.04
HEAVY_MIN_USES = 5
SPACING_GRID_PX = 4.0
_OFF_GRID_ALLOWED = (2.0, 6.0)  # half steps a 4pt system keeps for tight inline gaps

TIERS = ("invisible", "subtle", "visible")


@dataclass(frozen=True)
class ColorCluster:
    """Colors nobody could tell apart, led by the most used one."""
    lead: str
    members: Tuple[Tuple[str, int], ...]
    uses: int
    family: str  # hue name, or "named" when the value is not a readable literal


@dataclass(frozen=True)
class NumberCluster:
    """Steps packed closer than the eye separates, led by the most used one."""
    lead: float
    members: Tuple[Tuple[float, int], ...]
    uses: int


def cluster_colors(counts: Mapping[str, int], threshold: float = INVISIBLE_DELTA_E) -> List[ColorCluster]:
    """Greedy grouping, most used first, so each cluster is led by the value the app already favours."""
    groups: List[Tuple[Optional[RGBA], List[Tuple[str, int]]]] = []
    for value, uses in sorted(counts.items(), key=lambda item: (-item[1], item[0])):
        color = parse_color(value)
        home = None
        if color is not None:
            home = next((group for group in groups if group[0] is not None and delta_e(group[0], color) <= threshold),
                        None)
        if home is None:
            groups.append((color, [(value, uses)]))
        else:
            home[1].append((value, uses))
    clusters = [ColorCluster(members[0][0], tuple(members), sum(uses for _, uses in members),
                             hue_family(color) if color else "named") for color, members in groups]
    return sorted(clusters, key=lambda cluster: -cluster.uses)


def cluster_numbers(category: str, counts: Mapping[float, int]) -> List[NumberCluster]:
    """Greedy grouping, most used first: each value joins the closest step it can't be told apart from."""
    groups: List[List[Tuple[float, int]]] = []
    for value, uses in sorted(counts.items(), key=lambda item: (-item[1], item[0])):
        near = [group for group in groups if same_step(category, group[0][0], value)]
        if near:
            min(near, key=lambda group: abs(group[0][0] - value)).append((value, uses))
        else:
            groups.append([(value, uses)])
    clusters = [NumberCluster(group[0][0], tuple(group), sum(uses for _, uses in group)) for group in groups]
    return sorted(clusters, key=lambda cluster: -cluster.uses)


def same_step(category: str, first: float, second: float) -> bool:
    """True when two values of this category read as the same step in use."""
    if category == "font-weight":
        return abs(first - second) < WEIGHT_STEP
    low, high = sorted((abs(first), abs(second)))
    if low == 0:
        return high == 0
    return high / low <= _STEP_RATIO.get(category, CROWD_RATIO)


def heavy_values(counts: Mapping[float, int]) -> List[Tuple[float, int]]:
    """Values used so much that they are part of the app's real scale."""
    total = sum(counts.values())
    floor = max(HEAVY_MIN_USES, total * HEAVY_SHARE)
    return sorted(((value, uses) for value, uses in counts.items() if uses >= floor), key=lambda item: -item[1])


def grid_share(counts: Mapping[float, int], grid: float = SPACING_GRID_PX) -> float:
    """Share of uses that sit on the spacing grid."""
    total = sum(counts.values())
    on_grid = sum(uses for value, uses in counts.items() if value % grid == 0 or value in _OFF_GRID_ALLOWED)
    return on_grid / total if total else 1.0


def nearest_step(value: float, steps: Sequence[float]) -> float:
    return min(steps, key=lambda step: (abs(step - value), step))


def color_tier(before: str, after: str) -> str:
    one, two = parse_color(before), parse_color(after)
    if one is None or two is None:
        return "invisible" if before == after else "visible"
    distance = delta_e(one, two)
    return "invisible" if distance <= INVISIBLE_DELTA_E else "subtle" if distance <= SUBTLE_DELTA_E else "visible"


# Per category: the largest change that is (invisible, subtle), as an absolute step and as a share of the value.
# A change counts as that tier when it is inside either limit. Font size has no subtle tier: any change reflows
# text and moves everything below it.
_NUMERIC_LIMITS: Dict[str, Tuple[Tuple[float, float], Tuple[float, float]]] = {
    "spacing": ((1.0, 0.0), (2.0, 0.10)),
    "radius": ((1.0, 0.0), (2.0, 0.15)),
    "font-size": ((0.25, 0.0), (0.25, 0.0)),
    "line-height": ((0.0, 0.02), (0.0, 0.07)),  # relative only, so px and unitless values judge alike
    "font-weight": ((0.0, 0.0), (50.0, 0.0)),
    "border-width": ((0.0, 0.0), (0.5, 0.0)),
    "letter-spacing": ((0.1, 0.0), (0.3, 0.0)),
}


def numeric_tier(category: str, before: float, after: float) -> str:
    """How noticeable it is to change `before` into `after` (px, or a unitless weight or line height)."""
    change = abs(after - before)
    if change == 0:
        return "invisible"
    invisible, subtle = _NUMERIC_LIMITS.get(category, _NUMERIC_LIMITS["spacing"])
    base = max(abs(before), 1e-9)
    for tier, (absolute, relative) in (("invisible", invisible), ("subtle", subtle)):
        if change <= absolute or change / base <= relative:
            return tier
    return "visible"
