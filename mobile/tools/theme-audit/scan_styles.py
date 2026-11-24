#!/usr/bin/env python3
"""Find raw styling values (colors, spacing, type, radii, shadows) decided outside an app's theme files.

    python3 scan_styles.py <app-dir> --theme <file-or-glob> [--theme ...] [--ignore <glob> ...]
                           [--json out.json] [--top N] [--max N] [--list] [--since REV]

Prints a short summary: counts per category, how many values are really different to the eye, colors grouped
by the job they do, steps packed too close together, and leads about type mixes and look-alike components.
Every line is a lead to check, not a verdict. --json writes every finding plus the color clusters.
--max N exits 1 when more than N raw values are found, which makes this a guardrail for a test or CI
(--fail is --max 0). --list prints each counted finding as file:line. With --since REV (a release's last
audited commit) it also lists the raw values on lines changed since then, or says the scope holds no styling;
counts and --max stay whole-app, and --list then prints that scope in full instead of the whole app. Files git ignores (build output) are not read. Standard library only; the
analysis lives in themelib/, this file does the reading and printing.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))

from themelib import files  # noqa: E402
from themelib.leads import component_names, style_blocks, type_combos  # noqa: E402
from themelib.rules import RULES_BY_EXTENSION  # noqa: E402
from themelib.scan import scan_text  # noqa: E402
from themelib.scope import render_scope, scope_report  # noqa: E402
from themelib.summarize import build_report, render  # noqa: E402

LISTED_WHEN_OVER_LIMIT = 25


# Exit code when a gate flag is given but no file was read: the guardrail checked nothing, so it neither
# passes (0) nor counts a failure (1). release-audit fails the check unless the project's own checks cover it
# (Zach, 2026-11-23).
EXIT_NOTHING_READ = 2


def main(argv: Optional[List[str]] = None) -> int:
    args = _parse(argv)
    root = Path(args.src).expanduser()
    if not root.is_dir():
        print("not a directory: %s" % root, file=sys.stderr)
        return 2
    theme_patterns = files.relative_patterns(root, args.theme)
    ignore_patterns = files.relative_patterns(root, args.ignore)

    scans, theme_files, ignored = {}, [], []
    combos: Counter = Counter()
    components = defaultdict(lambda: defaultdict(list))
    blocks = defaultdict(list)
    for path, relative in files.iter_sources(root, RULES_BY_EXTENSION):
        if files.matches(relative, theme_patterns):
            theme_files.append(relative)
            continue
        if files.matches(relative, ignore_patterns):
            ignored.append(relative)
            continue
        text = files.read(path)
        scans[relative] = scan_text(relative, text)
        combos.update(type_combos(text, path.suffix.lower()))
        for signature, line in style_blocks(text):
            blocks[signature].append("%s:%d" % (relative, line))
        for kind, name in component_names(relative, text):
            components[kind][name].append(relative)

    # Printed beside the verdict at the end, where a runner reading the report's tail sees them.
    warnings = ["warning: --theme %s %s" % (pattern, _why_unmatched(root, pattern))
                for pattern in theme_patterns if not files.matches_any(theme_files, pattern)]
    warnings += ["warning: --ignore %s matched no file, so nothing was left out for it" % pattern
                 for pattern in ignore_patterns if not files.matches_any(ignored, pattern)]

    report = build_report(scans, combos, components, blocks, theme_files, args.top)
    print(render(report))
    if args.since:
        changed = files.changed_since(root, args.since)
        if changed is None:
            print("--since %s: not a commit git knows here" % args.since, file=sys.stderr)
            return 2
        report["scope"] = scope_report(report["findings"], list(scans), theme_files, changed, args.since)
        print(render_scope(report["scope"], None if args.list else LISTED_WHEN_OVER_LIMIT))
    counted = [finding for finding in report["findings"] if not finding["advisory"]]
    if args.list and not args.since:
        print("\n" + "\n".join(_line(finding) for finding in counted))
    if args.json:
        Path(args.json).write_text(json.dumps(report, indent=1))
        print("\nAll findings and color clusters: %s" % args.json)
    limit = 0 if args.fail else args.max
    sys.stdout.flush()  # NOT A PASS goes to stderr; flushing keeps it below the report when both share one pipe
    if warnings:
        print("\n" + "\n".join(warnings), file=sys.stderr)
    if limit is not None and not report["files_scanned"]:
        print("\nNOT A PASS: scanned 0 files, so this guardrail checked nothing here.", file=sys.stderr)
        return EXIT_NOTHING_READ
    if limit is not None and len(counted) > limit:
        print("\nFAIL: %d raw styling values, limit %d." % (len(counted), limit))
        if not args.list:
            print("\n".join(_line(finding) for finding in counted[:LISTED_WHEN_OVER_LIMIT]))
        return 1
    return 0


def _why_unmatched(root: Path, pattern: str) -> str:
    suffix = Path(pattern).suffix.lower()
    if (root / pattern).is_file() and suffix not in RULES_BY_EXTENSION:
        return "is a %s file, which this scanner does not read" % suffix
    return "matched no file, so theme definitions may be counted as raw values"


def _line(finding: dict) -> str:
    return "%s:%d  %s  %s" % (finding["file"], finding["line"], finding["category"], finding["value"])


def _parse(argv: Optional[List[str]]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("src", help="the app's source folder")
    parser.add_argument("--theme", action="append", default=[], help="theme file, folder or glob (repeatable)")
    parser.add_argument("--ignore", action="append", default=[], help="other files, folders or globs to skip")
    parser.add_argument("--json", help="write the full report here")
    parser.add_argument("--top", type=int, default=8, help="values listed per section")
    parser.add_argument("--max", type=int, help="exit 1 when more raw values than this are found")
    parser.add_argument("--fail", action="store_true", help="same as --max 0")
    parser.add_argument("--list", action="store_true", help="print every counted finding as file:line (with --since: every one in the scope)")
    parser.add_argument("--since", metavar="REV", help="also list the raw values on lines changed since this commit "
                        "(a release's scope); counts and --max stay whole-app")
    return parser.parse_args(argv)


if __name__ == "__main__":
    sys.exit(main())
