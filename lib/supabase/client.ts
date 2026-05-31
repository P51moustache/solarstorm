import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Do not throw at module load — that would crash `next build`/`next dev`
  // on every page (including static ones) whenever secrets are absent.
  // Fall back to empty strings so the app can build and render; any
  // data-dependent call will simply fail at request time and the UI can
  // show an empty state.
  console.warn(
    '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Supabase client created with empty credentials; data features will be unavailable.'
  );
}

export const supabase = createClient<Database>(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
