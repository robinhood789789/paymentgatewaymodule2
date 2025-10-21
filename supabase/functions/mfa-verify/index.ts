import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { verifyTOTP, generateBackupCodes, hashCode } from "../_shared/totp.ts";

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

    const { code } = await req.json();
    if (!code || code.length !== 6) {
      throw new Error('Invalid verification code');
    }

    console.log(`[MFA Verify] User ${user.email} verifying 2FA`);

    // Get user's TOTP secret
    const { data: profile } = await supabase
      .from('profiles')
      .select('totp_secret')
      .eq('id', user.id)
      .single();

    if (!profile?.totp_secret) {
      throw new Error('TOTP secret not found. Please enroll first.');
    }

    // Verify the TOTP code
    const isValid = await verifyTOTP(profile.totp_secret, code);
    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    console.log(`[MFA Verify] Code verified for ${user.email}`);

    // Generate recovery codes
    const recoveryCodes = generateBackupCodes(10);
    const hashedCodes = await Promise.all(recoveryCodes.map(c => hashCode(c.replace(/-/g, ''))));

    // Enable 2FA and store recovery codes
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        totp_enabled: true,
        totp_backup_codes: hashedCodes,
        mfa_last_verified_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[MFA Verify] Error enabling 2FA:', updateError);
      throw updateError;
    }

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        actor_user_id: user.id,
        action: 'mfa.enabled',
        target: `user:${user.id}`,
        tenant_id: null,
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        recovery_codes: recoveryCodes,
        message: 'Two-factor authentication enabled successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[MFA Verify] Error:', error);
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
