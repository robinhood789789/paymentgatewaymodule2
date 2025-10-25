import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { requireStepUp } from "../_shared/mfa-guards.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-tenant, x-mfa-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tenantId = req.headers.get("x-tenant");
    const authHeader = req.headers.get("authorization");

    if (!tenantId || !authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing tenant or authorization" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Check if user is owner of the tenant
    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("role_id, roles!inner(name)")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .single();

    if (membershipError || !membership) {
      return new Response(JSON.stringify({ error: "Not a member" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const roleName = (membership as any).roles?.name;
    if (roleName !== "owner") {
      return new Response(
        JSON.stringify({ error: "Only owners can update credentials" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // MFA step-up check
    const mfaCheck = await requireStepUp({
      supabase,
      userId: user.id,
      tenantId,
      action: "api-keys",
      userRole: roleName,
    });

    if (!mfaCheck.ok) {
      return new Response(
        JSON.stringify({
          error: mfaCheck.message || "MFA verification required",
          code: mfaCheck.code,
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    const { provider, mode, credentials } = await req.json();

    if (!provider || !mode || !credentials) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate provider
    const validProviders = ["stripe", "kbank", "opn", "twoc2p"];
    if (!validProviders.includes(provider)) {
      return new Response(JSON.stringify({ error: "Invalid provider" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Store credentials securely in tenant metadata
    // Note: In production, consider using a dedicated secrets management service
    // For now, we'll store in a JSON column with proper RLS policies
    
    // Get current provider credentials
    const { data: existingCreds } = await supabase
      .from("tenants")
      .select("metadata")
      .eq("id", tenantId)
      .single();

    const metadata = (existingCreds?.metadata as any) || {};
    const providerCreds = metadata.provider_credentials || {};
    const currentProviderCreds = providerCreds[provider] || {};

    // Merge with new credentials
    const updatedProviderCreds = {
      ...currentProviderCreds,
      ...credentials,
      updated_at: new Date().toISOString(),
    };

    const updatedMetadata = {
      ...metadata,
      provider_credentials: {
        ...providerCreds,
        [provider]: updatedProviderCreds,
      },
    };

    // Save to database
    const { error: updateError } = await supabase
      .from("tenants")
      .update({ metadata: updatedMetadata })
      .eq("id", tenantId);

    if (updateError) {
      throw updateError;
    }

    // Log the action
    await supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      user_id: user.id,
      action: "provider_credentials_updated",
      resource_type: "payment_provider",
      resource_id: provider,
      details: {
        provider,
        mode,
        updated_at: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        provider,
        mode,
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error updating provider credentials:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
