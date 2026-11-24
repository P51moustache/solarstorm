"""What counts as a raw styling value in each stack. Data only: patterns and the constants that tune them."""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

from .colors import NAMED

# How a match becomes values:
#   color    the match is one color literal
#   lengths  CSS value text: every number with a length unit (`13px 1rem` gives two values)
#   scalars  CSS value text where bare numbers count too (line-height, font-weight)
#   numbers  argument text: every bare number (`horizontal: 16, vertical: 8`)
#   number   the group is a single number
#   text     the group is reported as written (font stacks, shadows, named colors)
MODES = ("color", "lengths", "scalars", "numbers", "number", "text")


@dataclass(frozen=True)
class Rule:
    category: str
    pattern: "re.Pattern[str]"
    mode: str = "number"
    group: int = 1
    advisory: bool = False  # context for the audit, never counted against the guardrail
    where: str = "any"      # "stylesheet" or "code" limits a rule to that kind of file
    unless: "Optional[re.Pattern[str]]" = None  # skip a match when this matches the line just before it


def _css(props: str) -> "re.Pattern[str]":
    """A CSS declaration for one of `props`, capturing its value. Custom properties (`--x-padding`) don't match."""
    return re.compile(r"(?<![\w-])(?:%s)\s*:\s*([^;{}\n]+)" % props, re.I)


def _js(props: str) -> "re.Pattern[str]":
    """A camelCase style key with a bare number. Arithmetic on a constant (`4 * unit`) is left alone."""
    return re.compile(r"\b(?:%s)\s*:\s*(-?\d+(?:\.\d+)?)\b(?!\s*[%%\w.*/+-])" % props)


def _js_string(props: str) -> "re.Pattern[str]":
    return re.compile(r"\b(?:%s)\s*:\s*['\"`]([^'\"`\n]*\d[^'\"`\n]*)['\"`]" % props)


_NAMED_COLORS = "|".join(sorted(NAMED, key=len, reverse=True))
_HEX = r"#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b"
_CSS_SPACING = r"(?:padding|margin)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?|(?:row-|column-)?gap"
_JS_SPACING = (r"(?:padding|margin)(?:Top|Bottom|Left|Right|Horizontal|Vertical|Start|End|Inline|Block)?"
               r"|gap|rowGap|columnGap")
_JS_RADIUS = r"borderRadius|border(?:Top|Bottom)(?:Left|Right|Start|End)Radius"
_TAILWIND_COLOR_PREFIX = (r"(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|decoration|accent|caret"
                          r"|placeholder|shadow)")
_TAILWIND_HUES = (r"(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue"
                  r"|indigo|violet|purple|fuchsia|pink|rose)")
_SWIFT_HUES = r"(?:red|orange|yellow|green|mint|teal|cyan|blue|indigo|purple|pink|brown|gray|black|white)"
_NUM = r"(-?\d+(?:\.\d+)?)"
# The first width condition of a media or container query, as `(max-width: 40rem)` or `(width < 40rem)`.
_WIDTH_QUERY = r"\(\s*(?:(?:min|max)-)?(?:width|inline-size)\s*(?::|[<>]=?)\s*([\d.]+(?:px|em|rem))"

# `querySelector('#add')` and `href="#faq"` hold ids, though `#add` and `#fa` + `q` can read as hex.
_SELECTOR_OR_LINK = re.compile(r"(?:querySelector(?:All)?|closest|matches|getElementById|\$)\(\s*['\"`]$"
                               r"|\b(?:href|to|id|htmlFor|hash)\s*[=:]\s*\{?['\"`]$")

WEB: Tuple[Rule, ...] = (
    # Colors. In a stylesheet a hex can sit anywhere in a value; in code it is always inside a string, which
    # keeps "Order #1234" and `querySelector('#add')` out of the results.
    Rule("color", re.compile(r"(?<![\w&/\[])(?<!href=[\"'])(%s)" % _HEX), "color", where="stylesheet"),
    Rule("color", re.compile(r"(?<=['\"`])(%s)" % _HEX), "color", where="code", unless=_SELECTOR_OR_LINK),
    Rule("color", re.compile(r"((?:rgba?|hsla?|oklch|oklab)\(\s*[\d.][^()]*\))", re.I), "color"),
    Rule("color", re.compile(r"(?<![\w-])(?:background(?:-color)?|color|border(?:-\w+)*-color|fill|stroke"
                             r"|outline-color)\s*:\s*(%s)\s*(?:!important\s*)?(?=[;}\n]|$)" % _NAMED_COLORS, re.I),
         "text"),
    Rule("color", re.compile(r"\b\w*[cC]olor\w*\s*:\s*['\"](%s)['\"]" % _NAMED_COLORS), "text"),
    Rule("color", re.compile(r"\b%s-\[(%s|(?:rgba?|hsla?|oklch)\([^\]]*\))\]" % (_TAILWIND_COLOR_PREFIX, _HEX)),
         "color"),
    # Tailwind's stock palette names a value, not a job, so a class like `bg-gray-100` is a raw color.
    Rule("color", re.compile(r"(?<![\w-])%s-(%s-\d{2,3}|white|black)(?:/\d+)?(?![\w-])"
                             % (_TAILWIND_COLOR_PREFIX, _TAILWIND_HUES)), "text"),
    # Spacing
    Rule("spacing", _css(_CSS_SPACING), "lengths"),
    Rule("spacing", _js(_JS_SPACING)),
    Rule("spacing", _js_string(_JS_SPACING), "lengths"),
    Rule("spacing", re.compile(r"(?<![\w-])-?(?:[pm][xytrblse]?|gap(?:-[xy])?|space-[xy])-\[([^\]]+)\]"), "lengths"),
    # Type
    Rule("font-size", _css("font-size"), "lengths"),
    Rule("font-size", _js("fontSize")),
    Rule("font-size", _js_string("fontSize"), "lengths"),
    Rule("font-size", re.compile(r"(?<![\w-])text-\[(\d[^\]]*)\]"), "lengths"),
    Rule("font-size", re.compile(r"(?<![\w-])font\s*:\s*([^;{}\n]*\d[^;{}\n]*)", re.I), "text"),
    Rule("font-weight", _css("font-weight"), "scalars"),
    Rule("font-weight", re.compile(r"\bfontWeight\s*:\s*['\"]?(\d{3}|bold)\b")),
    Rule("font-weight", re.compile(r"(?<![\w-])font-\[(\d{3})\]")),
    Rule("line-height", _css("line-height"), "scalars"),
    Rule("line-height", _js("lineHeight")),
    Rule("line-height", re.compile(r"(?<![\w-])leading-\[([^\]]+)\]"), "scalars"),
    Rule("font-family", _css("font-family"), "text"),
    Rule("font-family", re.compile(r"\bfontFamily\s*:\s*['\"]([^'\"]+)['\"]"), "text"),
    Rule("letter-spacing", _css("letter-spacing"), "lengths"),
    Rule("letter-spacing", _js("letterSpacing")),
    Rule("letter-spacing", re.compile(r"(?<![\w-])tracking-\[([^\]]+)\]"), "lengths"),
    # Shape and depth
    Rule("radius", _css(r"border(?:-(?:top|bottom|start|end))?(?:-(?:left|right|start|end))?-radius"), "lengths"),
    Rule("radius", _js(_JS_RADIUS)),
    Rule("radius", _js_string(_JS_RADIUS), "lengths"),
    Rule("radius", re.compile(r"(?<![\w-])rounded(?:-[trblse]{1,2})?-\[([^\]]+)\]"), "lengths"),
    Rule("shadow", _css("box-shadow|text-shadow"), "text"),
    Rule("shadow", re.compile(r"\b(boxShadow\s*:\s*['\"`][^'\"`\n]+['\"`])"), "text"),
    Rule("shadow", re.compile(r"\b((?:shadowRadius|shadowOpacity|elevation)\s*:\s*-?[\d.]+)"), "text"),
    Rule("shadow", re.compile(r"(?<![\w-])shadow-\[([^\]]+)\]"), "text"),
    # Context: worth a scale when the values spread, but not what the guardrail polices.
    Rule("opacity", re.compile(r"(?<![\w-])opacity\s*:\s*(0?\.\d+|\d{1,2}%)"), "text", advisory=True),
    Rule("z-index", re.compile(r"(?<![\w-])(?:z-index|zIndex)\s*:\s*(-?\d+)"), "text", advisory=True),
    # Viewport breakpoints and container-query widths are listed apart: breakpoints should come from a small
    # shared set, while each container width is where one component stops fitting (and cannot name a token).
    Rule("breakpoint", re.compile(r"@media[^{\n]*?" + _WIDTH_QUERY), "text", advisory=True),
    Rule("container-width", re.compile(r"@container[^{\n]*?" + _WIDTH_QUERY), "text", advisory=True),
    Rule("local-variable", re.compile(r"(?<![\w-])(--[\w-]+)\s*:\s*[^;{}\n]*(?:\d+(?:px|rem)|#[0-9a-fA-F]{3,8})"),
         "text", advisory=True, where="stylesheet"),
)

SWIFT: Tuple[Rule, ...] = (
    Rule("color", re.compile(r"((?:UI|NS)?Color\(\s*(?:\.\w+\s*,\s*)?(?:red|white|hue|displayP3Red)\s*:[^()]*\))"),
         "color"),
    Rule("color", re.compile(r"((?:UI|NS)?Color\(\s*hex\s*:\s*[^()]*\))"), "color"),
    Rule("color", re.compile(r"(#colorLiteral\([^()]*\))"), "text"),
    Rule("color", re.compile(r"\b((?:UI|NS)?Color\.%s)\b" % _SWIFT_HUES), "text"),
    Rule("color", re.compile(r"\.(?:foregroundColor|foregroundStyle|background|tint|fill|stroke|border|accentColor)"
                             r"\(\s*(\.%s)\b" % _SWIFT_HUES), "text"),
    Rule("spacing", re.compile(r"\.padding\(\s*(?:\[[^\]]*\]\s*,\s*|\.\w+\s*,\s*)?%s\s*\)" % _NUM)),
    Rule("spacing", re.compile(r"\bspacing:\s*%s\b" % _NUM)),
    Rule("spacing", re.compile(r"\bEdgeInsets\(([^()]*\d[^()]*)\)"), "numbers"),
    Rule("font-size", re.compile(r"\.system\(\s*size:\s*%s" % _NUM)),
    Rule("font-size", re.compile(r"\.custom\(\s*\"[^\"]*\"\s*,\s*size:\s*%s" % _NUM)),
    Rule("font-size", re.compile(r"\bUIFont\.\w+\(\s*ofSize:\s*%s" % _NUM)),
    Rule("font-family", re.compile(r"(?:\.custom\(|UIFont\(\s*name:)\s*\"([^\"]+)\""), "text"),
    Rule("radius", re.compile(r"cornerRadius\s*[:=(]\s*%s" % _NUM)),
    Rule("shadow", re.compile(r"\.(shadow\([^\n]*?radius:\s*[\d.]+)"), "text"),
    Rule("shadow", re.compile(r"\b(shadow(?:Radius|Opacity)\s*=\s*[\d.]+)"), "text"),
    Rule("opacity", re.compile(r"\.opacity\(\s*(0?\.\d+)\s*\)"), "text", advisory=True),
)

DART: Tuple[Rule, ...] = (
    Rule("color", re.compile(r"\b(Color\(\s*0x[0-9a-fA-F]{6,8}\s*\))"), "color"),
    Rule("color", re.compile(r"\b(Color\.from(?:RGBO|ARGB)\([^()]*\))"), "color"),
    Rule("color", re.compile(r"\b(Colors\.(?!transparent\b)\w+(?:\[\d+\]|\.shade\d+)?)"), "text"),
    Rule("spacing", re.compile(r"\bEdgeInsets(?:Directional)?\.(?:all|symmetric|only|fromLTRB)\(([^()]*)\)"),
         "numbers"),
    Rule("spacing", re.compile(r"\bSizedBox\(\s*(?:height|width):\s*%s\s*\)" % _NUM)),
    Rule("spacing", re.compile(r"\b(?:spacing|runSpacing|mainAxisSpacing|crossAxisSpacing):\s*%s\b" % _NUM)),
    Rule("font-size", re.compile(r"\bfontSize:\s*%s\b" % _NUM)),
    Rule("font-weight", re.compile(r"\b(FontWeight\.(?:w\d00|bold))\b"), "text"),
    Rule("font-family", re.compile(r"\bfontFamily:\s*['\"]([^'\"]+)['\"]"), "text"),
    Rule("radius", re.compile(r"\b(?:BorderRadius|Radius)\.circular\(\s*%s\s*\)" % _NUM)),
    Rule("shadow", re.compile(r"\b(BoxShadow)\("), "text"),
    Rule("shadow", re.compile(r"\b(elevation:\s*[\d.]+)"), "text"),
)

KOTLIN: Tuple[Rule, ...] = (
    Rule("color", re.compile(r"\b(Color\(\s*0x[0-9a-fA-F]{6,8}\s*\))"), "color"),
    Rule("color", re.compile(r"\b(Color\.(?:Red|Green|Blue|Black|White|Gray|LightGray|DarkGray|Yellow|Cyan|Magenta))"
                             r"\b"), "text"),
    Rule("spacing", re.compile(r"\b(?:padding|absolutePadding|spacedBy|PaddingValues)\(([^()]*\d\.dp[^()]*)\)"),
         "numbers"),
    Rule("spacing", re.compile(r"\bSpacer\([^()]*\.(?:height|width|size)\(\s*%s\.dp" % _NUM)),
    Rule("font-size", re.compile(r"(?<![\w.])%s\.sp\b" % _NUM)),
    Rule("font-weight", re.compile(r"\b(FontWeight\.(?:W\d00|\w*Bold|Medium|Light|Thin))\b"), "text"),
    Rule("radius", re.compile(r"\bRoundedCornerShape\(([^()]*\d[^()]*)\)"), "numbers"),
    Rule("shadow", re.compile(r"\b((?:shadowElevation|tonalElevation|elevation)\s*=\s*[\d.]+\.dp)"), "text"),
)

# Editor plugins and scaled UIs write sizes as a literal times the UI scale: `roundi(6 * factor)`,
# `8 * EDSCALE`, `int(get_editor_scale() * 4)`. The literal is still a size decided at the call site (it only
# scales correctly), so it counts as the raw value. A token times the scale (`GAP * factor`) has no literal and
# a literal times anything else (`2 * GAP`) is arithmetic on a token: neither matches.
_GD_SCALE = r"(?:[A-Za-z_][\w.]*)?(?:[sS]cale|[fF]actor|SCALE|FACTOR)\w*(?:\(\))?"
_GD_ROUND = r"(?:(?:roundi|round|int|floori|floor|ceili|ceil|float)\(\s*)?"
_GD_SIZE = r"%s(?:%s\s*\*\s*)?%s(?:\s*\*\s*%s)?(?:\s*\))?" % (_GD_ROUND, _GD_SCALE, _NUM, _GD_SCALE)

GODOT: Tuple[Rule, ...] = (
    Rule("color", re.compile(r"\b(Color8?\(\s*[\d.]+\s*,[^()]*\))"), "color"),
    Rule("color", re.compile(r"\b(Color(?:\.html)?\(\s*\"#?[0-9a-fA-F]{3,8}\"\s*\))"), "color"),
    Rule("color", re.compile(r"\b(Color\.(?!WHITE\b|TRANSPARENT\b)[A-Z][A-Z_]{2,})\b"), "text"),
    Rule("spacing", re.compile(r"add_theme_constant_override\(\s*\"\w+\"\s*,\s*%s\s*\)" % _GD_SIZE)),
    Rule("spacing", re.compile(r"\btheme_override_constants/\w+\s*=\s*%s" % _NUM)),
    Rule("spacing", re.compile(r"\b(?:content|expand)_margin_\w+\s*=\s*%s" % _GD_SIZE)),
    Rule("font-size", re.compile(r"add_theme_font_size_override\(\s*\"\w+\"\s*,\s*%s\s*\)" % _GD_SIZE)),
    Rule("font-size", re.compile(r"\btheme_override_font_sizes/\w+\s*=\s*%s" % _NUM)),
    Rule("font-size", re.compile(r"(?<![\w/])font_size\s*=\s*%s" % _GD_SIZE)),
    Rule("radius", re.compile(r"\bcorner_radius_\w+\s*=\s*%s" % _GD_SIZE)),
    Rule("radius", re.compile(r"\bset_corner_radius_all\(\s*%s\s*\)" % _GD_SIZE)),
    Rule("shadow", re.compile(r"\b(shadow_size\s*=\s*\d+)"), "text"),
)

_WEB_EXTENSIONS = (".css", ".scss", ".sass", ".less", ".html", ".vue", ".svelte", ".astro",
                   ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs")
# Files where a color can appear outside a string.
STYLESHEET_EXTENSIONS = (".css", ".scss", ".sass", ".less", ".html", ".vue", ".svelte", ".astro")

RULES_BY_EXTENSION: Dict[str, Tuple[Rule, ...]] = {
    **{extension: WEB for extension in _WEB_EXTENSIONS},
    ".swift": SWIFT, ".dart": DART, ".kt": KOTLIN, ".gd": GODOT, ".tscn": GODOT, ".tres": GODOT,
}
# `#` starts a comment in these, so it can't be told from a hex color without looking at quotes.
HASH_COMMENT_EXTENSIONS = (".gd",)

# The word that says what a color is used for. The last one before the literal on its line wins.
COLOR_JOBS: Tuple[Tuple[str, "re.Pattern[str]"], ...] = (
    ("border", re.compile(r"border|outline|divider|separator|(?<![\w])ring", re.I)),
    ("background", re.compile(r"background|(?<![\w-])bg(?![\w])|surface|backdrop|scrim|overlay", re.I)),
    ("shadow", re.compile(r"shadow", re.I)),
    ("icon", re.compile(r"(?<![\w-])(?:fill|stroke)(?![\w])|tint|icon", re.I)),
    ("text", re.compile(r"(?<![\w-])color(?![\w])|foreground|(?<![\w])text(?![\w])|font_color|placeholder|caret",
                        re.I)),
)

# Padding and margins above this are layout geometry (a sidebar offset, an avatar indent), not spacing rhythm.
RHYTHM_MAX_PX = 64.0
# 0 and hairlines are resets, not decisions worth a token.
HAIRLINE_MAX_PX = 1.0
REM_PX = 16.0
IGNORE_MARKER = "theme-audit-ignore"
