import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify user is super admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_super_admin) {
      throw new Error('Super admin access required');
    }

    // Require MFA step-up for super admin credential operations
    const stepUpCheck = await requireStepUp({
      supabase,
      userId: user.id,
      tenantId: null,
      action: 'platform-credentials',
      userRole: 'super_admin',
      isSuperAdmin: true
    });

    if (!stepUpCheck.ok) {
      return new Response(
        JSON.stringify({ 
          error: stepUpCheck.message,
          code: stepUpCheck.code 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    const { provider, mode, credentials } = await req.json();
    
    if (!provider || !mode || !credentials) {
      throw new Error('Missing required fields');
    }

    // Validate provider and mode
    const validProviders = ['stripe', 'opn', 'twoc2p', 'kbank'];
    const validModes = ['test', 'live'];
    
    if (!validProviders.includes(provider) || !validModes.includes(mode)) {
      throw new Error('Invalid provider or mode');
    }

    // Get existing credentials for audit log
    const { data: existing } = await supabase
      .from('platform_provider_credentials')
      .select('*')
      .eq('provider', provider)
      .eq('mode', mode)
      .single();

    // Upsert platform credentials
    const { data: updated, error: updateError } = await supabase
      .from('platform_provider_credentials')
      .upsert({
        provider,
        mode,
        public_key: credentials.public_key || null,
        secret_key: credentials.secret_key || null,
        merchant_id: credentials.merchant_id || null,
        webhook_secret: credentials.webhook_secret || null,
        feature_flags: credentials.feature_flags || {},
        created_by: existing ? existing.created_by : user.id,
        last_rotated_at: existing ? new Date().toISOString() : null,
      }, {
        onConflict: 'provider,mode'
      })
      .select()
      .single();

    if (updateError) {
      console.error('[Platform Credentials] Update error:', updateError);
      throw updateError;
    }

    // Create audit log with masked credentials
    const maskValue = (value: string | null) => {
      if (!value) return null;
      return value.substring(0, 8) + '***';
    };

    await supabase
      .from('audit_logs')
      .insert({
        actor_user_id: user.id,
        action: existing ? 'platform.credentials_updated' : 'platform.credentials_created',
        target: `platform-credentials:${provider}:${mode}`,
        tenant_id: null,
        before: existing ? {
          provider: existing.provider,
          mode: existing.mode,
          public_key_prefix: maskValue(existing.public_key),
          secret_key_prefix: maskValue(existing.secret_key),
          merchant_id: existing.merchant_id,
        } : null,
        after: {
          provider: updated.provider,
          mode: updated.mode,
          public_key_prefix: maskValue(updated.public_key),
          secret_key_prefix: maskValue(updated.secret_key),
          merchant_id: updated.merchant_id,
        },
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
      });

    console.log(`[Platform Credentials] ${existing ? 'Updated' : 'Created'} ${provider} ${mode} credentials by ${user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        credentials: {
          ...updated,
          secret_key: undefined, // Never return secret key
          webhook_secret: undefined, // Never return webhook secret
        },
        message: `Platform credentials ${existing ? 'updated' : 'created'} successfully`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Platform Credentials] Error:', error);
    const message = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});