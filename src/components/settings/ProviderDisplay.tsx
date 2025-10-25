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
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="w-4 h-4" />
          Payment Provider (ผู้ให้บริการรับชำระเงิน)
        </CardTitle>
        <CardDescription className="text-xs">
          Read-only · Managed by platform administrator
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading provider information...</p>
        ) : assignment ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Processing by (ประมวลผลโดย):</p>
                <p className="text-base font-semibold mt-1">
                  {PROVIDERS[assignment.provider as keyof typeof PROVIDERS] || assignment.provider}
                  <span className="text-xs text-muted-foreground ml-2">(จัดการโดยแพลตฟอร์ม)</span>
                </p>
              </div>
              <Badge variant={assignment.mode === 'live' ? 'default' : 'secondary'} className="text-xs">
                {assignment.mode === 'live' ? 'Live' : 'Test'}
              </Badge>
            </div>
            
            <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-warning mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Platform Managed (จัดการโดยแพลตฟอร์ม)</p>
                  <p className="mt-1">
                    Payment provider credentials are configured and managed exclusively by the platform administrator. 
                    Merchants cannot view or edit provider settings.
                  </p>
                  <p className="mt-1 text-warning">
                    ⚠️ ผู้ให้บริการรับชำระเงิน (Provider) ถูกจัดการโดยผู้ดูแลแพลตฟอร์มเท่านั้น
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No provider assigned yet</p>
            <p className="text-xs mt-1">
              Contact your platform administrator to configure payment processing
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};