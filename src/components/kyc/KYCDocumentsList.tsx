import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";
import { format } from "date-fns";

const documentTypeLabels: Record<string, string> = {
  national_id: "บัตรประชาชน",
  passport: "หนังสือเดินทาง",
  drivers_license: "ใบขับขี่",
  business_registration: "ทะเบียนธุรกิจ",
  tax_certificate: "หนังสือรับรองภาษี",
  bank_statement: "Statement ธนาคาร",
  proof_of_address: "หลักฐานที่อยู่",
};

const getStatusBadge = (status: string) => {
  const badges = {
    pending: { icon: Clock, variant: "outline" as const, label: "รอตรวจสอบ", className: "border-yellow-600 text-yellow-700" },
    under_review: { icon: Clock, variant: "outline" as const, label: "กำลังตรวจสอบ", className: "border-blue-600 text-blue-700" },
    approved: { icon: CheckCircle2, variant: "default" as const, label: "อนุมัติ", className: "bg-green-600 text-white" },
    rejected: { icon: XCircle, variant: "destructive" as const, label: "ไม่อนุมัติ", className: "" },
    expired: { icon: XCircle, variant: "secondary" as const, label: "หมดอายุ", className: "" },
  };
  const badge = badges[status as keyof typeof badges] || badges.pending;
  const Icon = badge.icon;
  return (
    <Badge variant={badge.variant} className={badge.className}>
      <Icon className="mr-1 h-3 w-3" />
      {badge.label}
    </Badge>
  );
};

export const KYCDocumentsList = () => {
  const { activeTenantId } = useTenantSwitcher();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["kyc-documents", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const { data, error } = await supabase
        .from("kyc_documents")
        .select("*")
        .eq("tenant_id", activeTenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeTenantId,
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">กำลังโหลด...</div>;
  }

  if (!documents || documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>ยังไม่มีเอกสาร KYC</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          เอกสาร KYC ที่อัปโหลด
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ประเภทเอกสาร</TableHead>
              <TableHead>เลขที่</TableHead>
              <TableHead>วันหมดอายุ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>วันที่อัปโหลด</TableHead>
              <TableHead>หมายเหตุ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">
                  {documentTypeLabels[doc.document_type] || doc.document_type}
                </TableCell>
                <TableCell>{doc.document_number || "-"}</TableCell>
                <TableCell>
                  {doc.expiry_date ? format(new Date(doc.expiry_date), "dd/MM/yyyy") : "-"}
                </TableCell>
                <TableCell>{getStatusBadge(doc.status)}</TableCell>
                <TableCell>{format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {doc.rejection_reason || "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
