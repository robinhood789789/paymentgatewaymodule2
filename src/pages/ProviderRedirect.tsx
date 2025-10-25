import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Building2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

/**
 * Redirect page for tenant users trying to access provider settings
 * Informs them that provider management is platform-level only
 */
const ProviderRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      navigate("/settings");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="border-warning">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-warning/10 rounded-full">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
              <div>
                <CardTitle className="text-xl">Access Restricted</CardTitle>
                <CardDescription>Provider settings are platform-managed</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Payment Provider Configuration (การตั้งค่าผู้ให้บริการรับชำระเงิน)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Payment provider settings (Stripe, OPN, 2C2P, KBank credentials) are managed 
                    exclusively by the platform administrator for security and compliance reasons.
                  </p>
                  <p className="text-sm text-warning font-medium mt-3">
                    ⚠️ ผู้ให้บริการรับชำระเงิน (Provider) ถูกจัดการโดยผู้ดูแลแพลตฟอร์มเท่านั้น
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">What you can do:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  View your assigned payment provider in Settings
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Manage your store's API keys for integration
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Configure webhooks for your application
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Contact platform administrator for provider changes
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="default" 
                onClick={() => navigate("/settings")}
                className="flex-1"
              >
                Go to Settings
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate("/dashboard")}
              >
                Dashboard
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Redirecting to Settings in 5 seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProviderRedirect;
