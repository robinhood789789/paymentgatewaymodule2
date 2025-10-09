import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { invokeFunctionWithTenant } from "@/lib/supabaseFunctions";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";
import { toast } from "sonner";
import { Plus, Copy, ExternalLink, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";

interface PaymentLink {
  id: string;
  slug: string;
  amount: number;
  currency: string;
  reference: string | null;
  status: string;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  created_at: string;
}

const Links = () => {
  const { activeTenantId } = useTenantSwitcher();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: "",
    currency: "thb",
    reference: "",
    expiresAt: "",
    usageLimit: "",
  });

  // Fetch payment links
  const { data: links, isLoading } = useQuery<PaymentLink[]>({
    queryKey: ["payment-links", activeTenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_links")
        .select("*")
        .eq("tenant_id", activeTenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!activeTenantId,
  });

  // Create payment link mutation
  const createLinkMutation = useMutation({
    mutationFn: async (body: any) => {
      const { data, error } = await invokeFunctionWithTenant("payment-links-create", { body });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-links"] });
      toast.success("Payment link created successfully");
      setIsDialogOpen(false);
      setFormData({
        amount: "",
        currency: "thb",
        reference: "",
        expiresAt: "",
        usageLimit: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create payment link");
    },
  });

  const handleCreateLink = () => {
    if (!formData.amount) {
      toast.error("Amount is required");
      return;
    }

    const amountInCents = Math.round(parseFloat(formData.amount) * 100);

    createLinkMutation.mutate({
      amount: amountInCents,
      currency: formData.currency,
      reference: formData.reference || null,
      expiresAt: formData.expiresAt || null,
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
    });
  };

  const handleCopyLink = (slug: string) => {
    const link = `${window.location.origin}/pay/${slug}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  };

  const handleOpenLink = (slug: string) => {
    window.open(`/pay/${slug}`, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payment Links</h1>
            <p className="text-muted-foreground">Create and manage payment links</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Payment Link</DialogTitle>
                <DialogDescription>
                  Generate a shareable payment link for your customers
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="100.00"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="reference">Reference (optional)</Label>
                  <Input
                    id="reference"
                    placeholder="Order #123"
                    value={formData.reference}
                    onChange={(e) =>
                      setFormData({ ...formData, reference: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="expiresAt">Expires At (optional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) =>
                      setFormData({ ...formData, expiresAt: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="usageLimit">Usage Limit (optional)</Label>
                  <Input
                    id="usageLimit"
                    type="number"
                    placeholder="10"
                    value={formData.usageLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, usageLimit: e.target.value })
                    }
                  />
                </div>
                <Button
                  onClick={handleCreateLink}
                  className="w-full"
                  disabled={createLinkMutation.isPending}
                >
                  {createLinkMutation.isPending ? "Creating..." : "Create Link"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Links List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : !links || links.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <LinkIcon className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No payment links yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first payment link to get started
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Link
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {links.map((link) => (
              <Card key={link.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">
                        {link.currency.toUpperCase()} {(link.amount / 100).toFixed(2)}
                      </CardTitle>
                      <CardDescription>
                        {link.reference && <span className="font-mono">{link.reference}</span>}
                      </CardDescription>
                    </div>
                    <Badge variant={link.status === "active" ? "default" : "secondary"}>
                      {link.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <code className="bg-muted px-2 py-1 rounded text-xs flex-1">
                        {window.location.origin}/pay/{link.slug}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyLink(link.slug)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenLink(link.slug)}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <div>
                        Used: {link.used_count}
                        {link.usage_limit && ` / ${link.usage_limit}`}
                      </div>
                      {link.expires_at && (
                        <div>
                          Expires: {format(new Date(link.expires_at), "MMM d, yyyy HH:mm")}
                        </div>
                      )}
                      <div>
                        Created: {format(new Date(link.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Links;
