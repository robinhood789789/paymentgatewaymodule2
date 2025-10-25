import DashboardLayout from "@/components/DashboardLayout";
import { ProviderCredentialsManager } from "@/components/admin/ProviderCredentialsManager";
import { TenantProviderAssignment } from "@/components/admin/TenantProviderAssignment";

const PlatformProviders = () => {
  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Platform Providers</h1>
          <p className="text-muted-foreground">
            Configure platform-level payment provider credentials and tenant assignments
          </p>
        </div>

        <div className="space-y-6">
          <ProviderCredentialsManager />
          <TenantProviderAssignment />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PlatformProviders;