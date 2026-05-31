// Shared types for the mobile app. Mirrors the Supabase schema in
// supabase/migrations/20260531120000_event_engine.sql.

export type Comparator = 'gte' | 'lte';

export interface EventMetric {
  key: string;
  label: string;
  unit: string | null;
  direction: 'above' | 'below' | 'either';
}

export interface AlertRule {
  id: string;
  user_id: string;
  metric_key: string;
  comparator: Comparator;
  threshold: number;
  sustain_min: number;
  cooldown_min: number;
  quiet_start: string | null;
  quiet_end: string | null;
  enabled: boolean;
  is_preset: boolean;
  label: string | null;
  created_at: string;
  updated_at: string;
}

// Draft used by the rule editor before it has been persisted.
export type AlertRuleDraft = Pick<
  AlertRule,
  'metric_key' | 'comparator' | 'threshold' | 'sustain_min' | 'cooldown_min' | 'enabled' | 'label'
>;

export interface AlertLogEntry {
  id: string;
  rule_id: string | null;
  alert_type: string;
  payload: Record<string, unknown> | null;
  sent_at: string;
}

export interface KpReading {
  timestamp: string;
  value: number;
}

export interface SolarWindReading {
  timestamp: string;
  bz: number | null;
  speed: number | null;
  density: number | null;
}
