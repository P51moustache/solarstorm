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
  const dataType = url.searchParams.get('type') || 'tec';
  const format = url.searchParams.get('format') || 'json';
  const startDate = url.searchParams.get('start') || new Date(Date.now() - 24*60*60*1000).toISOString();
  const endDate = url.searchParams.get('end') || new Date().toISOString();

  let data: Record<string, unknown>[];
  let filename: string;

  if (dataType === 'tec') {
    const { data: tecData, error } = await supabase
      .from('tec_history')
      .select(`*, gnss_regions!inner (label, center_lat, center_lng, user_id)`)
      .eq('gnss_regions.user_id', profile.id)
      .gte('recorded_at', startDate)
      .lte('recorded_at', endDate)
      .order('recorded_at', { ascending: true });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    data = (tecData || []) as Record<string, unknown>[];
    filename = 'tec_data';
  } else if (dataType === 'scintillation') {
    const { data: scintData, error } = await supabase
      .from('scintillation_history')
      .select(`*, gnss_regions!inner (label, center_lat, center_lng, user_id)`)
      .eq('gnss_regions.user_id', profile.id)
      .gte('recorded_at', startDate)
      .lte('recorded_at', endDate)
      .order('recorded_at', { ascending: true });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    data = (scintData || []) as Record<string, unknown>[];
    filename = 'scintillation_data';
  } else if (dataType === 'constellation') {
    const { data: constData, error } = await supabase
      .from('gnss_constellation_status')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: true });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    data = (constData || []) as Record<string, unknown>[];
    filename = 'constellation_status';
  } else {
    return new Response(
      JSON.stringify({ error: 'Invalid data type. Use: tec, scintillation, constellation' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (format === 'csv') {
    const csv = convertToCSV(data);
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  }

  return new Response(
    JSON.stringify({ data, count: data.length, dataType, startDate, endDate }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]).filter(k => k !== 'gnss_regions');
  const rows = data.map(row =>
    headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
