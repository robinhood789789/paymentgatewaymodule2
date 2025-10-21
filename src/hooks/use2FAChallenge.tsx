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
        .select('totp_enabled, mfa_last_verified_at')
        .eq('id', user.id)
        .single();

      if (!profile?.totp_enabled) {
        // No 2FA enabled, proceed directly
        action();
        return true;
      }

      // Check if verification is still valid (within stepup window)
      const lastVerified = profile.mfa_last_verified_at 
        ? new Date(profile.mfa_last_verified_at) 
        : null;
      const now = new Date();
      const stepupWindow = 300; // 5 minutes in seconds

      if (lastVerified) {
        const diffInSeconds = (now.getTime() - lastVerified.getTime()) / 1000;
        if (diffInSeconds < stepupWindow) {
          // Still within step-up window, proceed
          action();
          return true;
        }
      }

      // Need to challenge
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
