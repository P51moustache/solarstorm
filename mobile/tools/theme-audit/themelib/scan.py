"""Find the raw styling values in one file's text. Pure: text in, findings out."""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Iterator, List, Optional, Tuple

from .colors import parse_color, to_hex
from .rules import (COLOR_JOBS, HAIRLINE_MAX_PX, HASH_COMMENT_EXTENSIONS, IGNORE_MARKER, REM_PX, RHYTHM_MAX_PX,
                    RULES_BY_EXTENSION, STYLESHEET_EXTENSIONS, Rule)


@dataclass(frozen=True)
class Finding:
    file: str
    line: int
    category: str
    value: str            # colors in canonical hex where readable; numbers as written (`13px`, `0.75rem`, `16`)
    px: Optional[float]   # the value in px where that is knowable, for scale analysis
    job: str              # colors only: text | background | border | shadow | shape | other
    advisory: bool        # context for the audit; not counted against the guardrail
    snippet: str


@dataclass(frozen=True)
class FileScan:
    findings: Tuple[Finding, ...]
    ignored: int  # lines opted out with the ignore marker


_BLOCK_COMMENT = re.compile(r"/\*.*?\*/|<!--.*?-->", re.S)
_LINE_COMMENT = re.compile(r"(?<![:\\'\"`])//[^\n]*")
_NO_LINE_COMMENTS = (".css", ".html", ".tscn", ".tres")
_PLAIN_VAR = re.compile(r"var\(\s*--[\w-]+\s*\)")
_CSS_NUMBER = re.compile(r"(?<![\w.#-])(-?\d*\.?\d+)(px|rem|em|pt|%)?(?![\w.%])")
_BARE_NUMBER = re.compile(r"(?<![\w.])(-?\d+(?:\.\d+)?)")
_LENGTH_UNITS = ("px", "rem", "em", "pt")
_WEIGHT_KEYWORD = re.compile(r"(?<![\w-])(bold|bolder|lighter)(?![\w-])", re.I)
_RESETS = frozenset({"none", "inherit", "initial", "unset", "normal", "0", "1em", "100%", "revert"})
_MAX_VALUE_CHARS = 70
_MAX_SNIPPET_CHARS = 160


def scan_text(path: str, text: str) -> FileScan:
    """Every raw styling value in one file. `path` only picks the rule set (by extension) and labels findings."""
    extension = PurePosixPath(path).suffix.lower()
    rules = RULES_BY_EXTENSION.get(extension, ())
    if not rules:
        return FileScan((), 0)
    kind = "stylesheet" if extension in STYLESHEET_EXTENSIONS else "code"
    rules = tuple(rule for rule in rules if rule.where in ("any", kind))
    raw_lines = text.splitlines()
    clean_lines = blank_comments(text, extension).splitlines()
    findings: List[Finding] = []
    seen = set()
    ignored = 0
    skip_next = False
    for number, (raw, line) in enumerate(zip(raw_lines, clean_lines), start=1):
        if IGNORE_MARKER in raw:
            ignored += 1
            skip_next = not line.strip()  # a marker on its own comment line covers the line below
            continue
        if skip_next:
            skip_next = False
            continue
        opens_block = line.rstrip().endswith("{")
        for rule in rules:
            if opens_block and rule.where == "stylesheet":
                continue  # `#fab {` is an id selector, not a color
            for match in rule.pattern.finditer(line):
                if rule.unless and rule.unless.search(line[:match.start(rule.group)]):
                    continue
                for value, px in _values(rule, match.group(rule.group)):
                    kept = _classify(rule, value, px, extension)
                    key = (number, kept and kept[0], value)
                    if kept is None or key in seen:
                        continue
                    seen.add(key)
                    job = _job(line, match.start(rule.group)) if rule.category == "color" else ""
                    findings.append(Finding(path, number, kept[0], value, px, job, kept[1],
                                            raw.strip()[:_MAX_SNIPPET_CHARS]))
    return FileScan(tuple(findings), ignored)


def blank_comments(text: str, extension: str) -> str:
    """Replace comments with spaces, keeping every line where it was."""
    spaces = lambda match: re.sub(r"[^\n]", " ", match.group(0))  # noqa: E731
    text = _BLOCK_COMMENT.sub(spaces, text)
    if extension in HASH_COMMENT_EXTENSIONS:
        return "\n".join(_cut_hash_comment(line) for line in text.split("\n"))
    if extension in _NO_LINE_COMMENTS:
        return text
    return _LINE_COMMENT.sub(spaces, text)


def _cut_hash_comment(line: str) -> str:
    quote = ""
    for index, char in enumerate(line):
        if quote:
            quote = "" if char == quote else quote
        elif char in "'\"":
            quote = char
        elif char == "#":
            return line[:index]
    return line


def _values(rule: Rule, text: str) -> Iterator[Tuple[str, Optional[float]]]:
    """Split one match into (value, px) pairs according to the rule's mode."""
    if rule.mode == "color":
        color = parse_color(text)
        yield (to_hex(color) if color else _tidy(text)), None
    elif rule.mode in ("lengths", "scalars"):
        found = False
        for match in _CSS_NUMBER.finditer(_PLAIN_VAR.sub(" ", text)):
            number, unit = float(match.group(1)), match.group(2) or ""
            if rule.mode == "lengths" and unit not in _LENGTH_UNITS:
                continue
            found = True
            yield _format(number) + unit, _to_px(number, unit)
        keyword = None if found else _WEIGHT_KEYWORD.search(_PLAIN_VAR.sub(" ", text))
        if keyword and rule.category == "font-weight":
            yield keyword.group(1).lower(), None
    elif rule.mode == "numbers":
        for match in _BARE_NUMBER.finditer(text):
            yield _format(float(match.group(1))), float(match.group(1))
    elif rule.mode == "number":
        try:
            yield _format(float(text)), float(text)
        except ValueError:
            yield text, None
    else:
        yield _tidy(text), None


def _classify(rule: Rule, value: str, px: Optional[float], extension: str) -> Optional[Tuple[str, bool]]:
    """(category, advisory) for a value worth reporting; None for resets, hairlines and token-only values."""
    category = rule.category
    if value.lower() in _RESETS and category != "font-weight":
        return None
    if category == "color":
        if value in ("#00000000", "#ffffff00") or (extension in (".gd", ".tscn", ".tres") and value == "#ffffff"):
            return None  # fully transparent, or Godot's default modulate
    elif category in ("spacing", "radius"):
        if px is not None and abs(px) <= HAIRLINE_MAX_PX:
            return None
        if category == "spacing" and px is not None and abs(px) > RHYTHM_MAX_PX:
            return "layout", True
    elif category == "line-height" and px in (0.0, 1.0):
        return None
    elif rule.mode == "text" and category in ("font-family", "shadow", "font-size"):
        if "var(" in value and not re.search(r"\d", _PLAIN_VAR.sub("", value)):
            return None  # points at a token
    return category, rule.advisory


def _job(line: str, literal_start: int) -> str:
    """What the color is for, read from the nearest property name before it on the line."""
    before = line[:literal_start]
    best, position = "other", -1
    for name, pattern in COLOR_JOBS:
        for match in pattern.finditer(before):
            if match.start() > position:
                best, position = name, match.start()
    return best


def _to_px(number: float, unit: str) -> Optional[float]:
    if unit in ("", "px", "pt"):
        return number
    return number * REM_PX if unit == "rem" else None


def _format(number: float) -> str:
    return ("%f" % number).rstrip("0").rstrip(".") if number % 1 else str(int(number))


def _tidy(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip().rstrip(",;")
    text = re.sub(r"\s*!important$", "", text)
    return text[:_MAX_VALUE_CHARS]
