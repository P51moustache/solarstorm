import type { OvationCell } from '../api/parsers/ovation';
import { COLORS } from '../util/colors';
import { clamp, normalizeValue } from '../util/math';

export interface HeatmapOptions {
  width: number;
  height: number;
  cellRadius?: number;
  minOpacity?: number;
  maxOpacity?: number;
  latMin?: number;
  latMax?: number;
  lonMin?: number;
  lonMax?: number;
}

export interface HeatmapCircle {
  x: number;
  y: number;
  r: number;
  color: string;
}

/**
 * Pre-calculate circle positions and colors for declarative rendering.
 * This avoids imperative Skia.Surface APIs that don't work on web.
 */
export function calculateHeatmapCircles(
  cells: OvationCell[],
  options: HeatmapOptions
): HeatmapCircle[] {
  const {
    width,
    height,
    cellRadius = 4,
    minOpacity = 0.15,
    maxOpacity = 0.9,
    latMin = 45,
    latMax = 90,
    lonMin = -180,
    lonMax = 180,
  } = options;

  const circles: HeatmapCircle[] = [];

  for (const cell of cells) {
    if (cell.prob <= 0) continue;
    if (cell.lat < latMin || cell.lat > latMax) continue;

    const { x, y } = geoToCanvasBounds(cell.lat, cell.lon, width, height, latMin, latMax, lonMin, lonMax);
    const p = clamp(normalizeValue(cell.prob, 0, 100), 0, 1);
    const opacity = clamp(minOpacity + Math.pow(p, 1.2) * (maxOpacity - minOpacity), minOpacity, maxOpacity);

    const hex = getGradientColor(p);
    const alpha = Math.floor(opacity * 255).toString(16).padStart(2, '0');

    // Slightly scale radius with probability for presence
    const r = cellRadius * (0.8 + p * 0.6);

    circles.push({ x, y, r, color: hex + alpha });
  }

  return circles;
}


// ------- helpers -------
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const s = hex.replace('#', '');
  const r = parseInt(s.substring(0, 2), 16);
  const g = parseInt(s.substring(2, 4), 16);
  const b = parseInt(s.substring(4, 6), 16);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const hr = clamp(Math.round(r), 0, 255).toString(16).padStart(2, '0');
  const hg = clamp(Math.round(g), 0, 255).toString(16).padStart(2, '0');
  const hb = clamp(Math.round(b), 0, 255).toString(16).padStart(2, '0');
  return `#${hr}${hg}${hb}`;
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = ca.r + (cb.r - ca.r) * t;
  const g = ca.g + (cb.g - ca.g) * t;
  const bl = ca.b + (cb.b - ca.b) * t;
  return rgbToHex(r, g, bl);
}

// Gradient mapping 0..1 probability to color ramp
function getGradientColor(p: number): string {
  const stops = [
    { t: 0.0, c: COLORS.aurora.low },
    { t: 0.25, c: COLORS.aurora.medium },
    { t: 0.6, c: COLORS.aurora.high },
    { t: 0.85, c: COLORS.aurora.extreme },
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const s0 = stops[i];
    const s1 = stops[i + 1];
    if (p >= s0.t && p <= s1.t) {
      const tt = (p - s0.t) / (s1.t - s0.t);
      return lerpColor(s0.c, s1.c, tt);
    }
  }
  return p < stops[0].t ? stops[0].c : stops[stops.length - 1].c;
}

// Map geographic coordinates to canvas coordinates within provided bounds
function geoToCanvasBounds(
  lat: number,
  lon: number,
  width: number,
  height: number,
  latMin: number,
  latMax: number,
  lonMin: number,
  lonMax: number
): { x: number; y: number } {
  // Normalize longitude wrapping to the provided domain
  let lonNorm = lon;
  // Wrap to [-180, 180] first
  while (lonNorm < -180) lonNorm += 360;
  while (lonNorm > 180) lonNorm -= 360;

  // Then linearly map [lonMin, lonMax] -> [0, width]
  const x = ((lonNorm - lonMin) / (lonMax - lonMin)) * width;
  // Map [latMin, latMax] -> [height, 0] (y downwards)
  const y = ((latMax - lat) / (latMax - latMin)) * height;
  return { x: clamp(x, 0, width), y: clamp(y, 0, height) };
}
