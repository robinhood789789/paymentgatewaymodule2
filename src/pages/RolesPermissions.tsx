import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { RequireTenant } from "@/components/RequireTenant";
import { PermissionGate } from "@/components/PermissionGate";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Role {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
}

interface Permission {
  id: string;
  name: string;
  description: string;
}

interface RolePermission {
  role_id: string;
  permission_id: string;
}

const RolesPermissions = () => {
  const { activeTenantId } = useTenantSwitcher();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [permissionChanges, setPermissionChanges] = useState<Record<string, boolean>>({});

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["roles", activeTenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("tenant_id", activeTenantId)
        .order("name");
      
      if (error) throw error;
      return data as Role[];
    },
    enabled: !!activeTenantId,
  });

  // Fetch all permissions
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Permission[];
    },
  });

  // Fetch role permissions for selected role
  const { data: rolePermissions = [], isLoading: rolePermissionsLoading } = useQuery({
    queryKey: ["role-permissions", selectedRole],
    queryFn: async () => {
      if (!selectedRole) return [];
      
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role_id", selectedRole);
      
      if (error) throw error;
      return data as RolePermission[];
    },
    enabled: !!selectedRole,
  });

  // Update role permissions
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => {
      // Delete existing permissions
      await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", roleId);

      // Insert new permissions
      if (permissionIds.length > 0) {
        const { error } = await supabase
          .from("role_permissions")
          .insert(
            permissionIds.map((permissionId) => ({
              role_id: roleId,
              permission_id: permissionId,
            }))
          );

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] });
      toast({
        title: "บันทึกสำเร็จ",
        description: "อัปเดตสิทธิ์การเข้าถึงเรียบร้อยแล้ว",
      });
      setPermissionChanges({});
    },
    onError: (error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสิทธิ์การเข้าถึงได้",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    setPermissionChanges((prev) => ({
      ...prev,
      [permissionId]: checked,
    }));
  };

  const handleSave = () => {
    if (!selectedRole) return;

    const currentPermissionIds = rolePermissions.map((rp) => rp.permission_id);
    const updatedPermissionIds = permissions
      .filter((p) => {
        const isCurrentlyEnabled = currentPermissionIds.includes(p.id);
        const hasChange = permissionChanges.hasOwnProperty(p.id);
        return hasChange ? permissionChanges[p.id] : isCurrentlyEnabled;
      })
      .map((p) => p.id);

    updatePermissionsMutation.mutate({
      roleId: selectedRole,
      permissionIds: updatedPermissionIds,
    });
  };

  const isPermissionEnabled = (permissionId: string) => {
    if (permissionChanges.hasOwnProperty(permissionId)) {
      return permissionChanges[permissionId];
    }
    return rolePermissions.some((rp) => rp.permission_id === permissionId);
  };

  const selectedRoleData = roles.find((r) => r.id === selectedRole);
  const isOwnerRole = selectedRoleData?.name === "owner";
  const hasChanges = Object.keys(permissionChanges).length > 0;

  if (rolesLoading || permissionsLoading) {
    return (
      <DashboardLayout>
        <RequireTenant>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </RequireTenant>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <RequireTenant>
        <PermissionGate
          permission="users.manage"
          fallback={
            <div className="p-6">
              <div className="max-w-7xl mx-auto">
                <div className="text-center p-8 border rounded-lg">
                  <p className="text-muted-foreground">
                    คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เฉพาะ Owner เท่านั้นที่สามารถจัดการบทบาทและสิทธิ์ได้
                  </p>
                </div>
              </div>
            </div>
          }
        >
          <div className="p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground">บทบาทและสิทธิ์การเข้าถึง</h1>
                <p className="text-muted-foreground">จัดการบทบาทและสิทธิ์การเข้าถึงหน้าต่างๆ ในระบบ</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Roles List */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle>บทบาท</CardTitle>
                    <CardDescription>เลือกบทบาทเพื่อจัดการสิทธิ์</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {roles.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => {
                          setSelectedRole(role.id);
                          setPermissionChanges({});
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedRole === role.id
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-accent border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{role.name}</p>
                            <p className="text-sm text-muted-foreground">{role.description}</p>
                          </div>
                          {role.name === "owner" && (
                            <Badge variant="default">เจ้าของ</Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Permissions List */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>
                          สิทธิ์การเข้าถึง
                          {selectedRoleData && ` - ${selectedRoleData.name}`}
                        </CardTitle>
                        <CardDescription>
                          {isOwnerRole
                            ? "Owner มีสิทธิ์เข้าถึงทุกหน้าและไม่สามารถแก้ไขได้"
                            : "เลือกสิทธิ์ที่ต้องการให้บทบาทนี้เข้าถึงได้"}
                        </CardDescription>
                      </div>
                      {selectedRole && !isOwnerRole && (
                        <Button
                          onClick={handleSave}
                          disabled={!hasChanges || updatePermissionsMutation.isPending}
                        >
                          {updatePermissionsMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              กำลังบันทึก...
                            </>
                          ) : (
                            "บันทึก"
                          )}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!selectedRole ? (
                      <div className="text-center py-12 text-muted-foreground">
                        เลือกบทบาทเพื่อดูและจัดการสิทธิ์การเข้าถึง
                      </div>
                    ) : rolePermissionsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {permissions.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <Checkbox
                              id={permission.id}
                              checked={isPermissionEnabled(permission.id)}
                              disabled={isOwnerRole}
                              onCheckedChange={(checked) =>
                                handlePermissionToggle(permission.id, checked === true)
                              }
                            />
                            <label
                              htmlFor={permission.id}
                              className="flex-1 cursor-pointer"
                            >
                              <p className="font-medium">{permission.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {permission.description}
                              </p>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </PermissionGate>
      </RequireTenant>
    </DashboardLayout>
  );
};

export default RolesPermissions;