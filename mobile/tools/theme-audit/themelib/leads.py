"""Signs that tokens alone are not keeping the app consistent: free-form type mixes and look-alike components.

Both are leads to check in the code, not findings: a regex can't tell a variant from a duplicate.
"""
from __future__ import annotations

import re
from collections import Counter
from pathlib import PurePosixPath
from typing import Dict, List, Optional, Tuple

from .rules import STYLESHEET_EXTENSIONS

TypeCombo = Tuple[str, str, str]  # font size, weight, line height as written; "-" where the block sets none

_INNER_BLOCK = re.compile(r"\{([^{}]*)\}")
_TEXT_STYLE_CALL = re.compile(r"\bTextStyle\(([^()]*)\)")
_SWIFT_FONT = re.compile(r"\.system\(\s*size:\s*([\d.]+)(?:\s*,\s*weight:\s*\.(\w+))?")
_SIZE = r"(?:font-size|fontSize)"
# The `font` shorthand: `600 15px/22px var(--font-text)`. Its size is the first length, or whatever precedes a `/`.
_FONT_SHORTHAND = re.compile(r"(?<![\w-])font\s*:\s*([^;{}\n]+)")
_SHORTHAND_PART = re.compile(r"(?:[^\s(),]|\([^()]*\))+")
_SHORTHAND_LENGTH = re.compile(r"^\d*\.?\d+(?:px|rem|em|pt|%)$")
_SHORTHAND_WEIGHT = re.compile(r"^(?:\d{3}|bold|bolder|lighter|var\(--[\w-]*weight[\w-]*\))$", re.I)
_WEIGHT = r"(?:font-weight|fontWeight)"
_LEADING = r"(?:line-height|lineHeight|height)"

MIN_REPEATED_DECLARATIONS = 4
_STYLE_PROPERTY = re.compile(r"(?<![\w-])(?:padding|margin|color|background|border|font|display|gap|radius|shadow)"
                             r"[\w-]*\s*:", re.I)

# The last word of a name is what the thing is: `primary-button` is a button, `button-row` is a row.
COMPONENT_KINDS: Dict[str, Tuple[str, ...]] = {
    "button": ("button", "btn"),
    "card": ("card", "panel", "tile"),
    "input": ("input", "field", "textfield", "select", "textarea"),
    "badge": ("badge", "chip", "tag", "pill"),
    "overlay": ("modal", "dialog", "sheet", "drawer", "popover", "tooltip"),
}
_KIND_BY_WORD = {word: kind for kind, words in COMPONENT_KINDS.items() for word in words}
_CLASS_SELECTOR = re.compile(r"\.(-?[_a-zA-Z][\w-]*)")
_CODE_DEFINITION = re.compile(r"\b(?:function|const|class|struct|fun)\s+([A-Z][a-z]\w*)")
_WORDS = re.compile(r"[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+")
_SUFFIXES_TO_SKIP = ("style", "styles", "view", "widget", "component", "props")


def type_combos(text: str, extension: str) -> "Counter[TypeCombo]":
    """Each size/weight/line-height mix a block of styles sets for itself, with how often."""
    combos: "Counter[TypeCombo]" = Counter()
    if extension == ".swift":
        for match in _SWIFT_FONT.finditer(text):
            combos[(match.group(1), match.group(2) or "-", "-")] += 1
        return combos
    bodies = _TEXT_STYLE_CALL.finditer(text) if extension in (".dart", ".kt") else _INNER_BLOCK.finditer(text)
    for body in bodies:
        size = _property(body.group(1), _SIZE)
        if size:
            leading = _LEADING if extension in (".dart", ".kt") else _LEADING.replace("|height", "")
            combos[(size, _property(body.group(1), _WEIGHT) or "-", _property(body.group(1), leading) or "-")] += 1
        elif extension in STYLESHEET_EXTENSIONS:
            combo = _font_shorthand(body.group(1))
            if combo:
                combos[combo] += 1
    return combos


def _font_shorthand(body: str) -> Optional[TypeCombo]:
    """The mix a `font:` shorthand sets, or None when it sets no size (`font: inherit`, `font: var(--style)`)."""
    match = _FONT_SHORTHAND.search(body)
    if not match:
        return None
    size = weight = leading = None
    for part in _SHORTHAND_PART.findall(match.group(1)):
        if size is not None:
            break  # everything after the size is the family
        if "/" in part:
            size, leading = part.split("/", 1)
        elif _SHORTHAND_LENGTH.match(part):
            size = part
        elif _SHORTHAND_WEIGHT.match(part):
            weight = part
    return (size, weight or "-", leading or "-") if size else None


def style_blocks(text: str) -> List[Tuple[str, int]]:
    """(signature, line) for each block of at least MIN_REPEATED_DECLARATIONS style declarations. Two blocks
    with the same signature are the same styling written twice: a shared component waiting to be extracted."""
    blocks = []
    for match in _INNER_BLOCK.finditer(text):
        body = match.group(1)
        if body.count(":") < MIN_REPEATED_DECLARATIONS or len(_STYLE_PROPERTY.findall(body)) < 2:
            continue
        parts = sorted({re.sub(r"\s+", " ", part).strip(" ,;").lower() for part in re.split(r"[;\n]", body)} - {""})
        blocks.append(("; ".join(parts), text.count("\n", 0, match.start()) + 1))
    return blocks


def component_names(path: str, text: str) -> List[Tuple[str, str]]:
    """(kind, name) for each class or type this file defines that looks like a button, card, input..."""
    extension = PurePosixPath(path).suffix.lower()
    if extension in STYLESHEET_EXTENSIONS:
        names = {re.split(r"--|__", name)[0] for line in text.splitlines() if line.rstrip().endswith(("{", ","))
                 for name in _CLASS_SELECTOR.findall(line)}
    else:
        names = set(_CODE_DEFINITION.findall(text))
    found = []
    for name in sorted(names):
        kind = _kind(name)
        if kind:
            found.append((kind, name))
    return found


def _kind(name: str) -> Optional[str]:
    words = [word.lower() for word in _WORDS.findall(name)]
    while words and words[-1] in _SUFFIXES_TO_SKIP:
        words.pop()
    return _KIND_BY_WORD.get(words[-1]) if words else None


def _property(body: str, name: str) -> Optional[str]:
    match = re.search(r"(?<![\w-])%s\s*[:=]\s*([^;,}\n]+)" % name, body)
    return re.sub(r"['\"\s]", "", match.group(1)) if match else None
