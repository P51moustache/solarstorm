"""Grade the difference between two style snapshots: what changed on screen and how noticeable each change is. Pure."""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Mapping, Optional, Tuple

from .cluster import TIERS, color_tier, numeric_tier

# What a computed property is called in the report, and the scale its changes are judged on.
_SPACING = ("padding-top", "padding-right", "padding-bottom", "padding-left", "margin-top", "margin-right",
            "margin-bottom", "margin-left", "row-gap", "column-gap")
NUMERIC_PROPS: Dict[str, str] = {**{prop: "spacing" for prop in _SPACING}, "border-top-left-radius": "radius",
                                 "font-size": "font-size", "font-weight": "font-weight", "line-height": "line-height",
                                 "border-top-width": "border-width", "letter-spacing": "letter-spacing"}
COLOR_PROPS: Dict[str, str] = {"color": "text color", "background-color": "background",
                               "border-top-color": "border color", "outline-color": "outline color"}
_PX = re.compile(r"^(-?\d*\.?\d+)(?:px)?$")
_SHADOW_COLOR = re.compile(r"(?:rgba?|hsla?|oklch|oklab|color)\([^()]*\)|#[0-9a-fA-F]{3,8}\b")
_NUMBER = re.compile(r"(\d+\.\d{3,})")
# A CSS-module class as Turbopack (`login-module__WEZH7G__card`) or webpack (`login_card__VIB1K`) writes it.
_MODULE_CLASS = re.compile(r"\.(?:[\w-]+-module__[\w-]+?__([\w-]+)|[A-Za-z0-9-]+_([A-Za-z0-9-]+)__[\w-]{5,8})(?![\w-])")
STUB_NOTE = "TODO"  # how an allow-list line written by --write-allow starts its note
_FONT_LOADER_CLASS = re.compile(r"\.(?:[\w-]+_)?__(?:variable|className)_[0-9a-f]{4,8}(?![\w-])")


@dataclass(frozen=True)
class Change:
    what: str    # `spacing`, `font-size`, `text color`, `shadow`... (padding and margin sides share `spacing`)
    before: str
    after: str
    tier: str

    @property
    def label(self) -> str:
        """The line a change is printed as, and the line that approves it in an allow-list."""
        return "%s %s -> %s" % (self.what, self.before, self.after)


@dataclass
class Comparison:
    captures: int = 0
    elements: int = 0
    unmatched: int = 0  # in one snapshot and not the other: the structure changed, so the styles can't be compared
    changes: "Counter[Change]" = field(default_factory=Counter)
    examples: Dict[Change, str] = field(default_factory=dict)
    heights: List[Tuple[str, int, int]] = field(default_factory=list)
    missing: List[str] = field(default_factory=list)

    def by_tier(self, tier: str, approved: Iterable[str] = ()) -> List[Tuple[Change, int]]:
        """Changes at `tier` that no line of `approved` covers. A line whose note starts with TODO approves nothing."""
        allowed = {_normal(line) for line in approved if not _is_stub(line)}
        return [(change, count) for change, count in self.changes.most_common()
                if change.tier == tier and _normal(change.label) not in allowed]


def grade(prop: str, before: str, after: str) -> Optional[Change]:
    """The change between two computed values of one property, or None when a person could not see any."""
    if before == after:
        return None
    if prop in COLOR_PROPS:
        return Change(COLOR_PROPS[prop], _tidy(before), _tidy(after), color_tier(before, after))
    if prop == "box-shadow":
        same_shape = _SHADOW_COLOR.sub("C", before) == _SHADOW_COLOR.sub("C", after)
        colors = _SHADOW_COLOR.findall(before), _SHADOW_COLOR.findall(after)
        tier = "visible"
        if same_shape and len(colors[0]) == len(colors[1]):
            tier = max((color_tier(one, two) for one, two in zip(*colors)), key=TIERS.index, default="invisible")
        return Change("shadow", _tidy(before), _tidy(after), tier)
    category = NUMERIC_PROPS.get(prop)
    one, two = _PX.match(before), _PX.match(after)
    if category and one and two:
        tier = numeric_tier(category, float(one.group(1)), float(two.group(1)))
        return Change(category, _tidy(before), _tidy(after), tier)
    return Change(category or prop, _tidy(before), _tidy(after), "visible")


def compare(captures: Iterable[Tuple[str, Mapping, Mapping]]) -> Comparison:
    """`captures` yields (name, before, after), each snapshot as style_snapshot.cjs wrote it."""
    result = Comparison()
    for name, before, after in captures:
        result.captures += 1
        old, new = _stable_keys(before["elements"]), _stable_keys(after["elements"])
        result.elements += len(old)
        result.unmatched += len(set(old) ^ set(new))
        # A snapshot from before the capture tool recorded `auto` margins holds their pixel result instead.
        mixed = bool(before["meta"].get("autoMargins")) != bool(after["meta"].get("autoMargins"))
        for key, props in old.items():
            for prop, value in props.items() if key in new else ():
                other = new[key].get(prop, value)
                if mixed and prop.startswith("margin-") and "auto" in (value, other):
                    continue
                change = grade(prop, value, other)
                if change:
                    result.changes[change] += 1
                    result.examples.setdefault(change, "%s: %s" % (name, key.rsplit(">", 2)[-1] if ">" in key else key))
        heights = before["meta"].get("pageHeight"), after["meta"].get("pageHeight")
        if heights[0] and heights[1] and heights[0] != heights[1]:
            result.heights.append((name, heights[0], heights[1]))
    result.heights.sort(key=lambda item: -abs(item[2] - item[1]) / item[1])
    return result


def _stable_keys(elements: Mapping) -> Dict[str, Mapping]:
    """Element keys with build hashes removed, so two bundlers (or two builds) still line up.

    CSS-module classes keep their local name. A font loader's class (`__variable_e2cc43` from next/font)
    is dropped: it names nothing, and it lands on `<html>`, where it would unmatch every element below.
    """
    def stable(key: str) -> str:
        key = _FONT_LOADER_CLASS.sub("", key)
        return _MODULE_CLASS.sub(lambda match: "." + (match.group(1) or match.group(2)), key)
    return {stable(key): styles for key, styles in elements.items()}


def _tidy(value: str) -> str:
    """Shorten long decimals so labels read well and match across runs."""
    return _NUMBER.sub(lambda match: ("%.2f" % float(match.group(1))).rstrip("0").rstrip("."), value.strip())


def _normal(line: str) -> str:
    return re.sub(r"\s+", " ", line.split("#!", 1)[0]).strip().lower()


def _is_stub(line: str) -> bool:
    return "#!" in line and line.split("#!", 1)[1].strip().upper().startswith(STUB_NOTE)


def stub_line(change: Change, count: int, example: str) -> str:
    """An allow-list line for a change nobody has explained yet; it approves nothing until the note is written."""
    return "%-52s #! %s x%d, e.g. %s: say which chosen change this is, or fix it" % (change.label, STUB_NOTE, count, example)
