import { Skia, SkImage, BlendMode } from '@shopify/react-native-skia';
import type { OvationCell } from '../api/parsers/ovation';
import { COLORS } from '../util/colors';
import { clamp, geoToCanvas, normalizeValue } from '../util/math';

export interface HeatmapOptions {
  width: number;
  height: number;
  cellRadius?: number;
  blurRadius?: number;
  minOpacity?: number;
  maxOpacity?: number;
  latMin?: number;
  latMax?: number;
  lonMin?: number;
  lonMax?: number;
}

export function createAuroraHeatmap(
  cells: OvationCell[],
  options: HeatmapOptions
): SkImage | null {
  const {
    width,
    height,
    cellRadius = 4,
    blurRadius = 6,
    minOpacity = 0.15,
    maxOpacity = 0.9,
    latMin = 45,
    latMax = 90,
    lonMin = -180,
    lonMax = 180,
  } = options;

  try {
    // Create base surface
    const baseSurface = Skia.Surface.Make(width, height);
    if (!baseSurface) return null;
    const canvas = baseSurface.getCanvas();
    canvas.clear(Skia.Color('transparent'));

    // Paint with additive blending for accumulation
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(0); // Fill
    paint.setBlendMode(BlendMode.Plus);

    // Draw each cell (northern hemisphere by default)
    for (const cell of cells) {
      if (cell.prob <= 0) continue;
      if (cell.lat < latMin || cell.lat > latMax) continue;

      const { x, y } = geoToCanvasBounds(cell.lat, cell.lon, width, height, latMin, latMax, lonMin, lonMax);
      const p = clamp(normalizeValue(cell.prob, 0, 100), 0, 1);
      const opacity = clamp(minOpacity + Math.pow(p, 1.2) * (maxOpacity - minOpacity), minOpacity, maxOpacity);

      const hex = getGradientColor(p);
      const alpha = Math.floor(opacity * 255).toString(16).padStart(2, '0');
      paint.setColor(Skia.Color(hex + alpha));

      // Slightly scale radius with probability for presence
      const r = cellRadius * (0.8 + p * 0.6);
      canvas.drawCircle(x, y, r, paint);
    }

    let image = baseSurface.makeImageSnapshot();

    // Optional blur pass: draw the snapshot onto a new surface with blur filter
    if (blurRadius > 0) {
      const finalSurface = Skia.Surface.Make(width, height);
      if (!finalSurface) return image;
      const blurPaint = Skia.Paint();
      blurPaint.setImageFilter(Skia.ImageFilter.MakeBlur(blurRadius, blurRadius, 1, null));
      const c2 = finalSurface.getCanvas();
      c2.clear(Skia.Color('transparent'));
      c2.drawImage(image, 0, 0, blurPaint);
      image = finalSurface.makeImageSnapshot();
    }

    return image;
  } catch (error) {
    console.error('Failed to create aurora heatmap:', error);
    return null;
  }
}

export function createTestHeatmap(width: number, height: number): SkImage | null {
  try {
    const surface = Skia.Surface.Make(width, height);
    if (!surface) return null;

    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color('transparent'));

    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(0);

    // Create a simple gradient pattern for testing
    const gradient = Skia.Shader.MakeLinearGradient(
      { x: 0, y: 0 },
      { x: width, y: height },
      [
        Skia.Color(COLORS.aurora.low),
        Skia.Color(COLORS.aurora.medium),
        Skia.Color(COLORS.aurora.high),
      ],
      [0, 0.5, 1],
      0
    );

    paint.setShader(gradient);
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    return surface.makeImageSnapshot();
  } catch (error) {
    console.error('Failed to create test heatmap:', error);
    return null;
  }
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
