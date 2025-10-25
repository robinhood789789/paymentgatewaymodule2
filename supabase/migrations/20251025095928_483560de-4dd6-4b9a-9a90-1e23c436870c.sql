-- Extend api_keys table with full provisioning fields
ALTER TABLE public.api_keys
ADD COLUMN IF NOT EXISTS scope jsonb DEFAULT '{"endpoints": ["*"]}'::jsonb,
ADD COLUMN IF NOT EXISTS env text DEFAULT 'sandbox' CHECK (env IN ('sandbox', 'production')),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + interval '90 days'),
ADD COLUMN IF NOT EXISTS ip_allowlist jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS notes text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON public.api_keys(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON public.api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- Platform provisioning tokens for external systems
CREATE TABLE IF NOT EXISTS public.platform_provisioning_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id text UNIQUE NOT NULL,
  platform_name text NOT NULL,
  hashed_secret text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  last_used_at timestamp with time zone,
  revoked_at timestamp with time zone,
  ip_allowlist jsonb DEFAULT '[]'::jsonb,
  allowed_tenants jsonb DEFAULT '["*"]'::jsonb,
  notes text
);

ALTER TABLE public.platform_provisioning_tokens ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage platform tokens
CREATE POLICY "Super admins can manage platform tokens"
ON public.platform_provisioning_tokens
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Replay attack prevention cache
CREATE TABLE IF NOT EXISTS public.hmac_replay_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_hash text UNIQUE NOT NULL,
  timestamp timestamp with time zone NOT NULL,
  platform_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.hmac_replay_cache ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service role can manage replay cache"
ON public.hmac_replay_cache
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Auto-cleanup old replay cache entries (older than 10 minutes)
CREATE INDEX IF NOT EXISTS idx_hmac_replay_created ON public.hmac_replay_cache(created_at);

-- Function to clean old replay cache
CREATE OR REPLACE FUNCTION public.cleanup_replay_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.hmac_replay_cache
  WHERE created_at < now() - interval '10 minutes';
END;
$$;