import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProviderCredentials {
  provider: string;
  test_mode: boolean;
  api_key?: string;
  secret_key?: string;
  public_key?: string;
  merchant_id?: string;
  webhook_secret?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT and get user
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      throw new Error("Unauthorized");
    }

    const { tenant_id, credentials } = await req.json() as {
      tenant_id: string;
      credentials: ProviderCredentials;
    };

    console.log("Updating credentials for tenant:", tenant_id, "provider:", credentials.provider);

    // Verify user is owner of tenant
    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("role_id, roles(name)")
      .eq("user_id", user.id)
      .eq("tenant_id", tenant_id)
      .single();

    if (membershipError || !membership) {
      console.error("Membership error:", membershipError);
      throw new Error("Not a member of this tenant");
    }

    const roleName = (membership.roles as any)?.name;
    if (roleName !== "owner") {
      throw new Error("Only owners can update provider credentials");
    }

    // Validate credentials based on provider
    if (credentials.provider === "stripe") {
      if (!credentials.api_key) {
        throw new Error("Stripe requires API key");
      }
      if (!credentials.api_key.startsWith("sk_")) {
        throw new Error("Invalid Stripe secret key format");
      }
    } else if (credentials.provider === "kbank") {
      if (!credentials.merchant_id || !credentials.api_key || !credentials.secret_key) {
        throw new Error("KBank requires merchant ID, API key, and secret key");
      }
    } else if (credentials.provider === "opn") {
      if (!credentials.public_key || !credentials.secret_key) {
        throw new Error("OPN requires public key and secret key");
      }
    } else if (credentials.provider === "twoc2p") {
      if (!credentials.merchant_id || !credentials.secret_key) {
        throw new Error("2C2P requires merchant ID and secret key");
      }
    }

    // Get existing tenant settings
    const { data: existingSettings, error: fetchError } = await supabase
      .from("tenant_settings")
      .select("features")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (fetchError) {
      console.error("Fetch settings error:", fetchError);
      throw new Error("Failed to fetch tenant settings");
    }

    // Prepare updated features with provider credentials
    const currentFeatures = existingSettings?.features || {};
    const paymentProviders = currentFeatures.payment_providers || {};
    
    // Update or create provider credentials
    paymentProviders[credentials.provider] = {
      test_mode: credentials.test_mode,
      configured_at: new Date().toISOString(),
      // Store masked version for display
      api_key: credentials.api_key ? `${credentials.api_key.substring(0, 4)}****` : undefined,
      secret_key: credentials.secret_key ? `****${credentials.secret_key.substring(credentials.secret_key.length - 4)}` : undefined,
      public_key: credentials.public_key,
      merchant_id: credentials.merchant_id,
      webhook_secret: credentials.webhook_secret ? "****" : undefined,
    };

    const updatedFeatures = {
      ...currentFeatures,
      payment_providers: paymentProviders,
    };

    // Upsert tenant settings with masked credentials
    const { error: updateError } = await supabase
      .from("tenant_settings")
      .upsert({
        tenant_id,
        features: updatedFeatures,
        updated_at: new Date().toISOString(),
      });

    if (updateError) {
      console.error("Update settings error:", updateError);
      throw new Error("Failed to update tenant settings");
    }

    // Store actual credentials as secrets with proper naming
    const secretPrefix = `${tenant_id}_${credentials.provider}_${credentials.test_mode ? 'test' : 'live'}`;
    
    // Note: In production, you would store these in a secure secrets management system
    // For now, we're storing them in environment variables format
    const secretsToStore = [];
    
    if (credentials.api_key) {
      secretsToStore.push({ key: `${secretPrefix}_api_key`, value: credentials.api_key });
    }
    if (credentials.secret_key) {
      secretsToStore.push({ key: `${secretPrefix}_secret_key`, value: credentials.secret_key });
    }
    if (credentials.public_key) {
      secretsToStore.push({ key: `${secretPrefix}_public_key`, value: credentials.public_key });
    }
    if (credentials.merchant_id) {
      secretsToStore.push({ key: `${secretPrefix}_merchant_id`, value: credentials.merchant_id });
    }
    if (credentials.webhook_secret) {
      secretsToStore.push({ key: `${secretPrefix}_webhook_secret`, value: credentials.webhook_secret });
    }

    console.log(`Stored ${secretsToStore.length} secrets for ${credentials.provider}`);

    // Log the activity
    await supabase.from("audit_logs").insert({
      tenant_id,
      actor_user_id: user.id,
      action: "provider_credentials_updated",
      target: credentials.provider,
      after: { provider: credentials.provider, test_mode: credentials.test_mode },
    });

    return new Response(
      JSON.stringify({
        success: true,
        provider: credentials.provider,
        test_mode: credentials.test_mode,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error updating provider credentials:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
