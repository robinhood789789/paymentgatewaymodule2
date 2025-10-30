import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Search, Eye, Settings, Loader2 } from "lucide-react";
import { ProvisionMerchantDialog } from "@/components/ProvisionMerchantDialog";
import { toast } from "sonner";
import { invokeFunctionWithTenant } from "@/lib/supabaseFunctions";

export default function TenantManagement() {
  const { user, isSuperAdmin, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  // Log page access
  useEffect(() => {
    if (user && isSuperAdmin) {
      supabase.from("audit_logs").insert({
        action: "super_admin.tenants.viewed",
        actor_user_id: user.id,
        ip: null,
        user_agent: navigator.userAgent,
      });
    }
  }, [user, isSuperAdmin]);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, memberships(count)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
  });

  const filteredTenants = tenants?.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateStatusMutation = useMutation({
    mutationFn: async ({ tenantId, status }: { tenantId: string; status: string }) => {
      const { data, error } = await invokeFunctionWithTenant("update-tenant-status", {
        body: { tenant_id: tenantId, status },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast.success("อัพเดทสถานะสำเร็จ");
    },
    onError: (error: Error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const handleStatusChange = (tenantId: string, newStatus: string) => {
    updateStatusMutation.mutate({ tenantId, status: newStatus });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500";
      case "suspended":
        return "bg-red-500/10 text-red-500";
      case "locked":
        return "bg-orange-500/10 text-orange-500";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const getKYCColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-500/10 text-green-500";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500";
      case "rejected":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Tenant Management
            </h1>
            <p className="text-muted-foreground">Manage and monitor all platform tenants</p>
          </div>
          <ProvisionMerchantDialog />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Tenants</CardTitle>
            <CardDescription>View and manage tenant accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tenants by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>KYC Status</TableHead>
                      <TableHead>Business Type</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredTenants?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          No tenants found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTenants?.map((tenant) => (
                        <TableRow key={tenant.id}>
                          <TableCell className="font-medium">{tenant.name}</TableCell>
                          <TableCell>
                            <Select
                              value={tenant.status}
                              onValueChange={(value) => handleStatusChange(tenant.id, value)}
                              disabled={updateStatusMutation.isPending}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue>
                                  <Badge className={getStatusColor(tenant.status)}>
                                    {tenant.status}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    Active
                                  </div>
                                </SelectItem>
                                <SelectItem value="suspended">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    Suspended
                                  </div>
                                </SelectItem>
                                <SelectItem value="locked">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                                    Locked
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge className={getKYCColor(tenant.kyc_status || "pending")}>
                              {tenant.kyc_status || "pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>{tenant.business_type || "-"}</TableCell>
                          <TableCell>{tenant.memberships?.[0]?.count || 0}</TableCell>
                          <TableCell>
                            {new Date(tenant.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
