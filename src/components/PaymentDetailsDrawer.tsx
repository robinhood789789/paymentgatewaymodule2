import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  provider: string | null;
  provider_payment_id: string | null;
  checkout_session_id: string | null;
  created_at: string;
  paid_at: string | null;
  metadata: any;
}

interface PaymentDetailsDrawerProps {
  payment: Payment | null;
  open: boolean;
  onClose: () => void;
}

export const PaymentDetailsDrawer = ({ payment, open, onClose }: PaymentDetailsDrawerProps) => {
  if (!payment) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "succeeded": return "default";
      case "pending": return "secondary";
      case "failed": return "destructive";
      default: return "outline";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Payment Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-2xl font-bold">
                {(payment.amount / 100).toLocaleString()} {payment.currency.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={getStatusColor(payment.status)}>{payment.status}</Badge>
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Payment ID</span>
              <div className="flex items-center gap-2">
                <code className="text-xs">{payment.id.slice(0, 8)}...</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(payment.id, "Payment ID")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {payment.provider_payment_id && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Provider ID</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs">{payment.provider_payment_id.slice(0, 12)}...</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(payment.provider_payment_id!, "Provider ID")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {payment.checkout_session_id && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Session ID</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs">{payment.checkout_session_id.slice(0, 8)}...</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(payment.checkout_session_id!, "Session ID")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {payment.method && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Method</span>
                <span className="text-sm font-medium">{payment.method}</span>
              </div>
            )}

            {payment.provider && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Provider</span>
                <span className="text-sm font-medium">{payment.provider}</span>
              </div>
            )}
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm">{format(new Date(payment.created_at), "PPp")}</span>
            </div>

            {payment.paid_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Paid</span>
                <span className="text-sm">{format(new Date(payment.paid_at), "PPp")}</span>
              </div>
            )}
          </div>

          {payment.metadata && Object.keys(payment.metadata).length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <span className="text-sm font-medium">Metadata</span>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                {JSON.stringify(payment.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
