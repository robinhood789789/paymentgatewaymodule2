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

    // Require MFA step-up
    const stepUpCheck = await requireStepUp({
      supabase,
      userId: user.id,
      tenantId: null,
      action: 'tenant-provider-assignment',
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

    const { tenant_id, provider, mode } = await req.json();
    
    if (!tenant_id || !provider || !mode) {
      throw new Error('Missing required fields');
    }

    // Validate provider and mode
    const validProviders = ['stripe', 'opn', 'twoc2p', 'kbank'];
    const validModes = ['test', 'live'];
    
    if (!validProviders.includes(provider) || !validModes.includes(mode)) {
      throw new Error('Invalid provider or mode');
    }

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      throw new Error('Tenant not found');
    }

    // Verify platform credentials exist for this provider/mode
    const { data: platformCreds, error: credsError } = await supabase
      .from('platform_provider_credentials')
      .select('id')
      .eq('provider', provider)
      .eq('mode', mode)
      .single();

    if (credsError || !platformCreds) {
      throw new Error(`Platform credentials not configured for ${provider} ${mode}`);
    }

    // Get existing assignment for audit log
    const { data: existing } = await supabase
      .from('tenant_provider_assignments')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single();

    // Upsert assignment
    const { data: assignment, error: assignError } = await supabase
      .from('tenant_provider_assignments')
      .upsert({
        tenant_id,
        provider,
        mode,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id'
      })
      .select()
      .single();

    if (assignError) {
      console.error('[Tenant Provider Assignment] Error:', assignError);
      throw assignError;
    }

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        actor_user_id: user.id,
        action: existing ? 'tenant.provider_reassigned' : 'tenant.provider_assigned',
        target: `tenant:${tenant_id}`,
        tenant_id: tenant_id,
        before: existing ? {
          provider: existing.provider,
          mode: existing.mode,
        } : null,
        after: {
          provider: assignment.provider,
          mode: assignment.mode,
        },
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
      });

    console.log(`[Tenant Provider] Assigned ${provider} ${mode} to tenant ${tenant.name} by ${user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        assignment,
        message: `Provider ${existing ? 'updated' : 'assigned'} successfully`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Tenant Provider Assignment] Error:', error);
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