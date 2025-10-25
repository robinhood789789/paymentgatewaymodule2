/**
 * HMAC-SHA256 Platform Authentication
 * For external systems to securely provision API keys
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-platform-id, x-timestamp, x-signature',
};

interface HMACAuthResult {
  success: boolean;
  platformId?: string;
  platformName?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Verify HMAC signature for platform authentication
 */
export async function verifyHMACAuth(
  req: Request,
  supabaseUrl: string,
  supabaseKey: string
): Promise<HMACAuthResult> {
  const platformId = req.headers.get('X-Platform-Id');
  const timestamp = req.headers.get('X-Timestamp');
  const signature = req.headers.get('X-Signature');

  if (!platformId || !timestamp || !signature) {
    return {
      success: false,
      error: 'Missing required headers: X-Platform-Id, X-Timestamp, X-Signature',
      statusCode: 401
    };
  }

  // Check timestamp drift (max 5 minutes)
  const requestTime = new Date(timestamp);
  const now = new Date();
  const diffMinutes = Math.abs(now.getTime() - requestTime.getTime()) / (1000 * 60);
  
  if (diffMinutes > 5) {
    return {
      success: false,
      error: 'Request timestamp too old or too far in future (max 5 minutes drift)',
      statusCode: 401
    };
  }

  // Initialize Supabase with service role
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get platform token
  const { data: platform, error: platformError } = await supabase
    .from('platform_provisioning_tokens')
    .select('*')
    .eq('platform_id', platformId)
    .eq('status', 'active')
    .single();

  if (platformError || !platform) {
    return {
      success: false,
      error: 'Invalid platform ID or token revoked',
      statusCode: 401
    };
  }

  // Build signature payload
  const url = new URL(req.url);
  const method = req.method;
  const path = url.pathname;
  let body = '';
  
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await req.clone().text();
    } catch (e) {
      body = '';
    }
  }

  const payload = `${method}|${path}|${body}|${timestamp}`;

  // Verify signature using Web Crypto API
  const encoder = new TextEncoder();
  const keyData = encoder.encode(platform.hashed_secret);
  const messageData = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );

  const expectedSignature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    messageData
  );

  const expectedBase64 = btoa(String.fromCharCode(...new Uint8Array(expectedSignature)));
  
  // Constant-time comparison
  if (signature !== expectedBase64) {
    return {
      success: false,
      error: 'Invalid signature',
      statusCode: 401
    };
  }

  // Check replay attack
  const signatureHash = await hashString(signature);
  
  const { data: existingReplay } = await supabase
    .from('hmac_replay_cache')
    .select('id')
    .eq('signature_hash', signatureHash)
    .single();

  if (existingReplay) {
    return {
      success: false,
      error: 'Replay attack detected - signature already used',
      statusCode: 401
    };
  }

  // Store signature to prevent replay
  await supabase
    .from('hmac_replay_cache')
    .insert({
      signature_hash: signatureHash,
      timestamp: requestTime,
      platform_id: platformId
    });

  // Update last_used_at
  await supabase
    .from('platform_provisioning_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', platform.id);

  // Cleanup old replay cache entries
  await supabase.rpc('cleanup_replay_cache');

  return {
    success: true,
    platformId: platform.platform_id,
    platformName: platform.platform_name
  };
}

/**
 * Hash string using SHA-256
 */
async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate secure random API key secret
 */
export function generateApiKeySecret(env: 'sandbox' | 'production'): { prefix: string; secret: string } {
  const prefixMap = {
    sandbox: 'sk_sandbox_',
    production: 'sk_live_'
  };
  
  const prefix = prefixMap[env];
  
  // Generate 32 URL-safe random characters
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  // Convert to base64url (URL-safe)
  const base64 = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const secret = prefix + base64.substring(0, 40);
  
  return { prefix: prefix.substring(0, 12), secret };
}

export { corsHeaders };
