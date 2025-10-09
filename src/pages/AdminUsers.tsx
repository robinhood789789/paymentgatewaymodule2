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
import { Search, UserPlus, Shield, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminUsers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: memberships, error: membershipsError } = await supabase
        .from("memberships")
        .select("user_id, tenant_id, role_id, roles(name), tenants(name)");

      if (membershipsError) throw membershipsError;

      return profiles.map((profile) => {
        const membership = memberships.find((m) => m.user_id === profile.id);
        
        return {
          ...profile,
          role: membership?.roles?.name || "viewer",
          role_id: membership?.role_id || null,
          tenant_id: membership?.tenant_id || null,
          tenant_name: membership?.tenants?.name || "No workspace",
        };
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRoleName }: { userId: string; newRoleName: string }) => {
      // Find the role by name
      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("id, tenant_id")
        .eq("name", newRoleName)
        .eq("is_system", true)
        .maybeSingle();

      if (roleError) throw roleError;
      if (!roleData) throw new Error(`Role ${newRoleName} not found`);

      // Get user's current membership
      const { data: currentMembership, error: getMembershipError } = await supabase
        .from("memberships")
        .select("id, tenant_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (getMembershipError) throw getMembershipError;

      // Update the membership role
      const { error: updateError } = await supabase
        .from("memberships")
        .update({ role_id: roleData.id })
        .eq("user_id", userId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
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

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">จัดการผู้ใช้</h1>
            <p className="text-muted-foreground">จัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึง</p>
          </div>
          <Button variant="gradient" className="gap-2">
            <UserPlus className="w-4 h-4" />
            เพิ่มผู้ใช้
          </Button>
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
                      <TableHead>Workspace</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Manage</TableHead>
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
                          <span className="text-sm text-muted-foreground">
                            {user.tenant_name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            user.role === "super_admin" ? "default" : 
                            user.role === "owner" ? "secondary" : 
                            user.role === "merchant_admin" ? "secondary" :
                            "outline"
                          }>
                            {user.role || "viewer"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString("en-US")}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value: string) =>
                              updateRoleMutation.mutate({
                                userId: user.id,
                                newRoleName: value,
                              })
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="developer">Developer</SelectItem>
                              <SelectItem value="support">Support</SelectItem>
                              <SelectItem value="finance">Finance</SelectItem>
                              <SelectItem value="merchant_admin">Merchant Admin</SelectItem>
                              <SelectItem value="owner">Owner</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
