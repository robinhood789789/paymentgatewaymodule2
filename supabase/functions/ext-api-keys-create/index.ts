import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { hash as bcryptHash } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { verifyHMACAuth, generateApiKeySecret, corsHeaders } from "../_shared/hmac-auth.ts";

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

    // Extract tenant_id from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const tenantIdIndex = pathParts.indexOf('tenants') + 1;
    const tenant_id = pathParts[tenantIdIndex];

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'Missing tenant_id in URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, status')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      return new Response(JSON.stringify({ error: 'Tenant not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (tenant.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Tenant is not active' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await req.json();
    const {
      name,
      scope = { endpoints: ['*'] },
      env = 'sandbox',
      ip_allowlist = [],
      expires_at,
      notes
    } = body;

    // Validate env
    if (!['sandbox', 'production'].includes(env)) {
      return new Response(JSON.stringify({ error: 'env must be "sandbox" or "production"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate API key
    const { prefix, secret } = generateApiKeySecret(env);
    const hashedSecret = await bcryptHash(secret);

    // Calculate expires_at if not provided (default 90 days)
    let expiresAt = expires_at;
    if (!expiresAt) {
      const date = new Date();
      date.setDate(date.getDate() + 90);
      expiresAt = date.toISOString();
    }

    // Insert API key
    const { data: apiKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        tenant_id,
        name: name || `External API Key (${authResult.platformName})`,
        prefix,
        hashed_secret: hashedSecret,
        scope,
        env,
        status: 'active',
        ip_allowlist,
        expires_at: expiresAt,
        notes: notes || `Created by platform: ${authResult.platformId}`
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Ext API Key Create] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create API key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      tenant_id,
      actor_user_id: null, // External system
      action: 'api_keys.created',
      target: `api_key:${apiKey.id}`,
      after: {
        id: apiKey.id,
        prefix,
        env,
        scope,
        platform: authResult.platformId
      },
      ip: req.headers.get('x-forwarded-for')?.substring(0, 15) || null,
      user_agent: `Platform:${authResult.platformName}`
    });

    console.log(`[Ext API Key Create] Created key for tenant ${tenant_id} by platform ${authResult.platformId}`);

    // Return API key with secret (show only once)
    return new Response(JSON.stringify({
      id: apiKey.id,
      tenant_id: apiKey.tenant_id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      secret, // SHOW ONLY ONCE
      scope: apiKey.scope,
      env: apiKey.env,
      status: apiKey.status,
      ip_allowlist: apiKey.ip_allowlist,
      expires_at: apiKey.expires_at,
      created_at: apiKey.created_at,
      notes: apiKey.notes
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Ext API Key Create] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
