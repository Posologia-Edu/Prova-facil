const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  const expectedKey = Deno.env.get('HUB_METRICS_KEY');
  
  if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

  // AI usage metrics (last 30 days)
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data: aiLogs } = await supabase
    .from('ai_usage_log')
    .select('tokens_input, tokens_output, estimated_cost_usd')
    .gte('created_at', since.toISOString());

  const ai_requests = aiLogs?.length ?? 0;
  const ai_tokens_used = aiLogs?.reduce((sum: number, r: any) => sum + (r.tokens_input ?? 0) + (r.tokens_output ?? 0), 0) ?? 0;
  const ai_cost_usd = aiLogs?.reduce((sum: number, r: any) => sum + Number(r.estimated_cost_usd ?? 0), 0) ?? 0;

  return new Response(JSON.stringify({
    total_users: totalUsers || 0,
    active_users: 0,
    subscribers: 0,
    ai_requests,
    ai_tokens_used,
    ai_cost_usd,
    revenue_usd: 0,
    mrr_usd: 0,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
