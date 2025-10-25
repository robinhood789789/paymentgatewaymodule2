import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
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
    const mfaCheck = await requireStepUp(supabase, user.id, 'platform-tokens');
    if (!mfaCheck.allowed) {
      return new Response(JSON.stringify({ 
        error: mfaCheck.error,
        code: mfaCheck.code
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request
    const { platform_token_id } = await req.json();

    if (!platform_token_id) {
      return new Response(JSON.stringify({ error: 'platform_token_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get token before revocation
    const { data: tokenBefore } = await supabase
      .from('platform_provisioning_tokens')
      .select('*')
      .eq('id', platform_token_id)
      .single();

    if (!tokenBefore) {
      return new Response(JSON.stringify({ error: 'Platform token not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Revoke token
    const { data: token, error: updateError } = await supabase
      .from('platform_provisioning_tokens')
      .update({ 
        status: 'revoked',
        revoked_at: new Date().toISOString()
      })
      .eq('id', platform_token_id)
      .select()
      .single();

    if (updateError) {
      console.error('[Platform Token Revoke] Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to revoke platform token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_user_id: user.id,
      action: 'platform_token.revoked',
      target: `platform:${tokenBefore.platform_id}`,
      before: { status: tokenBefore.status },
      after: { status: 'revoked', revoked_at: token.revoked_at },
      ip: req.headers.get('x-forwarded-for')?.substring(0, 15) || null,
      user_agent: req.headers.get('user-agent')?.substring(0, 255) || null
    });

    console.log(`[Platform Token Revoke] Revoked token: ${tokenBefore.platform_id} by ${user.email}`);

    return new Response(JSON.stringify({
      id: token.id,
      platform_id: token.platform_id,
      status: token.status,
      revoked_at: token.revoked_at
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Platform Token Revoke] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
