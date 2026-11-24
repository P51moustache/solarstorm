"""A theme as a whole: tokens by name and scheme, what each points at and resolves to, which layer it is in. Pure."""
from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, FrozenSet, List, Optional, Sequence, Tuple

from .colors import RGBA, parse_color
from .rules import REM_PX
from .tokens import BASE_SCHEME, Entry


@dataclass(frozen=True)
class Token:
    name: str
    value: str
    kind: str               # color | spacing | radius | font-size | font-weight | line-height | text-style | ...
    scheme: str
    refs: Tuple[str, ...]   # other tokens the value names
    alias: bool             # the value is nothing but one reference
    file: str
    line: int


# First match wins, read from the token's own name before the names of the groups it sits in.
_KIND_WORDS: Tuple[Tuple[str, FrozenSet[str]], ...] = (
    ("shadow", frozenset({"shadow", "shadows", "elevation"})),
    ("radius", frozenset({"radius", "radii", "corner", "rounded", "round"})),
    ("font-weight", frozenset({"weight", "weights", "fontweight"})),
    ("line-height", frozenset({"leading", "leadings", "lineheight"})),
    ("letter-spacing", frozenset({"tracking", "letterspacing", "kerning"})),
    ("spacing", frozenset({"space", "spacing", "gap", "gutter", "inset", "pad", "padding", "margin"})),
    ("motion", frozenset({"duration", "delay", "ease", "easing", "motion", "spring", "transition", "animation"})),
    ("z-index", frozenset({"z", "zindex", "layer"})),
    ("opacity", frozenset({"opacity", "alpha"})),
    ("breakpoint", frozenset({"breakpoint", "breakpoints", "screen", "screens"})),
    ("font-family", frozenset({"family", "typeface", "fontfamily"})),
)
_SIZE_WORDS = frozenset({"size", "fontsize", "text", "font", "type"})
# A leaf naming a side is an inset, whatever group it sits in: `tapSlop.text.top` grows a text button's touch area.
_EDGE_WORDS = frozenset({"top", "bottom", "left", "right", "start", "end", "horizontal", "vertical"})
# Words that name a step on a type scale. `size` with only these beside it (`--size-sm`, `--size-body`) is a
# text size; `size` beside the name of a thing (`--checkbox-size`, `--icon-size-lg`) is that thing's box.
_STEP_WORDS = frozenset({"xxs", "xs", "sm", "md", "lg", "xl", "xxl", "small", "medium", "large", "base",
                         "body", "caption", "title", "heading", "subheading", "display", "label", "lead",
                         "tiny", "huge", "default"})
_STEP_LIKE = re.compile(r"^\d*(?:xs|xl|x)?$")
# A named color the reader can't resolve (an asset-catalog color, a platform color) is still a color token.
_COLOR_WORDS = frozenset({"color", "colors", "colour", "colours", "palette"})
_NOT_A_COLOR = ("inset", "linear-gradient", "radial-gradient", "conic-gradient", "url(")
_CSS_REF = re.compile(r"var\(\s*(--[\w-]+)|(\$[\w-]+)")
_CSS_ALIAS = re.compile(r"^(?:var\(\s*--[\w-]+\s*\)|\$[\w-]+)$")
_CHAIN = re.compile(r"[A-Za-z_$][\w$]*(?:\.[\w$]+|\[['\"]?[\w-]+['\"]?\])*")
_LENGTH = re.compile(r"^(-?\d*\.?\d+)\.?(px|rem|pt|dp|sp)?$")
# A font shorthand sets weight, size and line height together, as literals (`600 1rem/1.5 Inter`) or built
# from other tokens (`var(--weight-bold) var(--text-lg)/var(--leading-tight) var(--font-sans)`).
_REF = r"(?:var\([^()]*\)|\$[\w-]+)"
# A line height written as a ratio that lands on a grid, e.g. calc(44 / 36).
_CALC = r"calc\([^()]*\)"
_FONT_SHORTHAND = re.compile(r"^(?:(?:italic|oblique)\s+)?(?:(?:\d{3}|bold|normal|%s)\s+)?"
                             r"(?:[\d.]+(?:px|rem|em|pt)|%s)\s*/\s*(?:[\d.]+|%s|%s)" % (_REF, _REF, _REF, _CALC))
# A radius this large means "fully round", whatever the box size.
FULL_RADIUS_PX = 999.0


def words(name: str) -> List[str]:
    """`--color-textMuted` -> [color, text, muted]."""
    return [word.lower() for word in re.findall(r"[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+", name)]


def word_set(name: str) -> FrozenSet[str]:
    """The name's words plus each neighbouring pair joined, so `lineHeight` and `line-height` both give `lineheight`."""
    parts = words(name)
    return frozenset(parts) | frozenset(first + second for first, second in zip(parts, parts[1:]))


def is_color_literal(value: str) -> bool:
    start = value[:1]
    return (not (start.isdigit() or start in "-.") and not value.startswith(_NOT_A_COLOR)
            and parse_color(value) is not None)


def is_text_style(value: str) -> bool:
    """True for a value that fixes size and line height together: a named text style, not a scale step."""
    return bool(_FONT_SHORTHAND.match(value.strip()))


def kind_of(name: str, value: str) -> str:
    """What a token holds, from its value where that is plain and from its name otherwise."""
    if is_color_literal(value):
        return "color"
    if is_text_style(value):
        return "text-style"
    leaf = name.rsplit(".", 1)[-1]
    numeric = bool(re.search(r"\d", value))
    for scope in (leaf, name):
        found = word_set(scope)
        for kind, names in _KIND_WORDS:
            if found & names:
                return kind
        if found & _SIZE_WORDS:
            if leaf.lower() in _EDGE_WORDS:
                return "spacing" if numeric else "other"
            if found & _SIZE_WORDS == {"size"} and _names_a_thing(words(scope)):
                return "other"
            return "font-size" if numeric else "font-family" if "font" in found or "type" in found else "other"
    return "color" if word_set(name) & _COLOR_WORDS and not numeric else "other"


def _names_a_thing(parts: Sequence[str]) -> bool:
    """True when a `size` token also names an object (checkbox, icon, avatar): a box's size, not text."""
    return any(part != "size" and part not in _STEP_WORDS and not _STEP_LIKE.match(part) for part in parts)


class Theme:
    """Tokens from one or more theme files. The primary scheme is the one the app shows by default."""

    def __init__(self, entries: Sequence[Entry]):
        self._by_name: Dict[str, Dict[str, Token]] = defaultdict(dict)
        names = {entry.name for entry in entries}
        tails = _tail_index(names)
        drafts = []
        for entry in entries:
            refs, alias = _references(entry, names, tails)
            drafts.append((entry, refs, alias))
        plain = {entry.name: kind_of(entry.name, entry.value) for entry, _, alias in drafts if not alias}
        for entry, refs, alias in drafts:
            kind = plain.get(entry.name) or self._alias_kind(entry.name, refs, plain, {e.name: r for e, r, _ in drafts})
            self._by_name[entry.name][entry.scheme] = Token(entry.name, entry.value, kind, entry.scheme, refs, alias,
                                                            entry.file, entry.line)
        schemes = {scheme for by_scheme in self._by_name.values() for scheme in by_scheme}
        self.schemes: List[str] = sorted(schemes, key=lambda scheme: (scheme != BASE_SCHEME, scheme != "light", scheme))
        named = [scheme for scheme in self.schemes if scheme != BASE_SCHEME]
        self.primary: str = "light" if "light" in named else BASE_SCHEME if BASE_SCHEME in schemes or not named \
            else named[0]
        self._referrers: Dict[str, int] = defaultdict(int)
        for by_scheme in self._by_name.values():
            for ref in {ref for token in by_scheme.values() for ref in token.refs}:
                self._referrers[ref] += 1

    @staticmethod
    def _alias_kind(name: str, refs: Tuple[str, ...], plain: Dict[str, str], all_refs: Dict[str, Tuple[str, ...]]) -> str:
        seen = {name}
        while refs and refs[0] not in seen:
            target = refs[0]
            if target in plain:
                return plain[target]
            seen.add(target)
            refs = all_refs.get(target, ())
        return kind_of(name, "")

    def tokens(self, kind: Optional[str] = None, scheme: Optional[str] = None) -> List[Token]:
        """Tokens as one scheme sees them (its own values, falling back to the base), in file order."""
        scheme = scheme or self.primary
        found = [self.get(name, scheme) for name in self._by_name]
        return sorted((token for token in found if token and (kind is None or token.kind == kind)),
                      key=lambda token: (token.file, token.line))

    def get(self, name: str, scheme: Optional[str] = None) -> Optional[Token]:
        by_scheme = self._by_name.get(name)
        if not by_scheme:
            return None
        return by_scheme.get(scheme or self.primary) or by_scheme.get(BASE_SCHEME) or by_scheme.get(self.primary)

    def other_schemes(self) -> List[str]:
        return [scheme for scheme in self.schemes if scheme not in (BASE_SCHEME, self.primary)]

    def overrides(self, name: str, scheme: str) -> bool:
        return scheme in self._by_name.get(name, {})

    def names(self) -> List[str]:
        return list(self._by_name)

    def referrers(self, name: str) -> int:
        """How many other tokens point at this one."""
        return self._referrers.get(name, 0)

    def resolved(self, token: Token, scheme: Optional[str] = None) -> str:
        """The value with every reference followed to its literal, as `scheme` sees it."""
        return self._resolve(token, scheme or token.scheme, frozenset())

    def _resolve(self, token: Token, scheme: str, seen: FrozenSet[str]) -> str:
        value = token.value
        for ref in token.refs:
            target = self.get(ref, scheme)
            if target is None or ref in seen:
                continue
            literal = self._resolve(target, scheme, seen | {token.name})
            if token.alias:
                return literal
            value = re.sub(r"var\(\s*%s\s*(?:,[^()]*)?\)|%s(?![\w-])" % (re.escape(ref), re.escape(ref)),
                           lambda _match: literal, value)
        return value

    def color(self, token: Token, scheme: Optional[str] = None) -> Optional[RGBA]:
        value = self.resolved(token, scheme)
        return parse_color(value) if is_color_literal(value) else None

    def px(self, token: Token) -> Optional[float]:
        """The value as a number of px (or as written when unitless); None for fluid or relative values."""
        found = _LENGTH.match(self.resolved(token).strip())
        if not found:
            return None
        return float(found.group(1)) * (REM_PX if found.group(2) == "rem" else 1.0)

    @property
    def layered(self) -> bool:
        """True when some colors point at other colors: the theme separates raw values from what they are for."""
        return any(token.alias for token in self.tokens("color"))

    def is_primitive(self, token: Token) -> bool:
        return not token.alias and self.referrers(token.name) > 0

    def is_role(self, token: Token) -> bool:
        """A name call sites are meant to use: it points at a primitive, or nothing points at it."""
        return token.alias or self.referrers(token.name) == 0


def _tail_index(names) -> Dict[str, List[str]]:
    tails: Dict[str, List[str]] = defaultdict(list)
    for name in names:
        segments = name.split(".")
        for start in range(len(segments)):
            tails[".".join(segments[start:])].append(name)
    return tails


def _references(entry: Entry, names, tails: Dict[str, List[str]]) -> Tuple[Tuple[str, ...], bool]:
    if entry.name.startswith(("--", "$")):
        refs = tuple(dict.fromkeys(first or second for first, second in _CSS_REF.findall(entry.value)))
        return tuple(ref for ref in refs if ref != entry.name), bool(_CSS_ALIAS.match(entry.value.strip()))
    refs, whole = [], False
    for chain in _CHAIN.finditer(entry.value):
        segments = re.sub(r"\[['\"]?([\w-]+)['\"]?\]", r".\1", chain.group()).split(".")
        target = _match_chain(segments, tails)
        if target and target != entry.name and target not in refs:
            refs.append(target)
            whole = whole or chain.group() == entry.value.strip()
    return tuple(refs), whole and len(refs) == 1


def _match_chain(segments: List[str], tails: Dict[str, List[str]]) -> Optional[str]:
    """The one token a dotted reference names: the longest tail of the reference that is the tail of exactly one."""
    for start in range(len(segments)):
        found = tails.get(".".join(segments[start:]), [])
        if len(found) == 1:
            return found[0]
        if found:
            return None  # several tokens end this way and nothing longer told them apart
    return None
