import { supabase } from "@/integrations/supabase/client";

const ACTIVE_TENANT_KEY = "active_tenant_id";

/**
 * Wrapper for supabase.functions.invoke that automatically adds X-Tenant header
 * and ensures the Authorization bearer token is always sent.
 */
export const invokeFunctionWithTenant = async <T = any>(
  functionName: string,
  options?: {
    body?: any;
    headers?: Record<string, string>;
    throwOnError?: boolean;
  }
): Promise<{ data: T | null; error: any }> => {
  // Resolve active tenant from localStorage (supports generic and per-user keys)
  let activeTenantId: string | null = null;
  try {
    // Try generic key first (backward compatible)
    activeTenantId = localStorage.getItem(ACTIVE_TENANT_KEY);
    // Fallback: search any user-scoped key like `active_tenant_id:<userId>`
    if (!activeTenantId) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${ACTIVE_TENANT_KEY}:`)) {
          const val = localStorage.getItem(key);
          if (val) { activeTenantId = val; break; }
        }
      }
    }
  } catch {}

  // Ensure we always send the current access token to avoid 401 before function runs
  let authHeader: Record<string, string> = {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) {
      authHeader = { Authorization: `Bearer ${token}` };
    }
  } catch {}
  
  const headers = {
    ...(options?.headers || {}),
    ...(activeTenantId ? { "x-tenant": activeTenantId } : {}),
    ...authHeader,
  } as Record<string, string>;

  return await supabase.functions.invoke(functionName, {
    ...options,
    headers,
  });
};
