import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { requireStepUp } from "../_shared/mfa-guards.ts";
import { encrypt, generateSecret } from "../_shared/encryption.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant',
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

    const tenantId = req.headers.get('x-tenant');
    if (!tenantId) {
      throw new Error('Missing tenant ID');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's membership and role
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role_id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (membershipError || !membership) {
      throw new Error('User not member of tenant');
    }

    // Get role name
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('name')
      .eq('id', membership.role_id)
      .single();

    if (roleError || !role) {
      throw new Error('Role not found');
    }

    // Verify user has webhooks.manage permission
    const { data: permissions, error: permError } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', membership.role_id);

    if (permError || !permissions) {
      throw new Error('Failed to check permissions');
    }

    const permissionIds = permissions.map(p => p.permission_id);
    const { data: perms, error: permsError } = await supabase
      .from('permissions')
      .select('name')
      .in('id', permissionIds);

    if (permsError || !perms || !perms.some(p => p.name === 'webhooks.manage')) {
      throw new Error('Insufficient permissions');
    }

    // Require MFA step-up for webhook secret rotation
    const stepUpCheck = await requireStepUp({
      supabase,
      userId: user.id,
      tenantId,
      action: 'webhooks',
      userRole: role.name,
      isSuperAdmin: false
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

    const { webhook_id } = await req.json();
    if (!webhook_id) {
      throw new Error('Missing webhook_id');
    }

    // Get the webhook to verify ownership
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhook_id)
      .eq('tenant_id', tenantId)
      .single();

    if (webhookError || !webhook) {
      throw new Error('Webhook not found or access denied');
    }

    // Generate new secret and encrypt it
    const newSecret = generateSecret(32);
    const encryptedSecret = await encrypt(newSecret);

    // Update webhook with new encrypted secret
    const { error: updateError } = await supabase
      .from('webhooks')
      .update({ 
        secret: encryptedSecret,
        updated_at: new Date().toISOString()
      })
      .eq('id', webhook_id);

    if (updateError) {
      console.error('[Webhook Rotate] Update error:', updateError);
      throw updateError;
    }

    // Create audit log (never log plaintext secrets)
    await supabase
      .from('audit_logs')
      .insert({
        actor_user_id: user.id,
        action: 'webhook.secret_rotated',
        target: `webhook:${webhook_id}`,
        tenant_id: tenantId,
        before: { 
          webhook_id: webhook.id,
          url: webhook.url, 
          enabled: webhook.enabled,
          created_at: webhook.created_at
        },
        after: { 
          webhook_id: webhook.id,
          url: webhook.url, 
          rotated_at: new Date().toISOString() 
        },
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        user_agent: req.headers.get('user-agent'),
      });

    console.log(`[Webhook Rotate] Secret rotated for webhook ${webhook_id} by user ${user.email}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        new_secret: newSecret, // Plain text for user to save (only time visible)
        message: 'Webhook secret rotated successfully',
        warning: 'Save this secret now. It is encrypted at rest and cannot be retrieved later.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Webhook Rotate] Error:', error);
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