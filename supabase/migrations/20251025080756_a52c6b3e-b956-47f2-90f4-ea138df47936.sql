-- Create platform-level provider credentials table (Super Admin only)
CREATE TABLE IF NOT EXISTS public.platform_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'opn', 'twoc2p', 'kbank')),
  mode TEXT NOT NULL CHECK (mode IN ('test', 'live')),
  public_key TEXT,
  secret_key TEXT,
  merchant_id TEXT,
  webhook_secret TEXT,
  feature_flags JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  last_rotated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(provider, mode)
);

-- Enable RLS
ALTER TABLE public.platform_provider_credentials ENABLE ROW LEVEL SECURITY;

-- Super admins only can manage platform credentials
CREATE POLICY "Super admins can manage platform credentials"
  ON public.platform_provider_credentials
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Create trigger to update updated_at
CREATE TRIGGER update_platform_provider_credentials_updated_at
  BEFORE UPDATE ON public.platform_provider_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create tenant provider assignment table
CREATE TABLE IF NOT EXISTS public.tenant_provider_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'opn', 'twoc2p', 'kbank')),
  mode TEXT NOT NULL CHECK (mode IN ('test', 'live')),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.tenant_provider_assignments ENABLE ROW LEVEL SECURITY;

-- Tenants can view their own assignment (read-only)
CREATE POLICY "Tenants can view their provider assignment"
  ON public.tenant_provider_assignments
  FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Super admins can manage all assignments
CREATE POLICY "Super admins can manage provider assignments"
  ON public.tenant_provider_assignments
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_platform_provider_credentials_provider ON public.platform_provider_credentials(provider);
CREATE INDEX idx_tenant_provider_assignments_tenant_id ON public.tenant_provider_assignments(tenant_id);
CREATE INDEX idx_tenant_provider_assignments_provider ON public.tenant_provider_assignments(provider);

-- Drop old tenant-scoped provider_credentials table policies and table
DROP POLICY IF EXISTS "Owners can delete their provider credentials" ON public.provider_credentials;
DROP POLICY IF EXISTS "Owners can insert their provider credentials" ON public.provider_credentials;
DROP POLICY IF EXISTS "Owners can update their provider credentials" ON public.provider_credentials;
DROP POLICY IF EXISTS "Owners can view their provider credentials" ON public.provider_credentials;
DROP TABLE IF EXISTS public.provider_credentials CASCADE;