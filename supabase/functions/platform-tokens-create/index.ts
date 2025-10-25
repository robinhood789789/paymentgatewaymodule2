import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { hash as bcryptHash } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { requireStepUp } from "../_shared/mfa-guards.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
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

    // Check if super admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      return new Response(JSON.stringify({ error: 'Super admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Require MFA step-up
    const mfaCheck = await requireStepUp({
      supabase,
      userId: user.id,
      action: 'platform-tokens' as any
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

    // Parse request
    const { platform_name, notes, ip_allowlist, allowed_tenants } = await req.json();

    if (!platform_name) {
      return new Response(JSON.stringify({ error: 'platform_name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate platform ID and secret
    const platform_id = `plat_${crypto.randomUUID().replace(/-/g, '').substring(0, 24)}`;
    
    // Generate secure secret (64 chars)
    const array = new Uint8Array(48);
    crypto.getRandomValues(array);
    const secret = btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .substring(0, 64);
    
    const platform_secret = `plat_secret_${secret}`;

    // Hash the secret (store hash, not plaintext)
    const hashedSecret = await bcryptHash(platform_secret);

    // Insert platform token
    const { data: token, error: insertError } = await supabase
      .from('platform_provisioning_tokens')
      .insert({
        platform_id,
        platform_name,
        hashed_secret: hashedSecret,
        created_by: user.id,
        notes,
        ip_allowlist: ip_allowlist || [],
        allowed_tenants: allowed_tenants || ['*']
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Platform Token Create] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create platform token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_user_id: user.id,
      action: 'platform_token.created',
      target: `platform:${platform_id}`,
      after: { platform_id, platform_name, status: 'active' },
      ip: req.headers.get('x-forwarded-for')?.substring(0, 15) || null,
      user_agent: req.headers.get('user-agent')?.substring(0, 255) || null
    });

    console.log(`[Platform Token Create] Created token: ${platform_id} by ${user.email}`);

    // Return token with secret (show only once)
    return new Response(JSON.stringify({
      id: token.id,
      platform_id: token.platform_id,
      platform_name: token.platform_name,
      secret: platform_secret, // SHOW ONLY ONCE
      status: token.status,
      created_at: token.created_at,
      ip_allowlist: token.ip_allowlist,
      allowed_tenants: token.allowed_tenants,
      notes: token.notes
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Platform Token Create] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
