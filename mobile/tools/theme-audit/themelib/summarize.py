"""Turn findings into the scan report: a dict for JSON and a short text summary. Pure."""
from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import asdict
from typing import Any, Dict, List, Mapping, Sequence, Tuple

from .cluster import SUBTLE_DELTA_E, cluster_colors, cluster_numbers, grid_share
from .leads import TypeCombo
from .scan import FileScan, Finding

NUMERIC_CATEGORIES = ("spacing", "font-size", "line-height", "font-weight", "radius")
# Fewer same-kind definitions than this is normal variety, not a sign of missing shared components.
MIN_LOOKALIKES = 3
# A coherent app names this many text styles; far more free-form mixes means type is decided per screen.
TEXT_STYLES_EXPECTED = "5-8"
STEPS_SHOWN = 10
# Zero files read means the stack is one this scan does not know (Unity USS, say): its zeros say nothing.
NOTHING_READ = ("Nothing here is a file this scan reads (web styles and scripts, Swift, Kotlin, Dart, Godot): "
                "the zeros below are empty, not clean, so they are not a pass. Use the project's own theme "
                "check and read the styling by hand.")


def build_report(scans: Mapping[str, FileScan], combos: "Counter[TypeCombo]",
                 components: Mapping[str, Mapping[str, Sequence[str]]],
                 blocks: Mapping[str, Sequence[str]], theme_files: Sequence[str], top: int = 8) -> Dict[str, Any]:
    """`blocks` maps a style-block signature to the places (`file:line`) it appears."""
    findings = [finding for scan in scans.values() for finding in scan.findings]
    counted = [finding for finding in findings if not finding.advisory]
    by_category = Counter(finding.category for finding in counted)
    categories = {}
    for category in by_category:
        mine = [finding for finding in counted if finding.category == category]
        categories[category] = (_color_section(mine, top) if category == "color"
                                else _numeric_section(category, mine, top) if category in NUMERIC_CATEGORIES
                                else _plain_section(mine, top))
    advisory = defaultdict(list)
    for finding in findings:
        if finding.advisory:
            advisory[finding.category].append(finding)
    return {
        "files_scanned": len(scans),
        "theme_files": list(theme_files),
        "raw_total": len(counted),
        "ignored_lines": sum(scan.ignored for scan in scans.values()),
        "by_category": dict(by_category.most_common()),
        "categories": categories,
        "leads": {
            "type_combos": {"distinct": len(combos), "places": sum(combos.values()),
                            "top": [[list(combo), uses] for combo, uses in combos.most_common(top)]},
            "repeated_blocks": _repeated_blocks(blocks, top),
            "components": {kind: {"names": len(names), "files": len({f for files in names.values() for f in files}),
                                  "examples": sorted(names, key=lambda n: (-len(names[n]), n))[:top]}
                           for kind, names in components.items() if len(names) >= MIN_LOOKALIKES},
            "context": {category: _plain_section(items, top) for category, items in advisory.items()},
        },
        "worst_files": Counter(finding.file for finding in counted).most_common(top),
        "findings": [asdict(finding) for finding in findings],
    }


def render(report: Mapping[str, Any]) -> str:
    """The text an auditor reads. Every line is a lead to check in the code or on screen."""
    theme = ", ".join(report["theme_files"]) or "none given"
    lines = ["Scanned %d files (theme: %s): %d raw styling values outside the theme."
             % (report["files_scanned"], theme, report["raw_total"])]
    if not report["files_scanned"]:
        lines.append(NOTHING_READ)
    if report["ignored_lines"]:
        lines.append("%d lines opted out with theme-audit-ignore: list them as exceptions." % report["ignored_lines"])
    if report["by_category"]:
        lines.append("By category: " + " · ".join("%s %d" % pair for pair in report["by_category"].items()))
    for category, section in report["categories"].items():
        lines.append("")
        lines.extend(_render_color(section) if category == "color" else _render_section(category, section))
    lines.extend(_render_leads(report["leads"]))
    if report["worst_files"]:
        lines.append("\nWorst files: " + ", ".join("%s (%d)" % tuple(pair) for pair in report["worst_files"]))
    return "\n".join(lines)


def _color_section(findings: Sequence[Finding], top: int) -> Dict[str, Any]:
    counts = Counter(finding.value for finding in findings)
    clusters = cluster_colors(counts)
    jobs: Dict[str, Counter] = defaultdict(Counter)
    for finding in findings:
        jobs[finding.job][finding.value] += 1
    return {
        "uses": len(findings),
        "distinct": len(counts),
        "visibly_different": len(clusters),
        "needed_at_most": len(cluster_colors(counts, SUBTLE_DELTA_E)),
        "by_hue": dict(Counter(cluster.family for cluster in clusters for _ in cluster.members).most_common()),
        "by_job": {job: {"uses": sum(values.values()), "distinct": len(values),
                         "top": [[cluster.lead, cluster.uses, len(cluster.members) - 1]
                                 for cluster in cluster_colors(values)[:top]]}
                   for job, values in sorted(jobs.items(), key=lambda item: -sum(item[1].values()))},
        "clusters": [{"lead": cluster.lead, "uses": cluster.uses, "family": cluster.family,
                      "members": [list(member) for member in cluster.members]} for cluster in clusters],
    }


def _numeric_section(category: str, findings: Sequence[Finding], top: int) -> Dict[str, Any]:
    sized = Counter(abs(finding.px) for finding in findings if finding.px is not None)
    other = Counter(finding.value for finding in findings if finding.px is None)
    clusters = cluster_numbers(category, sized)
    section: Dict[str, Any] = {
        "uses": len(findings),
        "distinct": len(sized) + len(other),
        "distinguishable": len(clusters) + len(other),
        "steps": [{"lead": _number(cluster.lead), "uses": cluster.uses,
                   "members": [[_number(value), uses] for value, uses in cluster.members]} for cluster in clusters],
        "relative_or_keyword": other.most_common(top),
    }
    if category == "spacing":
        section["grid_share"] = round(grid_share(sized), 2)
    return section


def _repeated_blocks(blocks: Mapping[str, Sequence[str]], top: int) -> Dict[str, Any]:
    repeated = sorted(((places, signature) for signature, places in blocks.items() if len(places) > 1),
                      key=lambda item: -len(item[0]))
    return {"distinct": len(repeated), "copies": sum(len(places) for places, _ in repeated),
            "top": [{"places": list(places), "declarations": signature} for places, signature in repeated[:top]]}


def _plain_section(findings: Sequence[Finding], top: int) -> Dict[str, Any]:
    counts = Counter(finding.value for finding in findings)
    return {"uses": len(findings), "distinct": len(counts), "top": counts.most_common(top)}


def _render_color(section: Mapping[str, Any]) -> List[str]:
    lines = ["[color] %d uses · %d distinct · %d visibly different · about %d once near-twins merge"
             % (section["uses"], section["distinct"], section["visibly_different"], section["needed_at_most"]),
             "  by hue: " + ", ".join("%s %d" % pair for pair in section["by_hue"].items())]
    for job, detail in section["by_job"].items():
        top = ", ".join("%s x%d%s" % (lead, uses, " (+%d twins)" % twins if twins else "")
                        for lead, uses, twins in detail["top"])
        lines.append("  %s: %d distinct in %d uses. %s" % (job or "other", detail["distinct"], detail["uses"], top))
    return lines


def _render_section(category: str, section: Mapping[str, Any]) -> List[str]:
    if "steps" not in section:
        return ["[%s] %d uses · %d distinct" % (category, section["uses"], section["distinct"]),
                "  most used: " + _pairs(section["top"])]
    head = "[%s] %d uses · %d distinct · %d the eye can tell apart" % (
        category, section["uses"], section["distinct"], section["distinguishable"])
    if "grid_share" in section:
        head += " · %d%% of uses on the 4pt grid" % round(section["grid_share"] * 100)
    steps = []
    for step in section["steps"][:STEPS_SHOWN]:
        twins = ", ".join("%s x%d" % tuple(member) for member in step["members"][1:])
        steps.append("%s x%d%s" % (step["members"][0][0], step["members"][0][1], " (+ %s)" % twins if twins else ""))
    lines = [head]
    if steps:
        lines.append("  steps in use, look-alikes folded in: " + " · ".join(steps))
    if section.get("relative_or_keyword"):
        lines.append("  relative or keyword: " + _pairs(section["relative_or_keyword"]))
    return lines


def _render_leads(leads: Mapping[str, Any]) -> List[str]:
    lines: List[str] = []
    combos = leads["type_combos"]
    if combos["distinct"]:
        lines.append("Type mixes set at call sites: %d distinct size/weight/line-height combinations in %d places "
                     "(a coherent app names %s text styles)."
                     % (combos["distinct"], combos["places"], TEXT_STYLES_EXPECTED))
    repeated = leads["repeated_blocks"]
    if repeated["distinct"]:
        most = repeated["top"][0]
        lines.append("Style blocks written more than once: %d blocks, %d copies. Most copied (x%d): %s  [%s]"
                     % (repeated["distinct"], repeated["copies"], len(most["places"]),
                        most["declarations"][:110], ", ".join(most["places"][:3])))
    for kind, detail in leads["components"].items():
        lines.append("%d %s-like definitions in %d files (%s): do they share one base?"
                     % (detail["names"], kind, detail["files"], ", ".join(detail["examples"][:5])))
    for category, detail in leads["context"].items():
        lines.append("Context, %s: %d uses, %d distinct (%s)."
                     % (category, detail["uses"], detail["distinct"], _pairs(detail["top"][:6])))
    return ["", "Leads (not counted):"] + ["  " + line for line in lines] if lines else []


def _pairs(pairs: Sequence[Tuple[Any, int]]) -> str:
    return ", ".join("%s x%d" % (value, uses) for value, uses in pairs)


def _number(value: float) -> Any:
    return int(value) if float(value).is_integer() else round(value, 3)
