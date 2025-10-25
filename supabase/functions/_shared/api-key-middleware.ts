/**
 * API Key Authentication Middleware
 * Verify Bearer tokens for tenant API access
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { hash as bcryptHash, compare as bcryptCompare } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

interface ApiKeyAuthResult {
  success: boolean;
  tenantId?: string;
  keyId?: string;
  scope?: any;
  error?: string;
  statusCode?: number;
}

/**
 * Verify API key from Authorization: Bearer header
 */
export async function verifyApiKey(
  req: Request,
  supabaseUrl: string,
  supabaseKey: string,
  requiredTenantId?: string
): Promise<ApiKeyAuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Missing or invalid Authorization header',
      statusCode: 401
    };
  }

  const apiKeySecret = authHeader.substring(7); // Remove "Bearer "
  
  if (!apiKeySecret || apiKeySecret.length < 40) {
    return {
      success: false,
      error: 'Invalid API key format',
      statusCode: 401
    };
  }

  // Extract prefix from secret
  const prefix = apiKeySecret.substring(0, 12);
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Find API keys with matching prefix
  const { data: keys, error: keysError } = await supabase
    .from('api_keys')
    .select('*')
    .eq('prefix', prefix)
    .eq('status', 'active');

  if (keysError || !keys || keys.length === 0) {
    return {
      success: false,
      error: 'Invalid API key',
      statusCode: 401
    };
  }

  // Hash the provided secret and compare with stored hash
  let matchedKey = null;
  
  for (const key of keys) {
    try {
      const isMatch = await bcryptCompare(apiKeySecret, key.hashed_secret);
      if (isMatch) {
        matchedKey = key;
        break;
      }
    } catch (e) {
      // Continue to next key
    }
  }

  if (!matchedKey) {
    return {
      success: false,
      error: 'Invalid API key',
      statusCode: 401
    };
  }

  // Check if expired
  if (matchedKey.expires_at) {
    const expiresAt = new Date(matchedKey.expires_at);
    if (expiresAt < new Date()) {
      // Mark as expired
      await supabase
        .from('api_keys')
        .update({ status: 'expired' })
        .eq('id', matchedKey.id);
      
      return {
        success: false,
        error: 'API key expired',
        statusCode: 401
      };
    }
  }

  // Check tenant match if required
  if (requiredTenantId && matchedKey.tenant_id !== requiredTenantId) {
    return {
      success: false,
      error: 'API key not authorized for this tenant',
      statusCode: 403
    };
  }

  // Check IP allowlist
  const ipAllowlist = matchedKey.ip_allowlist || [];
  if (Array.isArray(ipAllowlist) && ipAllowlist.length > 0) {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || '';
    
    if (!ipAllowlist.includes(clientIp)) {
      return {
        success: false,
        error: 'IP address not in allowlist',
        statusCode: 403
      };
    }
  }

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', matchedKey.id);

  // Check scopes (if endpoint requires specific scope)
  const scope = matchedKey.scope || { endpoints: ['*'] };

  return {
    success: true,
    tenantId: matchedKey.tenant_id,
    keyId: matchedKey.id,
    scope
  };
}

/**
 * Check if API key has permission for specific endpoint
 */
export function hasEndpointPermission(scope: any, endpoint: string): boolean {
  if (!scope || !scope.endpoints) {
    return false;
  }

  const endpoints = scope.endpoints;
  
  // Wildcard access
  if (endpoints.includes('*')) {
    return true;
  }

  // Exact match
  if (endpoints.includes(endpoint)) {
    return true;
  }

  // Pattern match (e.g., /api/v1/payments/* matches /api/v1/payments/123)
  for (const pattern of endpoints) {
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      if (endpoint.startsWith(prefix)) {
        return true;
      }
    }
  }

  return false;
}
