// API Key Authentication Middleware
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

interface ApiKeyAuthResult {
  success: boolean;
  tenantId?: string;
  apiKeyId?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Rate limit check for API key usage
 */
const checkRateLimit = async (
  supabase: SupabaseClient,
  identifier: string,
  endpoint: string,
  limit = 100,
  windowSeconds = 60
): Promise<boolean> => {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();
  
  // Clean up old entries
  await supabase
    .from('rate_limits')
    .delete()
    .lt('window_start', windowStart);
  
  // Get current count
  const { data: existing } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart)
    .single();
  
  if (existing && existing.count >= limit) {
    return false; // Rate limit exceeded
  }
  
  // Increment counter
  if (existing) {
    await supabase
      .from('rate_limits')
      .update({ count: existing.count + 1, updated_at: new Date().toISOString() })
      .eq('identifier', identifier)
      .eq('endpoint', endpoint);
  } else {
    await supabase
      .from('rate_limits')
      .insert({
        identifier,
        endpoint,
        count: 1,
        window_start: new Date().toISOString()
      });
  }
  
  return true;
};

/**
 * Verify API key from Authorization header
 */
export const verifyApiKey = async (
  authHeader: string | null,
  endpoint: string,
  clientIp?: string
): Promise<ApiKeyAuthResult> => {
  // Generic error for security
  const genericError = {
    success: false,
    error: 'Invalid credentials',
    statusCode: 401
  };
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return genericError;
  }
  
  const apiKey = authHeader.replace('Bearer ', '').trim();
  
  if (!apiKey || apiKey.length < 10) {
    return genericError;
  }
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Extract prefix (e.g., "sk_live")
  const parts = apiKey.split('_');
  if (parts.length < 3) {
    return genericError;
  }
  
  const prefix = `${parts[0]}_${parts[1]}`;
  
  // Get all non-revoked keys with this prefix
  const { data: keys, error: keysError } = await supabase
    .from('api_keys')
    .select('id, tenant_id, hashed_secret, prefix')
    .eq('prefix', apiKey) // prefix column stores the full key prefix
    .is('revoked_at', null);
  
  if (keysError || !keys || keys.length === 0) {
    console.log('No matching API keys found');
    return genericError;
  }
  
  // Try to match against hashed secrets
  let matchedKey = null;
  for (const key of keys) {
    try {
      // Compare the full API key against the hashed secret
      const isMatch = await bcrypt.compare(apiKey, key.hashed_secret);
      if (isMatch) {
        matchedKey = key;
        break;
      }
    } catch (e) {
      console.error('Error comparing key:', e);
      continue;
    }
  }
  
  if (!matchedKey) {
    console.log('No matching key after hash comparison');
    return genericError;
  }
  
  // Rate limiting per API key
  const keyRateLimitOk = await checkRateLimit(
    supabase,
    `api_key:${matchedKey.id}`,
    endpoint,
    100, // 100 requests
    60   // per minute
  );
  
  if (!keyRateLimitOk) {
    return {
      success: false,
      error: 'Rate limit exceeded',
      statusCode: 429
    };
  }
  
  // Rate limiting per IP if provided
  if (clientIp) {
    const ipRateLimitOk = await checkRateLimit(
      supabase,
      `ip:${clientIp}`,
      endpoint,
      200, // 200 requests
      60   // per minute
    );
    
    if (!ipRateLimitOk) {
      return {
        success: false,
        error: 'Rate limit exceeded',
        statusCode: 429
      };
    }
  }
  
  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', matchedKey.id);
  
  // Log API usage in audit logs
  await supabase
    .from('audit_logs')
    .insert({
      tenant_id: matchedKey.tenant_id,
      action: 'api_key.used',
      target: `api_key:${matchedKey.id}`,
      ip: clientIp || null,
      after: {
        endpoint,
        timestamp: new Date().toISOString()
      }
    });
  
  return {
    success: true,
    tenantId: matchedKey.tenant_id,
    apiKeyId: matchedKey.id
  };
};
