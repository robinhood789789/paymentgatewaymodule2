import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';
import { generateTOTPSecret, getTOTPQRCodeUrl } from "../_shared/totp.ts";

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

    console.log(`[MFA Enroll] User ${user.email} enrolling in 2FA`);

    // Generate TOTP secret
    const secret = generateTOTPSecret();
    const otpauthUrl = getTOTPQRCodeUrl(secret, user.email!, 'Payment Platform');

    // Store temporary secret (not yet verified)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        totp_secret: secret,
        // Don't enable yet, wait for verification
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[MFA Enroll] Error storing secret:', updateError);
      throw updateError;
    }

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        actor_user_id: user.id,
        action: 'mfa.enroll.initiated',
        target: `user:${user.id}`,
        tenant_id: null,
      });

    return new Response(
      JSON.stringify({ 
        secret,
        otpauthUrl,
        message: 'Scan the QR code with your authenticator app'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[MFA Enroll] Error:', error);
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
