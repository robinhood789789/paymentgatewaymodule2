-- =============================================
-- COMPLETE DATABASE EXPORT
-- สำหรับนำไปสร้าง Supabase Project ใหม่
-- =============================================

-- =============================================
-- 1. CUSTOM TYPES / ENUMS
-- =============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.kyc_verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.kyc_document_type AS ENUM ('national_id', 'passport', 'driving_license', 'business_registration', 'bank_statement', 'utility_bill', 'other');
CREATE TYPE public.tx_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'REFUND', 'FEE', 'ADJUSTMENT');
CREATE TYPE public.tx_direction AS ENUM ('IN', 'OUT');
CREATE TYPE public.tx_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');
CREATE TYPE public.tx_method AS ENUM ('BANK_TRANSFER', 'CARD', 'PROMPTPAY', 'CASH', 'WALLET', 'OTHER');
CREATE TYPE public.api_key_type AS ENUM ('public', 'secret');

-- =============================================
-- 2. TABLES
-- =============================================

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    totp_secret TEXT,
    totp_enabled BOOLEAN DEFAULT false,
    totp_backup_codes TEXT[],
    is_super_admin BOOLEAN DEFAULT false,
    google_id TEXT,
    google_email TEXT,
    google_verified_email BOOLEAN DEFAULT false,
    google_picture TEXT,
    mfa_last_verified_at TIMESTAMP WITH TIME ZONE,
    requires_password_change BOOLEAN DEFAULT false,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    first_login_completed_at TIMESTAMP WITH TIME ZONE,
    onboard_completed BOOLEAN DEFAULT false,
    password_set_at TIMESTAMP WITH TIME ZONE,
    public_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tenants table
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    kyc_status TEXT DEFAULT 'pending',
    kyc_level INTEGER DEFAULT 0,
    kyc_verified_at TIMESTAMP WITH TIME ZONE,
    kyc_verified_by UUID,
    kyc_notes TEXT,
    fee_plan JSONB DEFAULT '{}'::jsonb,
    risk_rules JSONB DEFAULT '{}'::jsonb,
    payout_bank_name TEXT,
    payout_bank_account TEXT,
    payout_schedule TEXT DEFAULT 'daily',
    brand_logo_url TEXT,
    brand_primary_color TEXT DEFAULT '#000000',
    tax_id TEXT,
    business_type TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    referred_by_code TEXT,
    referred_by_shareholder_id UUID,
    referral_accepted_at TIMESTAMP WITH TIME ZONE,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Roles table
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Permissions table
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- Role Permissions junction table
CREATE TABLE public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- Memberships table (users in tenants)
CREATE TABLE public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, tenant_id)
);

-- Shareholders table
CREATE TABLE public.shareholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    balance BIGINT NOT NULL DEFAULT 0,
    total_earnings BIGINT NOT NULL DEFAULT 0,
    active_clients_count INTEGER NOT NULL DEFAULT 0,
    default_commission_type TEXT DEFAULT 'revenue_share',
    default_commission_value NUMERIC DEFAULT 0,
    allow_self_adjust BOOLEAN DEFAULT false,
    adjust_min_percent NUMERIC DEFAULT 0,
    adjust_max_percent NUMERIC DEFAULT 30,
    referral_code TEXT UNIQUE,
    referral_count INTEGER DEFAULT 0,
    total_commission_earned NUMERIC DEFAULT 0,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shareholder Clients table
CREATE TABLE public.shareholder_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shareholder_id UUID NOT NULL REFERENCES public.shareholders(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    commission_rate NUMERIC NOT NULL DEFAULT 0.00,
    commission_type TEXT DEFAULT 'revenue_share',
    bounty_amount NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    referral_source TEXT,
    notes TEXT,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
    effective_to TIMESTAMP WITH TIME ZONE,
    referred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shareholder Earnings table
CREATE TABLE public.shareholder_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shareholder_id UUID NOT NULL REFERENCES public.shareholders(id),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    payment_id UUID,
    base_amount BIGINT NOT NULL,
    commission_rate NUMERIC NOT NULL,
    amount BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shareholder Invitations table
CREATE TABLE public.shareholder_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shareholder_id UUID NOT NULL REFERENCES public.shareholders(id),
    email TEXT NOT NULL,
    magic_token TEXT NOT NULL,
    temp_password_hash TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    invalidated_at TIMESTAMP WITH TIME ZONE,
    invalidation_reason TEXT,
    resent_count INTEGER NOT NULL DEFAULT 0,
    last_resent_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Transactions table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    owner_user_id UUID,
    owner_tenant_id UUID,
    shareholder_id UUID REFERENCES public.shareholders(id),
    type public.tx_type NOT NULL,
    direction public.tx_direction NOT NULL,
    status public.tx_status NOT NULL DEFAULT 'PENDING',
    method public.tx_method NOT NULL,
    amount NUMERIC NOT NULL,
    fee NUMERIC NOT NULL DEFAULT 0.00,
    net_amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'THB',
    reference TEXT,
    counterparty TEXT,
    note TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by_id UUID,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tenant Wallets table
CREATE TABLE public.tenant_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
    currency TEXT NOT NULL DEFAULT 'THB',
    balance BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    checkout_session_id UUID,
    amount BIGINT NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    method TEXT,
    provider TEXT,
    provider_payment_id TEXT,
    type TEXT DEFAULT 'deposit',
    bank_name TEXT,
    bank_account_number TEXT,
    bank_account_name TEXT,
    withdrawal_notes TEXT,
    metadata JSONB,
    paid_at TIMESTAMP WITH TIME ZONE,
    reconciliation_status TEXT DEFAULT 'unmatched',
    reconciled_at TIMESTAMP WITH TIME ZONE,
    settlement_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Refunds table
CREATE TABLE public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    payment_id UUID,
    amount BIGINT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    provider_refund_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Disputes table
CREATE TABLE public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    amount BIGINT NOT NULL,
    currency TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'open',
    stage TEXT NOT NULL DEFAULT 'inquiry',
    evidence_url TEXT,
    due_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Settlements table
CREATE TABLE public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    provider TEXT NOT NULL,
    cycle TEXT NOT NULL,
    net_amount BIGINT NOT NULL,
    fees BIGINT NOT NULL DEFAULT 0,
    paid_out_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Checkout Sessions table
CREATE TABLE public.checkout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    amount BIGINT NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    method_types JSONB NOT NULL,
    reference TEXT,
    provider TEXT,
    provider_session_id TEXT,
    redirect_url TEXT,
    qr_image_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payment Links table
CREATE TABLE public.payment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    slug TEXT NOT NULL UNIQUE,
    amount BIGINT NOT NULL,
    currency TEXT NOT NULL,
    reference TEXT,
    status TEXT DEFAULT 'active',
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- KYC Documents table
CREATE TABLE public.kyc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    document_type public.kyc_document_type NOT NULL,
    document_number TEXT,
    document_url TEXT,
    status public.kyc_verification_status NOT NULL DEFAULT 'pending',
    verified_by UUID,
    verified_at TIMESTAMP WITH TIME ZONE,
    expiry_date DATE,
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- API Keys table
CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    name TEXT NOT NULL,
    prefix TEXT NOT NULL,
    hashed_key TEXT NOT NULL,
    key_type public.api_key_type NOT NULL,
    scope JSONB DEFAULT '[]'::jsonb,
    allowed_operations JSONB DEFAULT '[]'::jsonb,
    rate_limit_tier TEXT DEFAULT 'standard',
    ip_allowlist JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Webhook Events table
CREATE TABLE public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    provider TEXT,
    event_type TEXT,
    payload JSONB,
    status TEXT DEFAULT 'queued',
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Provider Events table
CREATE TABLE public.provider_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Audit Logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    actor_user_id UUID,
    action TEXT NOT NULL,
    target TEXT,
    before JSONB,
    after JSONB,
    ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Admin Activity table
CREATE TABLE public.admin_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL,
    action TEXT NOT NULL,
    target_tenant_id UUID,
    target_user_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Approvals table
CREATE TABLE public.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    action_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    requested_by UUID NOT NULL,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Temporary Codes table
CREATE TABLE public.temporary_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    user_id UUID NOT NULL,
    code TEXT NOT NULL UNIQUE,
    purpose TEXT NOT NULL,
    issued_by UUID,
    issued_from_context TEXT,
    max_uses INTEGER NOT NULL DEFAULT 1,
    uses_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CSRF Tokens table
CREATE TABLE public.csrf_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Rate Limits table
CREATE TABLE public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(identifier, endpoint, window_start)
);

-- HMAC Replay Cache table
CREATE TABLE public.hmac_replay_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id TEXT NOT NULL,
    signature_hash TEXT NOT NULL UNIQUE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ID Sequences table
CREATE TABLE public.id_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prefix TEXT NOT NULL UNIQUE,
    current_value INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Role Assignments Log table
CREATE TABLE public.role_assignments_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    action TEXT NOT NULL,
    previous_role_id UUID,
    assigned_by UUID,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Role Templates table
CREATE TABLE public.role_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Platform Settings table
CREATE TABLE public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    category TEXT DEFAULT 'general',
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Platform Security Policy table
CREATE TABLE public.platform_security_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    force_2fa_for_super_admin BOOLEAN NOT NULL DEFAULT true,
    force_2fa_for_all_roles BOOLEAN DEFAULT true,
    default_require_2fa_for_owner BOOLEAN NOT NULL DEFAULT true,
    default_require_2fa_for_admin BOOLEAN NOT NULL DEFAULT true,
    default_stepup_window_seconds INTEGER NOT NULL DEFAULT 300,
    first_login_require_mfa BOOLEAN DEFAULT true,
    first_login_require_password_change BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tenant Security Policy table
CREATE TABLE public.tenant_security_policy (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    require_2fa_for_owner BOOLEAN DEFAULT true,
    require_2fa_for_admin BOOLEAN DEFAULT true,
    require_2fa_for_manager BOOLEAN DEFAULT true,
    require_2fa_for_finance BOOLEAN DEFAULT false,
    require_2fa_for_developer BOOLEAN DEFAULT false,
    stepup_window_seconds INTEGER DEFAULT 300,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Platform Provider Credentials table
CREATE TABLE public.platform_provider_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    mode TEXT NOT NULL,
    public_key TEXT,
    secret_key TEXT,
    merchant_id TEXT,
    webhook_secret TEXT,
    feature_flags JSONB DEFAULT '{}'::jsonb,
    created_by UUID,
    last_rotated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Platform Provisioning Tokens table
CREATE TABLE public.platform_provisioning_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id TEXT NOT NULL UNIQUE,
    platform_name TEXT NOT NULL,
    hashed_secret TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    notes TEXT,
    ip_allowlist JSONB DEFAULT '[]'::jsonb,
    allowed_tenants JSONB DEFAULT '["*"]'::jsonb,
    created_by UUID,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Alerts table
CREATE TABLE public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    condition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Alert Events table
CREATE TABLE public.alert_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES public.alerts(id),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    data JSONB
);

-- Customers table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    email TEXT NOT NULL,
    name TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Guardrails table
CREATE TABLE public.guardrails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    rule_type TEXT NOT NULL,
    rule_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Go Live Checklist table
CREATE TABLE public.go_live_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    item TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Idempotency Keys table
CREATE TABLE public.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    tenant_id UUID,
    response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- 3. VIEWS
-- =============================================

-- Daily Transaction Summary by Tenant
CREATE OR REPLACE VIEW public.v_tx_daily_by_tenant AS
SELECT 
    tenant_id,
    DATE(created_at) as tx_date,
    SUM(CASE WHEN direction = 'IN' THEN net_amount ELSE 0 END) as net_in,
    SUM(CASE WHEN direction = 'OUT' THEN net_amount ELSE 0 END) as net_out,
    SUM(CASE WHEN type = 'DEPOSIT' THEN net_amount ELSE 0 END) as deposit_net,
    SUM(CASE WHEN type = 'WITHDRAWAL' THEN net_amount ELSE 0 END) as withdrawal_net,
    SUM(CASE WHEN type = 'TRANSFER' THEN net_amount ELSE 0 END) as transfer_net,
    COUNT(*) as tx_count,
    COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_count,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
    COUNT(*) FILTER (WHERE status = 'FAILED') as failed_count
FROM public.transactions
GROUP BY tenant_id, DATE(created_at);

-- Daily Transaction Summary by Shareholder
CREATE OR REPLACE VIEW public.v_tx_daily_by_shareholder AS
SELECT 
    shareholder_id,
    DATE(created_at) as tx_date,
    SUM(CASE WHEN direction = 'IN' THEN net_amount ELSE 0 END) as net_in,
    SUM(CASE WHEN direction = 'OUT' THEN net_amount ELSE 0 END) as net_out,
    SUM(CASE WHEN type = 'DEPOSIT' THEN net_amount ELSE 0 END) as deposit_net,
    SUM(CASE WHEN type = 'WITHDRAWAL' THEN net_amount ELSE 0 END) as withdrawal_net,
    SUM(CASE WHEN type = 'TRANSFER' THEN net_amount ELSE 0 END) as transfer_net,
    COUNT(*) as tx_count,
    COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_count,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
    COUNT(*) FILTER (WHERE status = 'FAILED') as failed_count
FROM public.transactions
WHERE shareholder_id IS NOT NULL
GROUP BY shareholder_id, DATE(created_at);

-- Monthly Transaction Summary by Shareholder
CREATE OR REPLACE VIEW public.v_tx_monthly_by_shareholder AS
SELECT 
    shareholder_id,
    DATE_TRUNC('month', created_at) as tx_month,
    SUM(CASE WHEN direction = 'IN' THEN net_amount ELSE 0 END) as net_in,
    SUM(CASE WHEN direction = 'OUT' THEN net_amount ELSE 0 END) as net_out,
    SUM(CASE WHEN type = 'DEPOSIT' THEN net_amount ELSE 0 END) as deposit_net,
    SUM(CASE WHEN type = 'WITHDRAWAL' THEN net_amount ELSE 0 END) as withdrawal_net,
    SUM(CASE WHEN type = 'TRANSFER' THEN net_amount ELSE 0 END) as transfer_net,
    SUM(fee) as total_fees,
    COUNT(*) as tx_count,
    COUNT(*) FILTER (WHERE status = 'SUCCESS') as success_count
FROM public.transactions
WHERE shareholder_id IS NOT NULL
GROUP BY shareholder_id, DATE_TRUNC('month', created_at);

-- =============================================
-- 4. FUNCTIONS
-- =============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = user_uuid),
    false
  );
$$;

-- Check if user is shareholder
CREATE OR REPLACE FUNCTION public.is_shareholder(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shareholders
    WHERE user_id = user_uuid AND status = 'active'
  );
$$;

-- Get shareholder ID
CREATE OR REPLACE FUNCTION public.get_shareholder_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT id FROM public.shareholders
  WHERE user_id = user_uuid AND status = 'active'
  LIMIT 1;
$$;

-- Get user's tenant ID
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT tenant_id FROM public.memberships WHERE user_id = user_uuid LIMIT 1;
$$;

-- Check if user has specific role in tenant
CREATE OR REPLACE FUNCTION public.user_has_role_in_tenant(user_uuid uuid, role_name text, tenant_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    JOIN public.roles r ON m.role_id = r.id
    WHERE m.user_id = user_uuid
      AND m.tenant_id = tenant_uuid
      AND r.name = role_name
  );
$$;

-- Check if user is member of tenant
CREATE OR REPLACE FUNCTION public.is_member_of_tenant(tenant_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND tenant_id = tenant_uuid
  );
$$;

-- Get tenant from request header
CREATE OR REPLACE FUNCTION public.request_tenant()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT NULLIF(current_setting('request.headers', true)::json->>'x-tenant', '')::uuid;
$$;

-- Generate public ID with prefix
CREATE OR REPLACE FUNCTION public.generate_public_id(prefix_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  next_value INTEGER;
  new_public_id TEXT;
BEGIN
  -- Lock and increment the sequence
  UPDATE public.id_sequences
  SET 
    current_value = current_value + 1,
    updated_at = now()
  WHERE prefix = prefix_code
  RETURNING current_value INTO next_value;
  
  IF next_value IS NULL THEN
    RAISE EXCEPTION 'Sequence prefix % not found', prefix_code;
  END IF;
  
  -- Format as PREFIX-NNNNNN (6 digits)
  new_public_id := prefix_code || '-' || LPAD(next_value::TEXT, 6, '0');
  
  RETURN new_public_id;
END;
$$;

-- Get email by public ID
CREATE OR REPLACE FUNCTION public.get_email_by_public_id(input_public_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM public.profiles
  WHERE public_id = input_public_id
  LIMIT 1;
  
  RETURN user_email;
END;
$$;

-- Apply wallet delta (increase/decrease balance)
CREATE OR REPLACE FUNCTION public.wallet_apply_delta(p_tenant_id uuid, p_currency text, p_direction tx_direction, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF p_tenant_id IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;

  -- Create wallet if not exists
  INSERT INTO public.tenant_wallets (id, tenant_id, currency, balance, created_at, updated_at)
  VALUES (gen_random_uuid(), p_tenant_id, COALESCE(p_currency, 'THB'), 0.00, now(), now())
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Update balance based on direction
  IF p_direction = 'IN' THEN
    UPDATE public.tenant_wallets
    SET balance = balance + p_amount,
        updated_at = now()
    WHERE tenant_id = p_tenant_id;
  ELSIF p_direction = 'OUT' THEN
    UPDATE public.tenant_wallets
    SET balance = balance - p_amount,
        updated_at = now()
    WHERE tenant_id = p_tenant_id;
  END IF;
END;
$$;

-- Reverse wallet delta
CREATE OR REPLACE FUNCTION public.wallet_reverse_delta(p_tenant_id uuid, p_currency text, p_direction tx_direction, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF p_tenant_id IS NULL OR p_amount <= 0 THEN
    RETURN;
  END IF;

  -- Create wallet if not exists
  INSERT INTO public.tenant_wallets (id, tenant_id, currency, balance, created_at, updated_at)
  VALUES (gen_random_uuid(), p_tenant_id, COALESCE(p_currency, 'THB'), 0.00, now(), now())
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Reverse the balance change
  IF p_direction = 'IN' THEN
    UPDATE public.tenant_wallets
    SET balance = balance - p_amount,
        updated_at = now()
    WHERE tenant_id = p_tenant_id;
  ELSIF p_direction = 'OUT' THEN
    UPDATE public.tenant_wallets
    SET balance = balance + p_amount,
        updated_at = now()
    WHERE tenant_id = p_tenant_id;
  END IF;
END;
$$;

-- Update tenant KYC status based on documents
CREATE OR REPLACE FUNCTION public.update_tenant_kyc_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  approved_docs_count INTEGER;
  new_kyc_level INTEGER;
BEGIN
  -- Count approved documents
  SELECT COUNT(*) INTO approved_docs_count
  FROM public.kyc_documents
  WHERE tenant_id = NEW.tenant_id
  AND status = 'approved';

  -- Determine KYC level
  IF approved_docs_count >= 5 THEN
    new_kyc_level := 3;
  ELSIF approved_docs_count >= 3 THEN
    new_kyc_level := 2;
  ELSIF approved_docs_count >= 1 THEN
    new_kyc_level := 1;
  ELSE
    new_kyc_level := 0;
  END IF;

  -- Update tenant
  UPDATE public.tenants
  SET 
    kyc_level = new_kyc_level,
    kyc_status = CASE 
      WHEN new_kyc_level >= 2 THEN 'verified'
      WHEN new_kyc_level = 1 THEN 'pending'
      ELSE 'pending'
    END,
    kyc_verified_at = CASE 
      WHEN new_kyc_level >= 2 THEN now()
      ELSE kyc_verified_at
    END,
    kyc_verified_by = CASE 
      WHEN new_kyc_level >= 2 THEN NEW.verified_by
      ELSE kyc_verified_by
    END
  WHERE id = NEW.tenant_id;

  RETURN NEW;
END;
$$;

-- Generate referral code for shareholders
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'SH' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM shareholders WHERE referral_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Assign referral code on shareholder insert
CREATE OR REPLACE FUNCTION public.assign_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Track referral when tenant is created
CREATE OR REPLACE FUNCTION public.track_referral_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  shareholder_record RECORD;
BEGIN
  IF NEW.referred_by_code IS NOT NULL THEN
    SELECT * INTO shareholder_record
    FROM public.shareholders
    WHERE referral_code = NEW.referred_by_code
    AND status = 'active';
    
    IF FOUND THEN
      NEW.referred_by_shareholder_id := shareholder_record.id;
      NEW.referral_accepted_at := now();
      
      INSERT INTO public.shareholder_clients (
        shareholder_id,
        tenant_id,
        commission_rate,
        status,
        referral_source
      ) VALUES (
        shareholder_record.id,
        NEW.id,
        5.0,
        'active',
        'referral_code'
      );
      
      UPDATE public.shareholders
      SET referral_count = referral_count + 1
      WHERE id = shareholder_record.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Validate API key access
CREATE OR REPLACE FUNCTION public.validate_api_key_access(_prefix text, _endpoint text, _ip inet)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  key_record RECORD;
BEGIN
  SELECT * INTO key_record
  FROM public.api_keys
  WHERE prefix = _prefix
    AND status = 'active'
    AND is_active = true
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid_or_expired');
  END IF;
  
  UPDATE public.api_keys
  SET last_used_at = now()
  WHERE id = key_record.id;
  
  RETURN jsonb_build_object(
    'valid', true,
    'tenant_id', key_record.tenant_id,
    'key_type', key_record.key_type,
    'scope', key_record.scope
  );
END;
$$;

-- Cleanup replay cache
CREATE OR REPLACE FUNCTION public.cleanup_replay_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  DELETE FROM public.hmac_replay_cache
  WHERE created_at < now() - interval '10 minutes';
END;
$$;

-- Cleanup expired temporary codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  UPDATE public.temporary_codes
  SET is_active = false, updated_at = now()
  WHERE is_active = true AND expires_at < now();
END;
$$;

-- Audit security changes
CREATE OR REPLACE FUNCTION public.audit_security_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  user_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO user_tenant_id
  FROM public.memberships
  WHERE user_id = COALESCE(NEW.id, OLD.id)
  LIMIT 1;
  
  IF user_tenant_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      tenant_id, actor_user_id, action, target, before, after, ip, user_agent
    ) VALUES (
      user_tenant_id,
      auth.uid(),
      TG_OP || '_user_security',
      'profiles:' || COALESCE(NEW.id::text, OLD.id::text),
      to_jsonb(OLD),
      to_jsonb(NEW),
      inet_client_addr()::text,
      current_setting('request.headers', true)::json->>'user-agent'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Transaction after insert trigger function
CREATE OR REPLACE FUNCTION public.trg_tx_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.status = 'SUCCESS' THEN
    PERFORM public.wallet_apply_delta(NEW.tenant_id, NEW.currency, NEW.direction, NEW.net_amount);
  END IF;

  INSERT INTO public.audit_logs (tenant_id, actor_user_id, action, target, after, created_at)
  VALUES (
    NEW.tenant_id, 
    NEW.created_by_id, 
    'TX_CREATE', 
    'transactions:' || NEW.id::text,
    jsonb_build_object(
      'type', NEW.type, 
      'status', NEW.status, 
      'amount', NEW.amount, 
      'net_amount', NEW.net_amount,
      'direction', NEW.direction,
      'method', NEW.method
    ),
    now()
  );

  RETURN NEW;
END;
$$;

-- Transaction after update trigger function
CREATE OR REPLACE FUNCTION public.trg_tx_after_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- From non-SUCCESS to SUCCESS
  IF (OLD.status <> 'SUCCESS') AND (NEW.status = 'SUCCESS') THEN
    PERFORM public.wallet_apply_delta(NEW.tenant_id, NEW.currency, NEW.direction, NEW.net_amount);
    NEW.processed_at = now();
  END IF;

  -- From SUCCESS to non-SUCCESS
  IF (OLD.status = 'SUCCESS') AND (NEW.status <> 'SUCCESS') THEN
    PERFORM public.wallet_reverse_delta(OLD.tenant_id, OLD.currency, OLD.direction, OLD.net_amount);
  END IF;

  -- Audit status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (tenant_id, actor_user_id, action, target, before, after, created_at)
    VALUES (
      NEW.tenant_id,
      NEW.created_by_id,
      'TX_STATUS_UPDATE',
      'transactions:' || NEW.id::text,
      jsonb_build_object('status', OLD.status, 'processed_at', OLD.processed_at),
      jsonb_build_object('status', NEW.status, 'processed_at', NEW.processed_at),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  RETURN NEW;
END;
$$;

-- Update platform settings timestamp
CREATE OR REPLACE FUNCTION public.update_platform_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================
-- 5. TRIGGERS
-- =============================================

-- Profiles triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER audit_profile_security_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.totp_enabled IS DISTINCT FROM NEW.totp_enabled 
    OR OLD.requires_password_change IS DISTINCT FROM NEW.requires_password_change)
  EXECUTE FUNCTION public.audit_security_change();

-- Tenants triggers
CREATE TRIGGER track_tenant_referral
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.track_referral_signup();

-- Shareholders triggers
CREATE TRIGGER assign_shareholder_referral_code
  BEFORE INSERT ON public.shareholders
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_referral_code();

CREATE TRIGGER update_shareholders_updated_at
  BEFORE UPDATE ON public.shareholders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Shareholder Clients triggers
CREATE TRIGGER update_shareholder_clients_updated_at
  BEFORE UPDATE ON public.shareholder_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Transactions triggers
CREATE TRIGGER tx_after_insert
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_tx_after_insert();

CREATE TRIGGER tx_after_update
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_tx_after_update();

-- KYC Documents triggers
CREATE TRIGGER update_kyc_documents_updated_at
  BEFORE UPDATE ON public.kyc_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tenant_kyc_on_document_change
  AFTER INSERT OR UPDATE ON public.kyc_documents
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION public.update_tenant_kyc_status();

-- Platform Settings triggers
CREATE TRIGGER update_platform_settings_timestamp
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_platform_settings_updated_at();

-- Tenant Wallets triggers
CREATE TRIGGER update_tenant_wallets_updated_at
  BEFORE UPDATE ON public.tenant_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Temporary Codes triggers
CREATE TRIGGER update_temporary_codes_updated_at
  BEFORE UPDATE ON public.temporary_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Platform Provider Credentials triggers
CREATE TRIGGER update_platform_provider_credentials_updated_at
  BEFORE UPDATE ON public.platform_provider_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Platform Security Policy triggers
CREATE TRIGGER update_platform_security_policy_updated_at
  BEFORE UPDATE ON public.platform_security_policy
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Tenant Security Policy triggers
CREATE TRIGGER update_tenant_security_policy_updated_at
  BEFORE UPDATE ON public.tenant_security_policy
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Disputes triggers
CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Settlements triggers
CREATE TRIGGER update_settlements_updated_at
  BEFORE UPDATE ON public.settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shareholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shareholder_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shareholder_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shareholder_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporary_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csrf_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hmac_replay_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.id_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_assignments_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_security_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_security_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_provisioning_tokens ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view profiles in their tenants" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m_self
      JOIN memberships m_target ON m_self.tenant_id = m_target.tenant_id
      WHERE m_self.user_id = auth.uid() AND m_target.user_id = profiles.id
    ) OR is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all profiles" ON public.profiles
  FOR UPDATE USING (is_super_admin(auth.uid()));

-- Tenants RLS Policies
CREATE POLICY "Users can view tenants they belong to" ON public.tenants
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid())
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins can manage all tenants" ON public.tenants
  FOR ALL USING (is_super_admin(auth.uid()));

-- Shareholders RLS Policies
CREATE POLICY "Shareholders can view their own data" ON public.shareholders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Shareholders can update their own data" ON public.shareholders
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Super admins can manage all shareholders" ON public.shareholders
  FOR ALL USING (is_super_admin(auth.uid()));

-- Shareholder Clients RLS Policies
CREATE POLICY "Shareholders can view their clients" ON public.shareholder_clients
  FOR SELECT USING (shareholder_id = get_shareholder_id(auth.uid()));

CREATE POLICY "Shareholders can update their clients commission" ON public.shareholder_clients
  FOR UPDATE USING (shareholder_id = get_shareholder_id(auth.uid()));

CREATE POLICY "Super admins can manage all shareholder clients" ON public.shareholder_clients
  FOR ALL USING (is_super_admin(auth.uid()));

-- Shareholder Earnings RLS Policies
CREATE POLICY "Shareholders can view their earnings" ON public.shareholder_earnings
  FOR SELECT USING (shareholder_id = get_shareholder_id(auth.uid()));

CREATE POLICY "Super admins can view all earnings" ON public.shareholder_earnings
  FOR SELECT USING (is_super_admin(auth.uid()));

-- Transactions RLS Policies
CREATE POLICY "Users can view transactions in their tenant" ON public.transactions
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Shareholders can view their transactions" ON public.transactions
  FOR SELECT USING (
    shareholder_id IN (
      SELECT id FROM shareholders WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Authorized users can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT m.tenant_id FROM memberships m
      JOIN roles r ON m.role_id = r.id
      WHERE m.user_id = auth.uid()
      AND r.name IN ('owner', 'admin', 'manager', 'finance')
    ) AND created_by_id = auth.uid()
  );

CREATE POLICY "Authorized users can update transactions" ON public.transactions
  FOR UPDATE USING (
    tenant_id IN (
      SELECT m.tenant_id FROM memberships m
      JOIN roles r ON m.role_id = r.id
      WHERE m.user_id = auth.uid()
      AND r.name IN ('owner', 'admin', 'manager', 'finance')
    )
  );

CREATE POLICY "Super admins can manage all transactions" ON public.transactions
  FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Service role can manage all transactions" ON public.transactions
  FOR ALL USING (true);

-- Tenant Wallets RLS Policies
CREATE POLICY "Users can view their tenant wallet" ON public.tenant_wallets
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Payments RLS Policies
CREATE POLICY "Users can view payments in their tenant" ON public.payments
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Audit Logs RLS Policies
CREATE POLICY "Users can view audit logs in their tenant" ON public.audit_logs
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Super admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role') = 'service_role' OR is_super_admin(auth.uid())
  );

CREATE POLICY "Audit logs are immutable" ON public.audit_logs
  FOR UPDATE USING (false);

CREATE POLICY "Audit logs cannot be deleted" ON public.audit_logs
  FOR DELETE USING (false);

-- Temporary Codes RLS Policies
CREATE POLICY "Users can view temporary codes they issued" ON public.temporary_codes
  FOR SELECT USING (issued_by = auth.uid());

CREATE POLICY "Shareholders can view codes for their clients" ON public.temporary_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shareholder_clients sc
      WHERE sc.tenant_id = temporary_codes.tenant_id
      AND sc.shareholder_id = get_shareholder_id(auth.uid())
    )
  );

CREATE POLICY "Super admins can manage all temporary codes" ON public.temporary_codes
  FOR ALL USING (is_super_admin(auth.uid()));

CREATE POLICY "Service role can manage temporary codes" ON public.temporary_codes
  FOR ALL USING (true);

-- Platform Settings RLS Policies
CREATE POLICY "Super admins can manage platform settings" ON public.platform_settings
  FOR ALL USING (is_super_admin(auth.uid()));

-- Platform Security Policy RLS Policies
CREATE POLICY "Super admins can manage platform security" ON public.platform_security_policy
  FOR ALL USING (is_super_admin(auth.uid()));

-- Tenant Security Policy RLS Policies
CREATE POLICY "Users can view their tenant security policy" ON public.tenant_security_policy
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Owners can manage their tenant security policy" ON public.tenant_security_policy
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN roles r ON m.role_id = r.id
      WHERE m.user_id = auth.uid()
      AND m.tenant_id = tenant_security_policy.tenant_id
      AND r.name = 'owner'
    )
  );

-- Add similar policies for other tables...
-- (Refunds, Disputes, Settlements, Checkout Sessions, Payment Links, etc.)

CREATE POLICY "Users can view refunds in their tenant" ON public.refunds
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can view disputes in their tenant" ON public.disputes
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can view settlements in their tenant" ON public.settlements
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can view checkout sessions in their tenant" ON public.checkout_sessions
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can view payment links in their tenant" ON public.payment_links
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can view webhook events in their tenant" ON public.webhook_events
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can view approvals in their tenant" ON public.approvals
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can view role assignments in their tenant" ON public.role_assignments_log
  FOR SELECT USING (tenant_id = get_user_tenant_id(auth.uid()));

-- KYC Documents RLS Policies
CREATE POLICY "Users can view own tenant KYC documents" ON public.kyc_documents
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert KYC documents" ON public.kyc_documents
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT m.tenant_id FROM memberships m
      JOIN role_permissions rp ON m.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE m.user_id = auth.uid() AND p.name = 'kyc.manage'
    )
  );

CREATE POLICY "Super admins can view all KYC documents" ON public.kyc_documents
  FOR SELECT USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update KYC documents" ON public.kyc_documents
  FOR UPDATE USING (is_super_admin(auth.uid()));

-- Admin Activity RLS Policies
CREATE POLICY "Super admins can view admin activity" ON public.admin_activity
  FOR SELECT USING (is_super_admin(auth.uid()));

-- Shareholder Invitations RLS Policies
CREATE POLICY "Super admins can manage shareholder invitations" ON public.shareholder_invitations
  FOR ALL USING (is_super_admin(auth.uid()));

-- Platform Provider Credentials RLS Policies
CREATE POLICY "Super admins can manage platform credentials" ON public.platform_provider_credentials
  FOR ALL USING (is_super_admin(auth.uid()));

-- Platform Provisioning Tokens RLS Policies
CREATE POLICY "Super admins can manage platform tokens" ON public.platform_provisioning_tokens
  FOR ALL USING (is_super_admin(auth.uid()));

-- Provider Events RLS Policies
CREATE POLICY "Service role can manage provider events" ON public.provider_events
  FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');

-- HMAC Replay Cache RLS Policies
CREATE POLICY "Service role can manage replay cache" ON public.hmac_replay_cache
  FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');

-- ID Sequences RLS Policies
CREATE POLICY "Service role can manage id_sequences" ON public.id_sequences
  FOR ALL USING (
    (auth.jwt() ->> 'role') = 'service_role' OR is_super_admin(auth.uid())
  );

-- Role Templates RLS Policies
CREATE POLICY "Super admins can view role templates" ON public.role_templates
  FOR SELECT USING (is_super_admin(auth.uid()));

-- Permissions RLS Policies
CREATE POLICY "Super admins can view all permissions" ON public.permissions
  FOR SELECT USING (is_super_admin(auth.uid()));

-- =============================================
-- 7. INDEXES (for performance)
-- =============================================

CREATE INDEX idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX idx_memberships_tenant_id ON public.memberships(tenant_id);
CREATE INDEX idx_memberships_role_id ON public.memberships(role_id);
CREATE INDEX idx_transactions_tenant_id ON public.transactions(tenant_id);
CREATE INDEX idx_transactions_shareholder_id ON public.transactions(shareholder_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_shareholders_user_id ON public.shareholders(user_id);
CREATE INDEX idx_shareholder_clients_shareholder_id ON public.shareholder_clients(shareholder_id);
CREATE INDEX idx_shareholder_clients_tenant_id ON public.shareholder_clients(tenant_id);
CREATE INDEX idx_shareholder_earnings_shareholder_id ON public.shareholder_earnings(shareholder_id);
CREATE INDEX idx_kyc_documents_tenant_id ON public.kyc_documents(tenant_id);

-- =============================================
-- 8. INITIAL DATA (Optional)
-- =============================================

-- Insert default roles
INSERT INTO public.roles (name, description) VALUES
  ('owner', 'Full access to tenant'),
  ('admin', 'Administrative access'),
  ('manager', 'Management access'),
  ('finance', 'Finance operations'),
  ('developer', 'API and technical access'),
  ('viewer', 'Read-only access')
ON CONFLICT (name) DO NOTHING;

-- Insert ID sequence prefixes
INSERT INTO public.id_sequences (prefix, current_value) VALUES
  ('USR', 0),
  ('TNT', 0),
  ('SH', 0),
  ('TRX', 0)
ON CONFLICT (prefix) DO NOTHING;

-- =============================================
-- END OF DATABASE EXPORT
-- =============================================
