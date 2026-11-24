"""Read a theme file into entries: each name, the value written for it, and the scheme it applies to. Pure."""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Iterator, List, Optional, Sequence, Tuple

from .rules import STYLESHEET_EXTENSIONS
from .scan import blank_comments

BASE_SCHEME = "base"


@dataclass(frozen=True)
class Entry:
    name: str    # `--color-text`, `$space-md`, or a dotted path such as `colors.text.primary`
    value: str   # as written, without quotes or the closing comma
    scheme: str  # BASE_SCHEME, or the scheme an override block or container names (`dark`, `light`...)
    file: str
    line: int


def read_entries(path: str, text: str) -> List[Entry]:
    """Every name-and-value pair a theme file defines. `path` picks the reader and labels the entries."""
    extension = PurePosixPath(path).suffix.lower()
    clean = blank_comments(text, extension)
    if extension in STYLESHEET_EXTENSIONS:
        return list(_read_css(path, clean))
    if extension == ".gd":
        clean = _gdscript_declarations(clean)
    entries = list(_read_code(path, clean, slashes_nest=extension in (".tres", ".tscn")))
    return _without_lookup_tables(entries, clean) if extension in _JS_MODULES else entries


_JS_MODULES = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs")
_EXPORTS = re.compile(r"^\s*export\b", re.M)
_TOP_DECLARATION = re.compile(r"^(export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)", re.M)
_REFERENCE = re.compile(r"^[A-Za-z_$][\w$]*(?:\.[\w$]+)+$")


def _without_lookup_tables(entries: List[Entry], text: str) -> List[Entry]:
    """Drop a module's private lookup tables: a top-level object the file does not export whose every value names
    another token (`const TONE_COLORS = { good: colors.good }`, read by `toneColor(tone)`). Call sites cannot name
    it, so it is not a token layer: counted, it made every color it points at look like a palette primitive and
    each of its keys look unused. A private object of raw values (a palette the exported roles point at) stays."""
    if not _EXPORTS.search(text):
        return entries  # a script, not a module: nothing is exported, so nothing is private
    private = {name for exported, name in _TOP_DECLARATION.findall(text) if not exported}
    groups = {}
    for entry in entries:
        head = entry.name.split(".", 1)[0]
        if head in private:
            groups.setdefault(head, []).append(entry)
    tables = {head for head, members in groups.items() if all(_REFERENCE.match(m.value) for m in members)}
    return [entry for entry in entries if entry.name.split(".", 1)[0] not in tables]


_GD_FUNC = re.compile(r"^(?P<indent>\s*)(?:static\s+)?func\s")


def _gdscript_declarations(text: str) -> str:
    """Blank every function, keeping line numbers. A GDScript theme declares its tokens as top-level `const`s;
    a `var` inside a function (an icon built from an SVG string, a stylebox being filled) is working state,
    not a token, and a theme built in code is mostly such functions."""
    kept, body_indent = [], -1
    for line in text.split("\n"):
        indent = len(line) - len(line.lstrip())
        if body_indent >= 0 and (not line.strip() or indent > body_indent):
            kept.append("")
            continue
        body_indent = -1
        found = _GD_FUNC.match(line)
        if found:
            body_indent = len(found.group("indent"))
            kept.append("")
            continue
        kept.append(line)
    return "\n".join(kept)


# ---- Stylesheets: custom properties and Sass variables, inside any nesting of blocks --------------------------

_CSS_DELIMITER = re.compile(r"[{};]")
_CSS_DECLARATION = re.compile(r"^\s*(--[\w-]+|\$[\w-]+)\s*:\s*(.+?)\s*$", re.S)
_SCHEME_IN_HEADER = (
    re.compile(r"prefers-color-scheme\s*:\s*(\w+)"),
    re.compile(r"data-(?:theme|mode|color-scheme)\s*=\s*[\"']?([\w-]+)"),
    re.compile(r"\.(?:theme-)?(dark|light)(?:-mode|-theme)?(?![\w-])"),
)


def _read_css(path: str, text: str) -> Iterator[Entry]:
    headers: List[str] = []
    start = 0
    for delimiter in _CSS_DELIMITER.finditer(text):
        chunk = text[start:delimiter.start()]
        if delimiter.group() == "{":
            headers.append(chunk)
        else:
            declaration = _CSS_DECLARATION.match(chunk)
            if declaration:
                line = text.count("\n", 0, start + len(chunk) - len(chunk.lstrip())) + 1
                value = re.sub(r"\s+", " ", declaration.group(2)).replace(" !default", "")
                yield Entry(declaration.group(1), value, _css_scheme(headers), path, line)
            if delimiter.group() == "}" and headers:
                headers.pop()
        start = delimiter.end()


def _css_scheme(headers: Sequence[str]) -> str:
    for header in reversed(headers):
        for pattern in _SCHEME_IN_HEADER:
            found = pattern.search(header)
            if found:
                return found.group(1).lower()
    return BASE_SCHEME


# ---- Code: nested object literals and flat constants, one entry per line or inline `{ a: 1, b: 2 }` ----------

_MODIFIERS = (r"(?:(?:export|default|public|private|internal|fileprivate|static|final|const|let|var|val|late"
              r"|readonly|declare|override|@\w+)\s+)*")
_TYPE_FIRST = r"(?:(?:double|int|float|num|Color|String|TextStyle|FontWeight|Duration|EdgeInsets)\s+)?"  # Dart
_NAME = r"(?P<name>[A-Za-z_$][\w$]*|'[^']+'|\"[^\"]+\"|\d+)"
_ANNOTATION = r"(?:\s*:\s*[A-Za-z][\w.<>\[\]?]*)?"  # `name: Type =` in Swift, TypeScript and GDScript
_ASSIGNMENT = re.compile(r"^\s*%s%s%s(?:%s\s*(?::=|=(?!=|>))|\s*:(?!=))\s*(?P<value>.*?)\s*$"
                         % (_MODIFIERS, _TYPE_FIRST, _NAME, _ANNOTATION))
_TYPE_BLOCK = re.compile(r"^\s*%s(?:abstract\s+|data\s+|sealed\s+)?(?:class|struct|enum|extension|object|namespace)"
                         r"\s+(?P<name>\w+)" % _MODIFIERS)
_STRING = re.compile(r"'[^'\n]*'|\"[^\"\n]*\"|`[^`\n]*`")
_TYPE_WORDS = frozenset({"number", "string", "boolean", "any", "unknown", "void", "null", "undefined", "true",
                         "false", "Color", "CGFloat", "Double", "Int", "Float", "String", "Font"})
_SCHEME_SEGMENT = re.compile(r"^(?:(dark|light)(theme|colors|palette|mode|scheme)?|(theme|colors|palette)(dark|light))$",
                             re.I)
_OPENERS, _CLOSERS = "{[(", "}])"


def _read_code(path: str, text: str, slashes_nest: bool) -> Iterator[Entry]:
    containers: List[Tuple[str, int]] = []  # (name, bracket depth of the line that opened it)
    depth = 0
    for number, line in enumerate(text.splitlines(), start=1):
        if slashes_nest:
            line = re.sub(r"^(\s*)([\w/]+)(\s*=)", lambda m: m.group(1) + m.group(2).replace("/", "__") + m.group(3),
                          line)
        bare = _STRING.sub("''", line)
        balance = sum(bare.count(char) for char in _OPENERS) - sum(bare.count(char) for char in _CLOSERS)
        block = _TYPE_BLOCK.match(line)
        assignment = None if block else _ASSIGNMENT.match(line)
        name = _unquote((block or assignment).group("name")) if (block or assignment) else ""
        if balance > 0:
            containers.append((name, depth))
        elif assignment:
            path_names = [container for container, _ in containers if container] + name.split("__")
            yield from _leaves(path_names, assignment.group("value"), path, number)
        depth += balance
        while containers and depth <= containers[-1][1]:
            containers.pop()


def _leaves(names: List[str], value: str, file: str, line: int) -> Iterator[Entry]:
    """One entry for a plain value; one per member for an inline object."""
    value = re.sub(r"\s+as\s+const\b", "", value).rstrip(",; ")
    if value.startswith("{") and value.endswith("}"):
        for part in _split_top_level(value[1:-1]):
            member = re.match(r"^\s*([A-Za-z_$][\w$]*|'[^']+'|\"[^\"]+\"|\d+)\s*:\s*(.+?)\s*$", part)
            if member:
                yield from _leaves(names + [_unquote(member.group(1))], member.group(2), file, line)
        return
    value = _unquote(value)
    if not value or value in _TYPE_WORDS or value.endswith(("=>", "{")) or value.startswith(("function", "(")):
        return
    scheme, kept = BASE_SCHEME, []
    for segment in names:
        found = _SCHEME_SEGMENT.match(segment)
        if found:
            scheme = (found.group(1) or found.group(4)).lower()
            rest = found.group(2) or found.group(3)
            kept.extend([rest.lower()] if rest and rest.lower() not in ("mode", "scheme") else [])
        else:
            kept.append(segment)
    if kept:
        yield Entry(".".join(kept), value, scheme, file, line)


def _split_top_level(text: str) -> List[str]:
    """Split on commas that are not inside brackets or quotes."""
    parts, depth, quote, start = [], 0, "", 0
    for index, char in enumerate(text):
        if quote:
            quote = "" if char == quote else quote
        elif char in "'\"`":
            quote = char
        elif char in _OPENERS:
            depth += 1
        elif char in _CLOSERS:
            depth -= 1
        elif char == "," and depth == 0:
            parts.append(text[start:index])
            start = index + 1
    parts.append(text[start:])
    return [part for part in parts if part.strip()]


def _unquote(text: str) -> str:
    text = text.strip()
    return text[1:-1] if len(text) >= 2 and text[0] == text[-1] and text[0] in "'\"`" else text
