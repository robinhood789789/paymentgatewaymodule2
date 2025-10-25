import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";
import { requireStepUp, createMfaError } from "../_shared/mfa-guards.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant',
};

// Generate a random API key with prefix
const generateApiKey = (): { prefix: string; secret: string; fullKey: string } => {
  const prefix = 'sk_live';
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const secret = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return {
    prefix,
    secret,
    fullKey: `${prefix}_${secret}`
  };
};

// Hash the secret for storage
const hashSecret = async (secret: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tenant from header
    const tenantId = req.headers.get('x-tenant');
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'X-Tenant header required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has permission
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has api_keys:manage permission
    const { data: membership } = await supabase
      .from('memberships')
      .select(`
        role_id,
        roles!inner (
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'Not a member of this tenant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roleName = (membership.roles as any)?.name;
    const allowedRoles = ['owner', 'developer', 'merchant_admin'];
    
    if (!allowedRoles.includes(roleName)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Required: owner, developer, or merchant_admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MFA Step-up check
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    const mfaCheck = await requireStepUp({
      supabase,
      userId: user.id,
      tenantId,
      action: 'api-keys',
      userRole: roleName,
      isSuperAdmin: profile?.is_super_admin || false,
    });

    if (!mfaCheck.ok) {
      return createMfaError(mfaCheck.code!, mfaCheck.message!);
    }

    // Parse request body
    const { name } = await req.json();
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate API key
    const { prefix, secret, fullKey } = generateApiKey();
    const hashedSecret = await hashSecret(secret);

    console.log('Creating API key:', { name, prefix, tenantId });

    // Store in database
    const { data: apiKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        tenant_id: tenantId,
        name: name.trim(),
        prefix: fullKey,
        hashed_secret: hashedSecret
      })
      .select('id, name, prefix, created_at')
      .single();

    if (insertError) {
      console.error('Error creating API key:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create API key', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      tenant_id: tenantId,
      actor_user_id: user.id,
      action: 'api_key.created',
      target: `api_key:${apiKey.id}`,
      after: {
        api_key_id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix
      }
    });

    console.log('API key created successfully:', apiKey.id);

    return new Response(
      JSON.stringify({
        success: true,
        api_key: {
          id: apiKey.id,
          name: apiKey.name,
          prefix: apiKey.prefix,
          created_at: apiKey.created_at,
          // Return full key only once
          secret: fullKey
        },
        warning: 'Save this API key now. You will not be able to see it again.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
