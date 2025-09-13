export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function normalizeValue(value: number, min: number, max: number): number {
  return clamp((value - min) / (max - min), 0, 1);
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

export function movingAverage(values: number[], windowSize: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    result.push(average(window));
  }
  return result;
}

export function interpolate(x: number, x0: number, y0: number, x1: number, y1: number): number {
  if (x1 === x0) return y0;
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

// Convert geographic coordinates to canvas coordinates
export function geoToCanvas(
  lat: number,
  lon: number,
  width: number,
  height: number
): { x: number; y: number } {
  // Simple equirectangular projection
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

// Convert geographic coordinates to canvas coordinates with custom bounds
export function geoToCanvasBounds(
  lat: number,
  lon: number,
  width: number,
  height: number,
  latMin: number,
  latMax: number,
  lonMin: number,
  lonMax: number
): { x: number; y: number } {
  // Map longitude to x coordinate
  const x = ((lon - lonMin) / (lonMax - lonMin)) * width;
  // Map latitude to y coordinate (inverted because canvas y increases downward)
  const y = ((latMax - lat) / (latMax - latMin)) * height;
  return { x: clamp(x, 0, width), y: clamp(y, 0, height) };
}
