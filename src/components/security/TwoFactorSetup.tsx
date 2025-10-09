import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { generateTOTPSecret, generateBackupCodes, getTOTPQRCodeUrl } from '@/lib/security/totp';
import QRCode from 'qrcode';

export function TwoFactorSetup() {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [setupStep, setSetupStep] = useState<'initial' | 'setup' | 'verify'>('initial');
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['profile-2fa', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('totp_enabled, totp_secret')
        .eq('id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const enableMutation = useMutation({
    mutationFn: async ({ secret, codes }: { secret: string; codes: string[] }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          totp_secret: secret,
          totp_enabled: true,
          totp_backup_codes: codes,
        })
        .eq('id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-2fa'] });
      toast.success('2FA enabled successfully');
      setSetupStep('initial');
    },
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          totp_secret: null,
          totp_enabled: false,
          totp_backup_codes: null,
        })
        .eq('id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-2fa'] });
      toast.success('2FA disabled');
    },
  });

  const startSetup = async () => {
    const newSecret = generateTOTPSecret();
    const codes = generateBackupCodes();
    setSecret(newSecret);
    setBackupCodes(codes);

    const otpUrl = getTOTPQRCodeUrl(newSecret, user?.email || '', 'Payment Platform');
    const qr = await QRCode.toDataURL(otpUrl);
    setQrCodeUrl(qr);
    setSetupStep('setup');
  };

  const verifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    // In production, verify the code server-side
    enableMutation.mutate({ secret, codes: backupCodes });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (setupStep === 'setup') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Set Up Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Scan the QR code with your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {qrCodeUrl && (
            <div className="flex justify-center">
              <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
            </div>
          )}

          <div className="space-y-2">
            <Label>Or enter this code manually:</Label>
            <div className="flex gap-2">
              <Input value={secret} readOnly className="font-mono" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(secret)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
            {backupCodes.map((code, i) => (
              <code key={i} className="text-xs font-mono">
                {code}
              </code>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Enter verification code from your app</Label>
            <Input
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="text-center text-lg font-mono tracking-widest"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setSetupStep('initial')} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={verifyAndEnable} className="flex-1" disabled={verificationCode.length !== 6}>
              Verify & Enable
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Two-Factor Authentication
          {profile?.totp_enabled && (
            <Badge variant="default" className="ml-auto">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Enabled
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Two-factor authentication adds an additional layer of security by requiring a verification code from your phone in addition to your password.
        </p>

        {profile?.totp_enabled ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is currently enabled on your account.
              </AlertDescription>
            </Alert>
            <Button
              variant="destructive"
              onClick={() => disableMutation.mutate()}
              disabled={disableMutation.isPending}
            >
              Disable 2FA
            </Button>
          </div>
        ) : (
          <Button onClick={startSetup}>
            Enable Two-Factor Authentication
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
