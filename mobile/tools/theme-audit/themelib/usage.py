"""Count where an app names each token outside the theme files. Pure: text in, counts out.

Counts are leads. A token reached through destructuring or a generated utility class is undercounted, so check
a token in the code before calling it unused.
"""
from __future__ import annotations

import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Mapping, Tuple

from .theme import Theme

_CSS_NAME = re.compile(r"(var\(\s*)?(--[\w-]+|\$[\w-]+)(['\"`]?\s*[:,])?")
_CSS_FALLBACK = re.compile(r"var\(\s*(--[\w-]+)\s*,")
_CHAIN = re.compile(r"[A-Za-z_$][\w$]*(?:\.[\w$]+|\[['\"]?[\w-]+['\"]?\])*")
# A one-word name shorter than this is too common (`md`, `text`) to count by itself.
DISTINCTIVE_LEAF_CHARS = 5


@dataclass(frozen=True)
class Reach:
    files: int
    uses: Dict[str, int]               # token name -> places outside the theme that name it
    undefined: Dict[str, List[str]]    # custom property read with no fallback and defined nowhere -> files
    internal: Dict[str, int] = field(default_factory=dict)  # token name -> uses inside the theme files' own code


def measure(theme: Theme, sources: Iterable[Tuple[str, str]]) -> Reach:
    """`sources` yields (path, text) for every app file that is not a theme file."""
    css_uses: "Counter[str]" = Counter()
    read_in: Dict[str, List[str]] = defaultdict(list)
    defined_locally, optional = set(), set()
    grams: "Counter[str]" = Counter()
    files = 0
    for path, text in sources:
        files += 1
        for opener, name, definition in _CSS_NAME.findall(text):
            if definition and not opener:
                defined_locally.add(name)
                continue
            css_uses[name] += 1
            if opener and path not in read_in[name]:
                read_in[name].append(path)
        optional.update(_CSS_FALLBACK.findall(text))
        for chain in _CHAIN.findall(text):
            segments = re.sub(r"\[['\"]?([\w-]+)['\"]?\]", r".\1", chain).split(".")
            grams.update(segments)
            grams.update(first + "." + second for first, second in zip(segments, segments[1:]))
    names = theme.names()
    leaves = Counter(name.rsplit(".", 1)[-1] for name in names)
    uses = {}
    for name in names:
        if name.startswith(("--", "$")):
            uses[name] = css_uses[name]
            continue
        segments = name.split(".")
        count = grams[".".join(segments[-2:])] if len(segments) > 1 else grams[name]
        leaf = segments[-1]
        if leaves[leaf] == 1 and len(leaf) >= DISTINCTIVE_LEAF_CHARS:
            count = max(count, grams[leaf])
        uses[name] = count
    known = set(names) | defined_locally | optional
    undefined = {name: places for name, places in read_in.items() if name not in known}
    return Reach(files, uses, undefined)


def inside_theme(theme: Theme, theme_texts: Mapping[str, str], definitions: Iterable[Tuple[str, int]]) -> Dict[str, int]:
    """Where the theme files themselves use each token, leaving out the `(file, line)` places that define one
    (in every scheme). A theme built in code (a GDScript or Swift function that fills styleboxes, a stylesheet's
    own rules) uses its tokens there, and such a token is not unused even when no screen names it."""
    defined: Dict[str, set] = defaultdict(set)
    for path, line in definitions:
        defined[path].add(line)
    stripped = []
    for path, text in theme_texts.items():
        lines = text.split("\n")
        stripped.append((path, "\n".join("" if number in defined[path] else line
                                          for number, line in enumerate(lines, start=1))))
    return measure(theme, stripped).uses
