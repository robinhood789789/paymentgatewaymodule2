import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { verifyHMACAuth, corsHeaders } from "../_shared/hmac-auth.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify HMAC authentication
    const authResult = await verifyHMACAuth(req, supabaseUrl, supabaseKey);
    
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.statusCode || 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract tenant_id and key_id from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const tenantIdIndex = pathParts.indexOf('tenants') + 1;
    const keyIdIndex = pathParts.indexOf('api-keys') + 1;
    const tenant_id = pathParts[tenantIdIndex];
    const key_id = pathParts[keyIdIndex];

    if (!tenant_id || !key_id) {
      return new Response(JSON.stringify({ error: 'Missing tenant_id or key_id in URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get existing API key
    const { data: existingKey, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', key_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (keyError || !existingKey) {
      return new Response(JSON.stringify({ error: 'API key not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (existingKey.status === 'revoked') {
      return new Response(JSON.stringify({ error: 'API key already revoked' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Revoke API key
    const { data: revokedKey, error: updateError } = await supabase
      .from('api_keys')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString()
      })
      .eq('id', key_id)
      .select()
      .single();

    if (updateError) {
      console.error('[Ext API Key Revoke] Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to revoke API key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      tenant_id,
      actor_user_id: null,
      action: 'api_keys.revoked',
      target: `api_key:${key_id}`,
      before: { status: existingKey.status },
      after: { status: 'revoked', revoked_at: revokedKey.revoked_at, platform: authResult.platformId },
      ip: req.headers.get('x-forwarded-for')?.substring(0, 15) || null,
      user_agent: `Platform:${authResult.platformName}`
    });

    console.log(`[Ext API Key Revoke] Revoked key ${key_id} for tenant ${tenant_id} by platform ${authResult.platformId}`);

    return new Response(JSON.stringify({
      id: revokedKey.id,
      tenant_id: revokedKey.tenant_id,
      status: revokedKey.status,
      revoked_at: revokedKey.revoked_at
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Ext API Key Revoke] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
