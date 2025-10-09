import DashboardLayout from "@/components/DashboardLayout";
import { RequireTenant } from "@/components/RequireTenant";
import { PermissionGate } from "@/components/PermissionGate";
import { PaymentsTable } from "@/components/PaymentsTable";

const Payments = () => {
  return (
    <DashboardLayout>
      <RequireTenant>
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Payments</h1>
              <p className="text-muted-foreground">View and manage payment transactions</p>
            </div>

            <PermissionGate 
              permission="payments:read"
              fallback={
                <div className="text-center p-8 border rounded-lg">
                  <p className="text-muted-foreground">You don't have permission to view payments</p>
                </div>
              }
            >
              <PaymentsTable />
            </PermissionGate>
          </div>
        </div>
      </RequireTenant>
    </DashboardLayout>
  );
};

export default Payments;
