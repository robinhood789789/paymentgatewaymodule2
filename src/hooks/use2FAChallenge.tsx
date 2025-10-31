import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function use2FAChallenge() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const checkAndChallenge = async (action: () => void): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('totp_enabled, mfa_last_verified_at, is_super_admin')
        .eq('id', user.id)
        .single();

      // Super Admin must have MFA enabled
      if (profile?.is_super_admin && !profile?.totp_enabled) {
        throw new Error('Super Admin ต้องเปิดใช้งาน MFA ก่อน กรุณาไปที่ Settings > Security เพื่อตั้งค่า');
      }

      // Non-super admin without MFA can proceed
      if (!profile?.totp_enabled) {
        action();
        return true;
      }

      // Check stepup window (default 5 min = 300 sec)
      const lastVerified = profile.mfa_last_verified_at 
        ? new Date(profile.mfa_last_verified_at) 
        : null;
      const now = new Date();
      const stepupWindow = 300;

      if (lastVerified) {
        const diffInSeconds = (now.getTime() - lastVerified.getTime()) / 1000;
        if (diffInSeconds < stepupWindow) {
          action();
          return true;
        }
      }

      // Need Step-Up MFA challenge
      setPendingAction(() => action);
      setIsOpen(true);
      return false;
    } catch (error) {
      console.error('2FA check failed:', error);
      return false;
    }
  };

  const onSuccess = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  return {
    isOpen,
    setIsOpen,
    checkAndChallenge,
    onSuccess,
  };
}
