-- Create provider_credentials table to securely store payment provider keys
CREATE TABLE public.provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL CHECK (provider IN ('stripe', 'kbank', 'opn', 'twoc2p')),
  mode text NOT NULL CHECK (mode IN ('test', 'live')),
  public_key text,
  secret_key text,
  merchant_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, provider, mode)
);

-- Enable RLS
ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;

-- Only owners of the tenant can view/manage their provider credentials
CREATE POLICY "Owners can view their provider credentials"
  ON public.provider_credentials
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.memberships m
      JOIN public.roles r ON m.role_id = r.id
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = provider_credentials.tenant_id
        AND r.name = 'owner'
    )
  );

CREATE POLICY "Owners can insert their provider credentials"
  ON public.provider_credentials
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.memberships m
      JOIN public.roles r ON m.role_id = r.id
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = provider_credentials.tenant_id
        AND r.name = 'owner'
    )
  );

CREATE POLICY "Owners can update their provider credentials"
  ON public.provider_credentials
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.memberships m
      JOIN public.roles r ON m.role_id = r.id
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = provider_credentials.tenant_id
        AND r.name = 'owner'
    )
  );

CREATE POLICY "Owners can delete their provider credentials"
  ON public.provider_credentials
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.memberships m
      JOIN public.roles r ON m.role_id = r.id
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = provider_credentials.tenant_id
        AND r.name = 'owner'
    )
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_provider_credentials_updated_at
  BEFORE UPDATE ON public.provider_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();