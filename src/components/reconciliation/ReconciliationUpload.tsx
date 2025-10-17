import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSwitcher } from "@/hooks/useTenantSwitcher";
import { invokeFunctionWithTenant } from "@/lib/supabaseFunctions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ReconciliationUpload() {
  const { activeTenantId } = useTenantSwitcher();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!activeTenantId) throw new Error("No active tenant");

      const reader = new FileReader();
      const csvContent = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      const { data, error } = await invokeFunctionWithTenant("reconcile-upload", {
        body: {
          csv_content: csvContent,
          provider: "auto", // Auto-detect provider from file
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setUploadResult(data);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Reconciliation completed", {
        description: `Matched: ${data.matched}, Unmatched: ${data.unmatched}`,
      });
    },
    onError: (error: any) => {
      toast.error("Reconciliation failed", {
        description: error.message,
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast.error("Invalid file type", {
          description: "Please upload a CSV file",
        });
        return;
      }
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const handleUpload = () => {
    if (!file) {
      toast.error("No file selected");
      return;
    }
    uploadMutation.mutate(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Reconciliation File</CardTitle>
        <CardDescription>
          Upload bank statement or provider settlement file to reconcile transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>File Format</AlertTitle>
          <AlertDescription>
            Upload CSV files from your payment provider (Stripe, OPN, 2C2P, KBank).
            The system will automatically detect the format and match transactions.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="file-upload">Select CSV File</Label>
          <div className="flex gap-3">
            <Input
              id="file-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={uploadMutation.isPending}
            />
            <Button
              onClick={handleUpload}
              disabled={!file || uploadMutation.isPending}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>

        {file && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">{file.name}</div>
              <div className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(2)} KB
              </div>
            </div>
          </div>
        )}

        {uploadResult && (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-semibold">Reconciliation Results</h3>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium">Matched Transactions:</span>
                <span>{uploadResult.matched || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="font-medium">Unmatched Transactions:</span>
                <span>{uploadResult.unmatched || 0}</span>
              </div>
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-2">
                  <div className="font-medium text-sm text-muted-foreground mb-1">
                    Errors:
                  </div>
                  <div className="text-sm space-y-1">
                    {uploadResult.errors.map((error: string, i: number) => (
                      <div key={i} className="text-destructive">
                        • {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
