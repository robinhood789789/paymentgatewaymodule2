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
      return new Response(JSON.stringify({ error: 'Cannot rotate revoked API key' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate new secret (keep same env)
    const { prefix, secret } = generateApiKeySecret(existingKey.env);
    const hashedSecret = await bcryptHash(secret);

    // Update notes with rotation history
    const currentNotes = existingKey.notes || '';
    const rotationNote = `\n[Rotated ${new Date().toISOString()} by platform:${authResult.platformId}]`;
    const newNotes = currentNotes + rotationNote;

    // Update API key with new secret
    const { data: updatedKey, error: updateError } = await supabase
      .from('api_keys')
      .update({
        prefix,
        hashed_secret: hashedSecret,
        notes: newNotes,
        last_used_at: null // Reset usage tracking
      })
      .eq('id', key_id)
      .select()
      .single();

    if (updateError) {
      console.error('[Ext API Key Rotate] Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to rotate API key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      tenant_id,
      actor_user_id: null,
      action: 'api_keys.rotated',
      target: `api_key:${key_id}`,
      before: { prefix: existingKey.prefix },
      after: { prefix: updatedKey.prefix, platform: authResult.platformId },
      ip: req.headers.get('x-forwarded-for')?.substring(0, 15) || null,
      user_agent: `Platform:${authResult.platformName}`
    });

    console.log(`[Ext API Key Rotate] Rotated key ${key_id} for tenant ${tenant_id} by platform ${authResult.platformId}`);

    // Return new secret (show only once)
    return new Response(JSON.stringify({
      id: updatedKey.id,
      tenant_id: updatedKey.tenant_id,
      name: updatedKey.name,
      prefix: updatedKey.prefix,
      secret, // NEW SECRET - SHOW ONLY ONCE
      scope: updatedKey.scope,
      env: updatedKey.env,
      status: updatedKey.status,
      ip_allowlist: updatedKey.ip_allowlist,
      expires_at: updatedKey.expires_at,
      rotated_at: new Date().toISOString(),
      notes: updatedKey.notes
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Ext API Key Rotate] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
