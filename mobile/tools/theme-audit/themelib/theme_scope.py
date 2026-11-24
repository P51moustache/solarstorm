"""The part of a theme check that a release wrote: the tokens defined on theme lines changed since a commit, and
the lead items that name them. The census and the leads stay whole-app; this says which of them the release
is answerable for, so a release that added two tokens does not have to judge forty old leads by eye. Pure."""
from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Mapping, Sequence

from .diff import Scope, as_lines, touches


def _names(item: str, names: Sequence[str]) -> bool:
    """Does a lead item name one of these tokens as a whole name (`--space-4` is not `--space-40`, `colors.text`
    is not `colors.text.primary`)?"""
    return any(re.search(r"(?<![\w.$-])%s(?![\w.-])" % re.escape(name), item) for name in names)


def scope_report(entries: Iterable[Any], leads: Sequence[Mapping[str, Any]], changed: Scope,
                 since: str) -> Dict[str, Any]:
    """`entries` are the theme's tokens.Entry rows; `leads` the report's lead dicts; `changed` maps each changed
    file to the lines the change wrote (None: all of it), or is a plain list of files."""
    lines = as_lines(changed)
    added = sorted({entry.name for entry in entries if touches(lines, entry.file, entry.line)})
    named = [{"check": lead["check"], "items": [item for item in lead["items"] if _names(item, added)]}
             for lead in leads] if added else []
    return {"since": since, "tokens": added, "leads": [lead for lead in named if lead["items"]]}


def render_scope(scope: Mapping[str, Any]) -> str:
    out: List[str] = ["", "## Tokens on theme lines changed since %s (the census and leads above stay whole-app)"
                      % scope["since"]]
    tokens = scope["tokens"]
    if not tokens:
        out.append("None: the release defined or changed no token.")
        return "\n".join(out)
    out.append("%d: %s" % (len(tokens), ", ".join(tokens)))
    if not scope["leads"]:
        out.append("No lead above names them.")
        return "\n".join(out)
    out.append("Lead items that name them (the release's to answer):")
    for lead in scope["leads"]:
        out += ["  [%s]" % lead["check"]] + ["    - " + item for item in lead["items"]]
    return "\n".join(out)
