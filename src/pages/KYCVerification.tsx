import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Building2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PermissionGate } from "@/components/PermissionGate";

const KYCVerification = () => {
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [kycStatus, setKycStatus] = useState("");

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["kyc-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateKYCMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { kyc_status: status };
      if (status === "verified") {
        updates.kyc_verified_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tenants")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc-tenants"] });
      toast({ title: "KYC status updated successfully" });
      setSelectedTenant(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update KYC status", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive"; icon: any }> = {
      pending: { variant: "default", icon: Clock },
      verified: { variant: "secondary", icon: CheckCircle },
      rejected: { variant: "destructive", icon: XCircle },
    };

    const { variant, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const handleUpdateKYC = () => {
    if (!selectedTenant || !kycStatus) return;
    updateKYCMutation.mutate({ id: selectedTenant.id, status: kycStatus });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">KYC Verification</h1>
          <p className="text-muted-foreground">Manage merchant verification and compliance</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenants?.filter((t) => t.kyc_status === "pending").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenants?.filter((t) => t.kyc_status === "verified").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenants?.filter((t) => t.kyc_status === "rejected").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Merchant Verification Queue</CardTitle>
          <CardDescription>Review and verify merchant accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tenants?.map((tenant) => (
              <Card key={tenant.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{tenant.name}</span>
                        {getStatusBadge(tenant.kyc_status)}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {tenant.business_type && (
                          <div>
                            <span className="text-muted-foreground">Business Type: </span>
                            <span>{tenant.business_type}</span>
                          </div>
                        )}
                        {tenant.tax_id && (
                          <div>
                            <span className="text-muted-foreground">Tax ID: </span>
                            <span className="font-mono">{tenant.tax_id}</span>
                          </div>
                        )}
                        {tenant.contact_email && (
                          <div>
                            <span className="text-muted-foreground">Email: </span>
                            <span>{tenant.contact_email}</span>
                          </div>
                        )}
                        {tenant.contact_phone && (
                          <div>
                            <span className="text-muted-foreground">Phone: </span>
                            <span>{tenant.contact_phone}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Registered: </span>
                          <span>{formatDistanceToNow(new Date(tenant.created_at))} ago</span>
                        </div>
                        {tenant.kyc_verified_at && (
                          <div>
                            <span className="text-muted-foreground">Verified: </span>
                            <span>{formatDistanceToNow(new Date(tenant.kyc_verified_at))} ago</span>
                          </div>
                        )}
                      </div>

                      {tenant.payout_bank_account && (
                        <div className="pt-2 text-sm">
                          <span className="text-muted-foreground">Bank: </span>
                          <span>{tenant.payout_bank_name} - {tenant.payout_bank_account}</span>
                        </div>
                      )}
                    </div>

                    <PermissionGate permission="settings.manage">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setKycStatus(tenant.kyc_status);
                            }}
                          >
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Update KYC Status</DialogTitle>
                            <DialogDescription>
                              Review and update verification status for {tenant.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Merchant Information</Label>
                              <div className="text-sm space-y-1 p-4 bg-muted rounded-lg">
                                <div><strong>Name:</strong> {tenant.name}</div>
                                {tenant.business_type && <div><strong>Type:</strong> {tenant.business_type}</div>}
                                {tenant.tax_id && <div><strong>Tax ID:</strong> {tenant.tax_id}</div>}
                                {tenant.contact_email && <div><strong>Email:</strong> {tenant.contact_email}</div>}
                                {tenant.contact_phone && <div><strong>Phone:</strong> {tenant.contact_phone}</div>}
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="kyc-status">KYC Status</Label>
                              <Select value={kycStatus} onValueChange={setKycStatus}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="verified">Verified</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={handleUpdateKYC}>Update Status</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </PermissionGate>
                  </div>
                </CardContent>
              </Card>
            ))}

            {!tenants || tenants.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No merchants found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KYCVerification;
