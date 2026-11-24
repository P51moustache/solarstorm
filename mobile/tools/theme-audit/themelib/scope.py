"""The part of a whole-app scan that a release wrote: the raw values on lines changed since a commit. The counts
and the guardrail stay whole-app; this only says which values to read first, and says plainly when the scope
holds no styling at all, so a release that changed none needs no styling review. Pure."""
from __future__ import annotations

from typing import Any, Dict, List, Mapping, Optional, Sequence

from .diff import Scope, as_lines, touches


def scope_report(findings: Sequence[Mapping[str, Any]], scanned: Sequence[str], theme_files: Sequence[str],
                 changed: Scope, since: str) -> Dict[str, Any]:
    """`findings` are the report's finding dicts; `scanned` the files counted; `changed` maps each changed
    file to the lines the change touched (None: all of it), or is a plain list of files."""
    lines = as_lines(changed)
    in_files = [row for row in findings if not row["advisory"] and row["file"] in lines]
    listed = [row for row in in_files if touches(lines, row["file"], row["line"])]
    return {
        "since": since,
        "files": sorted(set(lines) & set(scanned)),
        "theme_files": sorted(set(lines) & set(theme_files)),
        "values": listed,
        "untouched": len(in_files) - len(listed),
    }


def render_scope(scope: Mapping[str, Any], limit: Optional[int]) -> str:
    """`limit` caps the changed-line values listed; None lists them all (`--list`)."""
    files, values = scope["files"], scope["values"]
    out: List[str] = ["\n## In files changed since %s (%d this scan reads; the counts above stay whole-app)"
                      % (scope["since"], len(files))]
    if not files and not scope["theme_files"]:
        out.append("No styling in the scope: the release changed no file this scan reads.")
        return "\n".join(out)
    out.append("Raw values on changed lines: %d" % len(values))
    out.extend("  %s:%d  %s  %s" % (row["file"], row["line"], row["category"], row["value"]) for row in values[:limit])
    if limit is not None and len(values) > limit:
        out.append("  … %d more (--list prints them all; `scope.values` in the JSON)" % (len(values) - limit))
    if scope["untouched"]:
        out.append("Not listed: %d raw values on lines of these files the change did not touch (they are in the "
                   "whole-app count; `findings` in the JSON)" % scope["untouched"])
    if scope["theme_files"]:
        out.append("Theme files changed: %s (the core itself moved: run theme_check.py --since %s)"
                   % (", ".join(scope["theme_files"]), scope["since"]))
    return "\n".join(out)
