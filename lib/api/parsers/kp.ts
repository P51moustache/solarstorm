import { z } from 'zod';

export const KpPointSchema = z.object({
  time_tag: z.string(),
  kp_index: z.number().nullable().optional(),
  estimated_kp: z.number().nullable().optional(),
});

export type KpPoint = z.infer<typeof KpPointSchema>;

export function parseKpData(data: unknown[]): { kp: number; at: string } | null {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  // Scan from end to find most recent valid value
  for (let i = data.length - 1; i >= 0; i--) {
    try {
      const parsed = KpPointSchema.parse(data[i]);
      const kp = parsed.estimated_kp ?? parsed.kp_index;
      if (kp !== null && kp !== undefined) {
        return { kp: Number(kp), at: parsed.time_tag };
      }
    } catch (error) {
      // Skip invalid shape and keep scanning
      continue;
    }
  }
  return null;
}

export function parseKpHistory(data: unknown[]): Array<{ kp: number; at: string }> {
  if (!Array.isArray(data)) {
    return [];
  }

  const results: Array<{ kp: number; at: string }> = [];

  for (const item of data) {
    try {
      const parsed = KpPointSchema.parse(item);
      const kp = parsed.estimated_kp ?? parsed.kp_index;
      
      if (kp !== null && kp !== undefined) {
        results.push({
          kp: Number(kp),
          at: parsed.time_tag,
        });
      }
    } catch (error) {
      // Skip invalid entries
      continue;
    }
  }

  return results;
}
