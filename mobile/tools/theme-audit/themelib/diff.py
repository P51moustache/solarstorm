"""Which lines a change touched, read from `git diff -U0`, so a release check lists what the release wrote
rather than everything in the files it happened to edit."""
from __future__ import annotations

import re
from typing import Dict, FrozenSet, Iterable, Mapping, Optional, Union

# `@@ -12,3 +14,5 @@`: the change wrote lines 14-18 of the file as it is now. A count of 0 is a deletion that
# sits after line 14, so the lines on either side of the gap are the ones it touched.
_HUNK = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@")
_ESCAPES = {"n": "\n", "t": "\t", '"': '"', "\\": "\\"}

ChangedLines = Dict[str, Optional[FrozenSet[int]]]
Scope = Union[Mapping[str, Optional[FrozenSet[int]]], Iterable[str]]


def changed_lines(diff: str) -> ChangedLines:
    """Each file the diff writes to, mapped to the lines of its new text the change wrote or sits beside, or
    None when the whole file is new. Deleted files are left out: nothing in them can be scanned.

    `---` and `+++` are read only in a file's header (before its first hunk): inside a hunk the same marks
    start removed and added lines, such as a deleted SQL comment `-- note`."""
    found: ChangedLines = {}
    path, new_file, lines, in_header = None, False, set(), False

    def close() -> None:
        if path is not None:
            found[path] = None if new_file else frozenset(lines)

    for line in diff.splitlines():
        if line.startswith("diff --git "):
            close()
            path, new_file, lines, in_header = None, False, set(), True
        elif in_header and line.startswith("--- "):
            new_file = line[4:].rstrip("\t") == "/dev/null"
        elif in_header and line.startswith("+++ "):
            target = _unquote(line[4:].rstrip("\t"))
            path = target[2:] if target.startswith("b/") else None
        elif line.startswith("@@"):
            in_header = False
            hunk = _HUNK.match(line)
            if hunk:
                start, count = int(hunk.group(1)), int(hunk.group(2) or 1)
                lines.update(range(start, start + count) if count else (max(start, 1), start + 1))
    close()
    return found


def as_lines(scope: Scope) -> Mapping[str, Optional[FrozenSet[int]]]:
    """A scope given as a plain list of paths counts every line of each file as changed."""
    return scope if isinstance(scope, Mapping) else dict.fromkeys(scope)


def touches(scope: Mapping[str, Optional[FrozenSet[int]]], path: str, first: int, last: Optional[int] = None) -> bool:
    """Did the change write any of lines first..last of `path`?"""
    if path not in scope:
        return False
    lines = scope[path]
    return lines is None or any(number in lines for number in range(first, (last or first) + 1))


def _unquote(name: str) -> str:
    """Git quotes a path holding a quote, a backslash or a control character: `"b/q\\"uote.ts"`."""
    if len(name) < 2 or not (name.startswith('"') and name.endswith('"')):
        return name
    return re.sub(r"\\(.)", lambda match: _ESCAPES.get(match.group(1), match.group(1)), name[1:-1])
