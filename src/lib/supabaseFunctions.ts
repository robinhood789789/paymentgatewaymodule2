import { supabase } from "@/integrations/supabase/client";

const ACTIVE_TENANT_KEY = "active_tenant_id";

/**
 * Wrapper for supabase.functions.invoke that automatically adds X-Tenant header
 */
export const invokeFunctionWithTenant = async <T = any>(
  functionName: string,
  options?: {
    body?: any;
    headers?: Record<string, string>;
  }
): Promise<{ data: T | null; error: any }> => {
  const activeTenantId = localStorage.getItem(ACTIVE_TENANT_KEY);
  
  const headers = {
    ...(options?.headers || {}),
    ...(activeTenantId ? { "x-tenant": activeTenantId } : {}),
  };

  return await supabase.functions.invoke(functionName, {
    ...options,
    headers,
  });
};
