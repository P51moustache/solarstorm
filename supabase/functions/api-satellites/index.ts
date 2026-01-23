import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Validate API key and check Pro tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tier')
    .eq('api_key', apiKey)
    .single();

  if (!profile || profile.tier === 'free') {
    return new Response(
      JSON.stringify({ error: 'Valid Pro API key required' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'json';

  // Get user's satellites with current risk assessment
  const { data: satellites, error } = await supabase
    .from('satellites')
    .select('*')
    .eq('user_id', profile.id);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (format === 'csv') {
    const csv = convertToCSV(satellites || []);
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="satellites.csv"',
      },
    });
  }

  return new Response(
    JSON.stringify({ satellites, count: satellites?.length || 0 }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
