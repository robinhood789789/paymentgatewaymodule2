import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { RequireTenant } from "@/components/RequireTenant";
// ... keep existing code
import { supabase } from "@/integrations/supabase/client";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { format } from "date-fns";

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

interface Membership {
  id: string;
  user_id: string;
  role_id: string;
  created_at: string;
  roles: {
    name: string;
  };
  profiles: {
    full_name: string | null;
    email: string;
  };
}

const RolesPermissions = () => {
  const { activeTenantId } = useTenantSwitcher();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [newMemberRole, setNewMemberRole] = useState<string>("");
  const [activeTab, setActiveTab] = useState("admins");

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

  // Fetch memberships
  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ["memberships", activeTenantId, selectedRole, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("memberships")
        .select(`
          id,
          user_id,
          role_id,
          created_at,
          roles!inner (
            name
          ),
          profiles!inner (
            full_name,
            email
          )
        `)
        .eq("tenant_id", activeTenantId);

      if (selectedRole && selectedRole !== "all") {
        query = query.eq("role_id", selectedRole);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;

      let filtered = data as unknown as Membership[];
      
      if (searchQuery) {
        filtered = filtered.filter((m) => {
          const searchLower = searchQuery.toLowerCase();
          return (
            m.profiles.full_name?.toLowerCase().includes(searchLower) ||
            m.profiles.email.toLowerCase().includes(searchLower)
          );
        });
      }

      return filtered;
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


  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleAddAdmin = () => {
    // TODO: Implement add admin functionality
    toast({
      title: "ฟังก์ชันยังไม่พร้อมใช้งาน",
      description: "ฟังก์ชันนี้อยู่ระหว่างการพัฒนา",
    });
    setIsAddDialogOpen(false);
  };

  const filteredMemberships = memberships;

  const isLoading = rolesLoading || permissionsLoading || membershipsLoading;

  return (
    <DashboardLayout>
      <RequireTenant>
          <div className="p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">จัดการแอดมิน</h1>
                  <p className="text-muted-foreground">
                    Brick City &gt; จัดการแอดมิน
                  </p>
                </div>
              </div>

              <Card>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <CardHeader>
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                      <TabsTrigger value="admins">แอดมินร้านค้า</TabsTrigger>
                      <TabsTrigger value="history">ประวัติการเชิญ</TabsTrigger>
                    </TabsList>
                  </CardHeader>
                  <CardContent>
                    <TabsContent value="admins" className="space-y-4 mt-0">
                    {/* Search and Filter */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex flex-1 gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="ชื่อแอดมิน, เบอร์โทร"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <Button variant="outline" size="icon">
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="สาขา" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">ทั้งหมด</SelectItem>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={() => setIsAddDialogOpen(true)}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          เพิ่มแอดมิน
                        </Button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-sm text-muted-foreground">
                      รายชื่อ <span className="font-semibold">แอดมินร้านค้า ({filteredMemberships.length}/10)</span>
                    </div>

                    {/* Table */}
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : filteredMemberships.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        ไม่มีข้อมูล
                      </div>
                    ) : (
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>เบอร์/ชื่อ-สกุล/อีเมล</TableHead>
                              <TableHead>สาขา</TableHead>
                              <TableHead>วันที่เชิญ</TableHead>
                              <TableHead>วันที่ยอมรับ</TableHead>
                              <TableHead>สถานะ</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredMemberships.map((membership) => (
                              <TableRow key={membership.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      {membership.profiles.full_name || "-"}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {membership.profiles.email}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {membership.roles.name}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {format(new Date(membership.created_at), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell>
                                  {format(new Date(membership.created_at), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">ใช้งาน</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>

                    <TabsContent value="history" className="mt-0">
                      <div className="text-center py-12 text-muted-foreground">
                        ยังไม่มีประวัติการเชิญ
                      </div>
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>
          </div>

          {/* Add Admin Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>เพิ่มแอดมิน</DialogTitle>
                <DialogDescription>
                  เลือกสาขาและสิทธิ์การเข้าถึงสำหรับแอดมินคนใหม่
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Branch/Role Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    สาขา<span className="text-destructive">*</span>
                  </label>
                  <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกสาขา" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Permissions */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    สิทธิ์การเข้าถึง<span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {permissions.map((permission) => (
                      <div key={permission.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`perm-${permission.id}`}
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={() => handlePermissionToggle(permission.id)}
                        />
                        <label
                          htmlFor={`perm-${permission.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {permission.description || permission.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setSelectedPermissions([]);
                    setNewMemberRole("");
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="button"
                  onClick={handleAddAdmin}
                  disabled={!newMemberRole || selectedPermissions.length === 0}
                >
                  สร้างบัญชีสมาชิก
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        
      </RequireTenant>
    </DashboardLayout>
  );
};

export default RolesPermissions;