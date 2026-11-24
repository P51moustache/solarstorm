"""Run every theme-file check and lay the result out for reading. Pure."""
from __future__ import annotations

from dataclasses import asdict
from typing import Any, Dict, List, Mapping, Sequence, Tuple

from . import checks_names, checks_reading, checks_values
from .health import BUDGETS, TEXT_STYLE_RANGE, Check, Context, census
from .tokens import BASE_SCHEME

# Structure first (it decides whether the theme can change at all), then tidiness, then legibility.
ALL_CHECKS: Tuple[Check, ...] = (checks_reading.STRUCTURE + checks_names.CHECKS[:3] + checks_values.CHECKS
                                 + checks_names.CHECKS[3:] + checks_reading.LEGIBILITY)
ITEMS_SHOWN = 12


def build(context: Context, theme_files: Sequence[str], checks: Sequence[Check] = ALL_CHECKS) -> Dict[str, Any]:
    theme = context.theme
    counts = census(theme)
    styles = len(checks_reading.named_text_styles(theme)) + context.style_rules
    leads = [lead for lead in (check(context) for check in checks) if lead is not None]
    return {
        "theme_files": list(theme_files),
        "tokens": len(theme.tokens()),
        "schemes": theme.schemes,
        "primary_scheme": theme.primary,
        "layered": theme.layered,
        "app_files": context.reach.files if context.reach else None,
        "census": {name: {"have": have, "budget": BUDGETS.get(name)} for name, have in counts.items()},
        "text_styles": styles,
        "leads": [asdict(lead) for lead in leads],
    }


def render(report: Mapping[str, Any], show_all: bool = False) -> str:
    schemes = [scheme for scheme in report["schemes"] if scheme != BASE_SCHEME] or ["one"]
    shape = ("layered: roles point at a palette" if report["layered"]
             else "flat: every color is a raw value, so call sites name values directly")
    lines = ["Theme: %s" % (", ".join(report["theme_files"]) or "no theme file found"),
             "%d tokens · schemes: %s · %s" % (report["tokens"], ", ".join(schemes), shape),
             "Use counted across %d app files." % report["app_files"] if report["app_files"] is not None
             else "No app folder given: checks that need call sites were skipped.", ""]
    for name, row in report["census"].items():
        budget = row["budget"]
        note = "" if budget is None else "   budget %d%s" % (budget, "   over" if row["have"] > budget else "")
        lines.append("  %-17s %4d%s" % (name, row["have"], note))
    low, high = TEXT_STYLE_RANGE
    styles = report["text_styles"]
    lines.append("  %-17s %4d   expect %d-%d%s" % ("text styles", styles, low, high,
                                                    "" if low <= styles <= high else "   outside"))
    if not report["leads"]:
        return "\n".join(lines + ["", "No leads: the theme file itself looks sound. Judge the screens next."])
    lines += ["", "Leads (each is something to check in the file or on screen, not a verdict):"]
    for lead in report["leads"]:
        lines += ["", "[%s] %s" % (lead["check"], lead["summary"])]
        items: List[str] = list(lead["items"])
        shown = items if show_all else items[:ITEMS_SHOWN]
        lines += ["    - " + item for item in shown]
        if len(items) > len(shown):
            lines.append("    ... and %d more (--all, or --json)" % (len(items) - len(shown)))
    return "\n".join(lines)
