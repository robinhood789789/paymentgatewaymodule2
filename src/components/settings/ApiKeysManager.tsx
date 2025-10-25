import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invokeFunctionWithTenant } from "@/lib/supabaseFunctions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Key, Copy, Trash2, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PermissionGate } from "../PermissionGate";
import { use2FAChallenge } from "@/hooks/use2FAChallenge";
import { TwoFactorChallenge } from "../security/TwoFactorChallenge";

export const ApiKeysManager = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { isOpen, setIsOpen, checkAndChallenge, onSuccess } = use2FAChallenge();

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .is("revoked_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await invokeFunctionWithTenant("api-keys-create", {
        body: { name },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setNewApiKey(data.api_key.secret);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create API key", {
        description: error.message,
      });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const { data, error } = await invokeFunctionWithTenant("api-keys-revoke", {
        body: { api_key_id: keyId },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key revoked successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to revoke API key", {
        description: error.message,
      });
    },
  });

  const handleCreateKey = () => {
    if (!keyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }
    checkAndChallenge(() => createKeyMutation.mutate(keyName));
  };

  const handleRevokeKey = (keyId: string) => {
    checkAndChallenge(() => revokeKeyMutation.mutate(keyId));
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const handleCloseNewKeyDialog = () => {
    setNewApiKey(null);
    setCreateDialogOpen(false);
    setKeyName("");
  };

  return (
    <PermissionGate
      permission="api_keys:manage"
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              You don't have permission to manage API keys
            </CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage your API keys for programmatic access
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    Generate a new API key for your application
                  </DialogDescription>
                </DialogHeader>
                
                {!newApiKey ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="keyName">Key Name</Label>
                      <Input
                        id="keyName"
                        placeholder="Production API Key"
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                        disabled={createKeyMutation.isPending}
                      />
                    </div>
                    <Button
                      onClick={handleCreateKey}
                      disabled={createKeyMutation.isPending}
                      className="w-full"
                    >
                      {createKeyMutation.isPending ? "Creating..." : "Generate Key"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-warning/10 border border-warning rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-warning">Save this key now!</p>
                          <p className="text-muted-foreground mt-1">
                            You won't be able to see it again. Store it in a secure location.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Your API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newApiKey}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleCopyKey(newApiKey)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <Button onClick={handleCloseNewKeyDialog} className="w-full">
                      Done
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : apiKeys && apiKeys.length > 0 ? (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{key.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-sm font-mono text-muted-foreground">
                        {key.prefix}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(key.created_at).toLocaleDateString()}
                      </p>
                      {key.last_used_at && (
                        <p className="text-xs text-muted-foreground">
                          Last used {new Date(key.last_used_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Revoke
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently revoke "{key.name}". Any applications using this key will no longer be able to authenticate.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRevokeKey(key.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Revoke Key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No API keys created yet</p>
              <p className="text-sm mt-1">Create your first API key to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
      <TwoFactorChallenge open={isOpen} onOpenChange={setIsOpen} onSuccess={onSuccess} />
    </PermissionGate>
  );
};
