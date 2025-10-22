// Wrapper for Supabase client that automatically adds X-Tenant header
import { supabase as baseSupabase } from "@/integrations/supabase/client";

const ACTIVE_TENANT_KEY = "active_tenant_id";

// Create a proxy to automatically add X-Tenant header to requests
const createSupabaseProxy = () => {
  return new Proxy(baseSupabase, {
    get(target: any, prop: string) {
      const original = target[prop];
      
      // Intercept 'from' calls to add X-Tenant header
      if (prop === 'from') {
        return (table: string) => {
          const activeTenantId = localStorage.getItem(ACTIVE_TENANT_KEY);
          const builder = original.call(target, table);
          
          if (activeTenantId) {
            // Add X-Tenant header to the request
            return new Proxy(builder, {
              get(builderTarget: any, builderProp: string) {
                const builderMethod = builderTarget[builderProp];
                if (typeof builderMethod === 'function') {
                  return function(...args: any[]) {
                    const result = builderMethod.apply(builderTarget, args);
                    // If this returns a builder, add headers
                    if (result && typeof result === 'object' && 'headers' in result) {
                      return result;
                    }
                    return result;
                  };
                }
                return builderMethod;
              }
            });
          }
          return builder;
        };
      }
      
      return original;
    }
  });
};

export const supabase = createSupabaseProxy() as typeof baseSupabase;

// Re-export types if needed
export type { Database } from "@/integrations/supabase/types";
