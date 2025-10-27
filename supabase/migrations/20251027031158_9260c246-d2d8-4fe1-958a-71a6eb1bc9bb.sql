-- Add withdrawal limits and settings
ALTER TABLE public.tenant_settings
ADD COLUMN IF NOT EXISTS withdrawal_daily_limit BIGINT DEFAULT 1000000, -- 10,000 THB in smallest unit
ADD COLUMN IF NOT EXISTS withdrawal_per_transaction_limit BIGINT DEFAULT 500000, -- 5,000 THB
ADD COLUMN IF NOT EXISTS withdrawal_approval_threshold BIGINT DEFAULT 10000000, -- 100,000 THB requires approval
ADD COLUMN IF NOT EXISTS require_2fa_for_withdrawal BOOLEAN DEFAULT true;

-- Add withdrawal tracking for daily limits
CREATE TABLE IF NOT EXISTS public.withdrawal_daily_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount BIGINT NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, date)
);

-- Enable RLS
ALTER TABLE public.withdrawal_daily_totals ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can view their tenant's withdrawal totals
CREATE POLICY "Owners can view their withdrawal totals"
ON public.withdrawal_daily_totals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.roles r ON m.role_id = r.id
    WHERE m.user_id = auth.uid()
    AND m.tenant_id = withdrawal_daily_totals.tenant_id
    AND r.name = 'owner'
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_daily_totals_tenant_date 
ON public.withdrawal_daily_totals(tenant_id, date);

-- Add bank account info to payments table for withdrawals
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
ADD COLUMN IF NOT EXISTS withdrawal_notes TEXT;