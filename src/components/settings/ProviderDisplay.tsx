import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const PROVIDERS = {
  'stripe': 'Stripe',
  'opn': 'OPN',
  'twoc2p': '2C2P',
  'kbank': 'KBank',
};

export const ProviderDisplay = () => {
  const { tenantId } = useAuth();

  const { data: assignment, isLoading } = useQuery({
    queryKey: ['tenant-provider-assignment', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('tenant_provider_assignments')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        // If not found, return null (no assignment yet)
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data;
    },
    enabled: !!tenantId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Payment Provider
        </CardTitle>
        <CardDescription>
          Your payment processing provider (managed by platform)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : assignment ? (
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Processing by:</p>
                <p className="text-lg font-semibold">
                  {PROVIDERS[assignment.provider as keyof typeof PROVIDERS] || assignment.provider}
                </p>
              </div>
              <Badge variant={assignment.mode === 'live' ? 'default' : 'secondary'}>
                {assignment.mode === 'live' ? 'Live Mode' : 'Test Mode'}
              </Badge>
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium">Platform Managed</p>
                  <p className="mt-1">
                    Provider credentials are managed by the platform administrator. 
                    Contact support if you need to change your payment provider.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No provider assigned</p>
            <p className="text-sm mt-1">
              Contact your platform administrator to configure payment processing
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};