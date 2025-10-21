import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { verifyTOTP, hashCode } from "../_shared/totp.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { code, type = 'totp' } = await req.json();
    if (!code) {
      throw new Error('Verification code required to disable 2FA');
    }

    console.log(`[MFA Disable] User ${user.email} attempting to disable 2FA with ${type}`);

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('totp_secret, totp_backup_codes, totp_enabled')
      .eq('id', user.id)
      .single();

    if (!profile?.totp_enabled) {
      throw new Error('Two-factor authentication is not enabled');
    }

    let isValid = false;

    if (type === 'totp' && code.length === 6) {
      // Verify TOTP code
      isValid = await verifyTOTP(profile.totp_secret || '', code);
    } else if (type === 'recovery' || code.includes('-')) {
      // Verify recovery code
      const cleanCode = code.toUpperCase().replace(/-/g, '');
      const hashedInput = await hashCode(cleanCode);
      const backupCodes = profile.totp_backup_codes || [];
      
      if (backupCodes.indexOf(hashedInput) !== -1) {
        isValid = true;
      }
    }

    if (!isValid) {
      // Create audit log for failed attempt
      await supabase
        .from('audit_logs')
        .insert({
          actor_user_id: user.id,
          action: 'mfa.disable.failed',
          target: `user:${user.id}`,
          tenant_id: null,
        });

      throw new Error('Invalid verification code');
    }

    // Disable 2FA
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        totp_enabled: false,
        totp_secret: null,
        totp_backup_codes: null,
        mfa_last_verified_at: null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[MFA Disable] Error updating profile:', updateError);
      throw updateError;
    }

    // Create audit log for successful disable
    await supabase
      .from('audit_logs')
      .insert({
        actor_user_id: user.id,
        action: 'mfa.disabled',
        target: `user:${user.id}`,
        tenant_id: null,
      });

    return new Response(
      JSON.stringify({ 
        ok: true,
        message: 'Two-factor authentication disabled successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[MFA Disable] Error:', error);
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
