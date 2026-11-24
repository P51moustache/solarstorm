"""Color parsing and perceptual math: sRGB, OKLab, WCAG contrast. Pure functions, standard library only."""
from __future__ import annotations

import colorsys
import math
import re
from typing import Dict, List, NamedTuple, Optional, Tuple


class RGBA(NamedTuple):
    """sRGB components and alpha, each 0..1."""
    r: float
    g: float
    b: float
    a: float = 1.0


# Common CSS color keywords. Used to read values and to spot named colors written at call sites.
NAMED: Dict[str, str] = {
    "white": "#ffffff", "black": "#000000", "red": "#ff0000", "green": "#008000", "blue": "#0000ff",
    "yellow": "#ffff00", "orange": "#ffa500", "purple": "#800080", "pink": "#ffc0cb", "gray": "#808080",
    "grey": "#808080", "silver": "#c0c0c0", "navy": "#000080", "teal": "#008080", "maroon": "#800000",
    "olive": "#808000", "lime": "#00ff00", "aqua": "#00ffff", "cyan": "#00ffff", "fuchsia": "#ff00ff",
    "magenta": "#ff00ff", "brown": "#a52a2a", "gold": "#ffd700", "indigo": "#4b0082", "violet": "#ee82ee",
    "tomato": "#ff6347", "coral": "#ff7f50", "salmon": "#fa8072", "crimson": "#dc143c", "khaki": "#f0e68c",
    "beige": "#f5f5dc", "ivory": "#fffff0", "lavender": "#e6e6fa", "turquoise": "#40e0d0", "tan": "#d2b48c",
    "lightgray": "#d3d3d3", "lightgrey": "#d3d3d3", "darkgray": "#a9a9a9", "darkgrey": "#a9a9a9",
    "whitesmoke": "#f5f5f5", "gainsboro": "#dcdcdc", "dimgray": "#696969", "slategray": "#708090",
}

_HEX = re.compile(r"#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b")
_ARGB = re.compile(r"\b0x([0-9a-fA-F]{8}|[0-9a-fA-F]{6})\b")
_CSS_FUNCTION = re.compile(r"\b(rgba?|hsla?|oklch|oklab)\(([^()]*)\)", re.I)
_FROM_INTS = re.compile(r"\bfrom(RGBO|ARGB)\(([^()]*)\)")
_CONSTRUCTOR = re.compile(r"\b(?:UI|NS)?Color(8)?\s*\(([^()]*)\)")
_LABEL = re.compile(r"^\s*(\w+)\s*[:=]\s*")
# OKLCH chroma written as a percentage is relative to this value (CSS Color 4).
_OKLCH_FULL_CHROMA = 0.4


def parse_color(text: str) -> Optional[RGBA]:
    """Read the first color literal in `text`, in any syntax the supported stacks use. None when there is none."""
    for reader in (_read_hex, _read_argb, _read_css_function, _read_from_ints, _read_constructor, _read_named):
        try:
            color = reader(text)
        except (ValueError, ZeroDivisionError, IndexError):
            color = None
        if color is not None:
            return RGBA(*(min(1.0, max(0.0, part)) for part in color))
    return None


def to_hex(color: RGBA) -> str:
    """Canonical spelling, so `#FFF`, `#ffffff` and `rgb(255, 255, 255)` count as one color."""
    parts = [round(color.r * 255), round(color.g * 255), round(color.b * 255)]
    if color.a < 0.999:
        parts.append(round(color.a * 255))
    return "#" + "".join("%02x" % part for part in parts)


def to_oklab(color: RGBA) -> Tuple[float, float, float]:
    r, g, b = (_to_linear(channel) for channel in color[:3])
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)


def to_oklch(color: RGBA) -> Tuple[float, float, float]:
    """Lightness 0..1, chroma (0 is grey, ~0.3 is vivid), hue in degrees."""
    lightness, a, b = to_oklab(color)
    return lightness, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360


def delta_e(first: RGBA, second: RGBA) -> float:
    """Perceptual distance in OKLab; a different alpha counts in full, so tints never merge with solids."""
    one, two = to_oklab(first), to_oklab(second)
    return math.dist(one, two) + abs(first.a - second.a)


def composite(top: RGBA, under: RGBA) -> RGBA:
    """`top` painted over an opaque `under`."""
    mix = lambda t, u: t * top.a + u * (1 - top.a)  # noqa: E731
    return RGBA(mix(top.r, under.r), mix(top.g, under.g), mix(top.b, under.b), 1.0)


def luminance(color: RGBA) -> float:
    r, g, b = (_to_linear(channel) for channel in color[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(foreground: RGBA, background: RGBA) -> float:
    """WCAG 2 contrast, 1..21. A translucent foreground is flattened onto the background first."""
    if foreground.a < 1:
        foreground = composite(foreground, background)
    light, dark = sorted((luminance(foreground), luminance(background)), reverse=True)
    return (light + 0.05) / (dark + 0.05)


def ratio_text(ratio: float) -> str:
    """A contrast ratio to two places, rounded down so a ratio just under a bar never prints as the bar."""
    return "%.2f" % (math.floor(ratio * 100) / 100)


# Below NEUTRAL_CHROMA a color works as a neutral, though it may carry a tint; below GREY_CHROMA it has none.
NEUTRAL_CHROMA = 0.035
GREY_CHROMA = 0.008
_HUE_BANDS = ((10, "pink"), (45, "red"), (85, "orange"), (120, "yellow"), (170, "green"), (215, "teal"),
              (275, "blue"), (320, "purple"), (360, "pink"))


def hue_family(color: RGBA) -> str:
    """A plain name for the color's hue (`grey`, `muted green`, `green`, `blue`...), for summaries."""
    _, chroma, hue = to_oklch(color)
    if chroma < GREY_CHROMA:
        return "grey"
    name = next(name for limit, name in _HUE_BANDS if hue < limit)
    return "muted " + name if chroma < NEUTRAL_CHROMA else name


def _to_linear(channel: float) -> float:
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


def _from_linear(channel: float) -> float:
    channel = min(1.0, max(0.0, channel))
    return channel * 12.92 if channel <= 0.0031308 else 1.055 * channel ** (1 / 2.4) - 0.055


def _from_oklab(lightness: float, a: float, b: float, alpha: float) -> RGBA:
    l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return RGBA(_from_linear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
                _from_linear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
                _from_linear(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s), alpha)


def _fraction(token: str, full: float) -> float:
    """`50%` -> 0.5; a bare number is divided by `full` (255 for an rgb channel, 1 for alpha)."""
    token = token.strip()
    return float(token[:-1]) / 100 if token.endswith("%") else float(token) / full


def _number(token: str) -> float:
    """A constructor argument: `0.5`, `0.5f`, `23/255`, `23.0 / 255.0`."""
    token = re.sub(r"(?<=\d)[fF]\b", "", token.strip())
    if "/" in token:
        top, bottom = token.split("/", 1)
        return float(top) / float(bottom)
    return float(token)


def _read_hex(text: str) -> Optional[RGBA]:
    match = _HEX.search(text)
    if not match:
        return None
    digits = match.group(1)
    if len(digits) in (3, 4):
        digits = "".join(ch * 2 for ch in digits)
    values = [int(digits[i:i + 2], 16) / 255 for i in range(0, len(digits), 2)]
    return RGBA(*values)


def _read_argb(text: str) -> Optional[RGBA]:
    match = _ARGB.search(text)
    if not match:
        return None
    digits = match.group(1)
    alpha = int(digits[:2], 16) / 255 if len(digits) == 8 else 1.0
    rgb = digits[-6:]
    return RGBA(int(rgb[0:2], 16) / 255, int(rgb[2:4], 16) / 255, int(rgb[4:6], 16) / 255, alpha)


def _read_css_function(text: str) -> Optional[RGBA]:
    match = _CSS_FUNCTION.search(text)
    if not match:
        return None
    name = match.group(1).lower()
    args = [part for part in re.split(r"[\s,/]+", match.group(2).strip()) if part]
    alpha = _fraction(args[3], 1) if len(args) > 3 else 1.0
    if name.startswith("rgb"):
        return RGBA(_fraction(args[0], 255), _fraction(args[1], 255), _fraction(args[2], 255), alpha)
    if name.startswith("hsl"):
        hue = float(re.sub(r"deg$", "", args[0])) % 360 / 360
        r, g, b = colorsys.hls_to_rgb(hue, _fraction(args[2], 100), _fraction(args[1], 100))
        return RGBA(r, g, b, alpha)
    lightness = _fraction(args[0], 1)
    if name == "oklab":
        return _from_oklab(lightness, _chroma(args[1]), _chroma(args[2]), alpha)
    hue = math.radians(float(re.sub(r"deg$", "", args[2])))
    return _from_oklab(lightness, _chroma(args[1]) * math.cos(hue), _chroma(args[1]) * math.sin(hue), alpha)


def _chroma(token: str) -> float:
    return float(token[:-1]) / 100 * _OKLCH_FULL_CHROMA if token.endswith("%") else float(token)


def _read_from_ints(text: str) -> Optional[RGBA]:
    """Flutter: `Color.fromRGBO(r, g, b, opacity)` and `Color.fromARGB(a, r, g, b)`."""
    match = _FROM_INTS.search(text)
    if not match:
        return None
    args = [_number(part) for part in match.group(2).split(",") if part.strip()]
    if match.group(1) == "RGBO":
        return RGBA(args[0] / 255, args[1] / 255, args[2] / 255, args[3])
    return RGBA(args[1] / 255, args[2] / 255, args[3] / 255, args[0] / 255)


def _read_constructor(text: str) -> Optional[RGBA]:
    """Swift `Color(red:green:blue:opacity:)` and `Color(white:)`, Godot `Color(r, g, b, a)` and `Color8`."""
    match = _CONSTRUCTOR.search(text)
    if not match:
        return None
    quoted = re.fullmatch(r"\s*[\"']#?([0-9a-fA-F]{3,8})[\"']\s*", match.group(2))
    if quoted:  # Godot `Color("e4ad55")`: a hex string, with or without the `#`
        return _read_hex("#" + quoted.group(1))
    labelled: Dict[str, float] = {}
    positional: List[float] = []
    for part in match.group(2).split(","):
        part = part.strip()
        if not part or part.startswith("."):  # `.sRGB`, `.displayP3`
            continue
        label = _LABEL.match(part)
        if label:
            labelled[label.group(1).lower()] = _number(part[label.end():])
        else:
            positional.append(_number(part))
    alpha = labelled.get("opacity", labelled.get("alpha", positional[3] if len(positional) > 3 else 1.0))
    if "white" in labelled:
        return RGBA(labelled["white"], labelled["white"], labelled["white"], alpha)
    if {"red", "green", "blue"} <= set(labelled):
        channels = [labelled["red"], labelled["green"], labelled["blue"]]
    elif len(positional) >= 3:
        channels = positional[:3]
    else:
        return None
    if match.group(1) or max(channels) > 1:  # Color8, or 0..255 written without a divisor
        channels = [value / 255 for value in channels]
        alpha = alpha / 255 if alpha > 1 else alpha
    return RGBA(channels[0], channels[1], channels[2], alpha)


def _read_named(text: str) -> Optional[RGBA]:
    word = text.strip().strip("'\"").lower()
    if word == "transparent":
        return RGBA(0.0, 0.0, 0.0, 0.0)
    return _read_hex(NAMED[word]) if word in NAMED else None
