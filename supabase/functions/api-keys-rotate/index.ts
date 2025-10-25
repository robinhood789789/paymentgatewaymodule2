import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { hash as bcryptHash } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { requireStepUp } from "../_shared/mfa-guards.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tenantId = req.headers.get('x-tenant');
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !tenantId) {
      return new Response(JSON.stringify({ error: 'Missing authorization or tenant header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check membership and role
    const { data: membership } = await supabase
      .from('memberships')
      .select('role_id, roles(name)')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Not a member of this tenant' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const roleName = (membership as any).roles?.name;
    if (!['owner', 'developer', 'admin'].includes(roleName)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Require MFA step-up
    const mfaCheck = await requireStepUp({
      supabase,
      userId: user.id,
      tenantId,
      action: 'api-keys'
    });

    if (!mfaCheck.ok) {
      return new Response(JSON.stringify({ 
        error: mfaCheck.message,
        code: mfaCheck.code
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { api_key_id } = await req.json();

    if (!api_key_id) {
      return new Response(JSON.stringify({ error: 'api_key_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get existing key
    const { data: existingKey, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', api_key_id)
      .eq('tenant_id', tenantId)
      .single();

    if (keyError || !existingKey) {
      return new Response(JSON.stringify({ error: 'API key not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (existingKey.status === 'revoked') {
      return new Response(JSON.stringify({ error: 'Cannot rotate revoked key' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate new secret
    const env = existingKey.env || 'sandbox';
    const prefixMap: { [key: string]: string } = {
      sandbox: 'sk_sandbox_',
      production: 'sk_live_'
    };
    
    const prefix = prefixMap[env];
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    
    const base64 = btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const secret = prefix + base64.substring(0, 40);
    const hashedSecret = await bcryptHash(secret);

    // Update key
    const { data: updatedKey, error: updateError } = await supabase
      .from('api_keys')
      .update({
        prefix: prefix.substring(0, 12),
        hashed_secret: hashedSecret,
        last_used_at: null,
        notes: `${existingKey.notes || ''}\n[Rotated ${new Date().toISOString()}]`
      })
      .eq('id', api_key_id)
      .select()
      .single();

    if (updateError) {
      console.error('[API Key Rotate] Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to rotate API key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      tenant_id: tenantId,
      actor_user_id: user.id,
      action: 'api_keys.rotated',
      target: `api_key:${api_key_id}`,
      before: { prefix: existingKey.prefix },
      after: { prefix: updatedKey.prefix },
      ip: req.headers.get('x-forwarded-for')?.substring(0, 15) || null,
      user_agent: req.headers.get('user-agent')?.substring(0, 255) || null
    });

    console.log(`[API Key Rotate] Rotated key ${api_key_id} by ${user.email}`);

    return new Response(JSON.stringify({
      id: updatedKey.id,
      name: updatedKey.name,
      prefix: updatedKey.prefix,
      secret, // NEW SECRET - SHOW ONLY ONCE
      scope: updatedKey.scope,
      env: updatedKey.env,
      expires_at: updatedKey.expires_at,
      rotated_at: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API Key Rotate] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
