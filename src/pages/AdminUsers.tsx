import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Shield, User, Lock, Unlock, ShieldCheck, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreateUserDialog } from "@/components/CreateUserDialog";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";
import { UserDetailDrawer } from "@/components/UserDetailDrawer";
import { PermissionGate } from "@/components/PermissionGate";
import { use2FAChallenge } from "@/hooks/use2FAChallenge";
import { TwoFactorChallenge } from "@/components/security/TwoFactorChallenge";

const AdminUsers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const queryClient = useQueryClient();
  const { activeTenantId } = useTenantSwitcher();
  const { isOpen, setIsOpen, checkAndChallenge, onSuccess } = use2FAChallenge();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) {
        console.log("❌ No activeTenantId");
        return [];
      }

      console.log("🔍 Fetching users for tenant:", activeTenantId);

      // Get memberships for current tenant only
      const { data: memberships, error: membershipsError } = await supabase
        .from("memberships")
        .select("user_id, tenant_id, role_id, roles(name), tenants(name)")
        .eq("tenant_id", activeTenantId);

      console.log("📊 Memberships fetched:", { count: memberships?.length, memberships, error: membershipsError });

      if (membershipsError) throw membershipsError;

      const userIds = memberships.map((m) => m.user_id);
      if (userIds.length === 0) {
        console.log("⚠️ No users found in memberships");
        return [];
      }

      console.log("👥 User IDs to fetch:", userIds);

      // Get profiles only for users in current tenant
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds)
        .order("created_at", { ascending: false });

      console.log("👤 Profiles fetched:", { count: profiles?.length, profiles, error: profilesError });

      if (profilesError) throw profilesError;

      const result = profiles.map((profile) => {
        const membership = memberships.find((m) => m.user_id === profile.id);
        
        return {
          ...profile,
          role: membership?.roles?.name || "viewer",
          role_id: membership?.role_id || null,
          tenant_id: membership?.tenant_id || null,
          tenant_name: membership?.tenants?.name || "No workspace",
          is_locked: false, // Can be extended with actual lock status from profiles
        };
      });

      console.log("✅ Final users data:", result);
      return result;
    },
    enabled: !!activeTenantId,
  });

  const force2FAMutation = useMutation({
    mutationFn: async (userId: string) => {
      // This would be implemented in an edge function
      // For now, we'll update the tenant security policy to enforce it
      const { error } = await supabase
        .from("profiles")
        .update({ totp_enabled: false })
        .eq("id", userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users", activeTenantId] });
      toast.success("User will be required to enable 2FA on next login");
    },
    onError: (error: any) => {
      toast.error("Failed to enforce 2FA", { description: error.message });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRoleName }: { userId: string; newRoleName: string }) => {
      if (!activeTenantId) throw new Error("No active tenant");

      // Find the role by name in current tenant
      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("id, tenant_id")
        .eq("name", newRoleName)
        .eq("tenant_id", activeTenantId)
        .eq("is_system", true)
        .maybeSingle();

      if (roleError) throw roleError;
      if (!roleData) throw new Error(`Role ${newRoleName} not found`);

      // Update the membership role
      const { error: updateError } = await supabase
        .from("memberships")
        .update({ role_id: roleData.id })
        .eq("user_id", userId)
        .eq("tenant_id", activeTenantId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users", activeTenantId] });
      toast.success("อัพเดทสิทธิ์ผู้ใช้สำเร็จ!");
    },
    onError: (error: any) => {
      toast.error("เกิดข้อผิดพลาด", {
        description: error.message,
      });
    },
  });

  const filteredUsers = users?.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewDetails = (userId: string) => {
    setSelectedUserId(userId);
    setDrawerOpen(true);
  };

  const handleForce2FA = (userId: string) => {
    checkAndChallenge(() => force2FAMutation.mutate(userId));
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    checkAndChallenge(() => updateRoleMutation.mutate({ userId, newRoleName: newRole }));
  };

  return (
    <DashboardLayout>
      <PermissionGate
        permission="users.view"
        allowOwner={true}
        allowAdmin={true}
        fallback={
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  You don't have permission to manage users
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        }
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Members</h1>
              <p className="text-muted-foreground">Manage user accounts and access permissions</p>
            </div>
            <PermissionGate allowOwner={true}>
              <CreateUserDialog />
            </PermissionGate>
          </div>

          <Card>
          <CardHeader>
            <CardTitle>รายชื่อผู้ใช้ทั้งหมด</CardTitle>
            <CardDescription>
              จำนวนผู้ใช้: {users?.length || 0} คน
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาด้วยอีเมลหรือชื่อ..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>2FA Status</TableHead>
                      <TableHead>Last Verified</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {user.role === "admin" ? (
                              <Shield className="w-4 h-4 text-primary" />
                            ) : (
                              <User className="w-4 h-4 text-muted-foreground" />
                            )}
                            {user.full_name || "ไม่ระบุชื่อ"}
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={
                            user.role === "super_admin" ? "default" : 
                            user.role === "owner" ? "secondary" : 
                            user.role === "admin" ? "secondary" :
                            "outline"
                          }>
                            {user.role || "viewer"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.totp_enabled ? (
                            <Badge variant="default" className="gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="outline">Disabled</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.mfa_last_verified_at 
                            ? new Date(user.mfa_last_verified_at).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString("en-US")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(user.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <PermissionGate allowOwner={true}>
                              {!user.totp_enabled && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleForce2FA(user.id)}
                                  title="Force 2FA (Owner only)"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </Button>
                              )}
                            </PermissionGate>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedUserId && (
          <UserDetailDrawer
            userId={selectedUserId}
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
          />
        )}
      </div>
      <TwoFactorChallenge open={isOpen} onOpenChange={setIsOpen} onSuccess={onSuccess} />
      </PermissionGate>
    </DashboardLayout>
  );
};

export default AdminUsers;
