import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getPaymentProvider } from "../_shared/providerFactory.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant, idempotency-key",
};

// Validation schema
interface CreateSessionRequest {
  amount: number;
  currency: string;
  reference?: string;
  successUrl?: string;
  cancelUrl?: string;
  methodTypes: string[];
}

function validateRequest(body: any): CreateSessionRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  const { amount, currency, reference, successUrl, cancelUrl, methodTypes } = body;

  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("amount must be a positive number");
  }

  if (typeof currency !== "string" || !currency.trim()) {
    throw new Error("currency is required");
  }

  if (reference !== undefined && typeof reference !== "string") {
    throw new Error("reference must be a string");
  }

  if (successUrl !== undefined && typeof successUrl !== "string") {
    throw new Error("successUrl must be a string");
  }

  if (cancelUrl !== undefined && typeof cancelUrl !== "string") {
    throw new Error("cancelUrl must be a string");
  }

  if (!Array.isArray(methodTypes) || methodTypes.length === 0) {
    throw new Error("methodTypes must be a non-empty array");
  }

  return { amount, currency, reference, successUrl, cancelUrl, methodTypes };
}

async function authenticateRequest(
  req: Request,
  supabase: any,
  tenantId: string
): Promise<{ authenticated: boolean; userId?: string }> {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader) {
    return { authenticated: false };
  }

  // Check if it's a Bearer token (user auth)
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    
    // Verify JWT
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { authenticated: false };
    }

    // Check if user has payments:create permission
    const { data: membership } = await supabase
      .from("memberships")
      .select("role_id")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .single();

    if (!membership) {
      return { authenticated: false };
    }

    const { data: permissions } = await supabase
      .from("role_permissions")
      .select("permissions(name)")
      .eq("role_id", membership.role_id);

    const hasPermission = permissions?.some(
      (rp: any) => rp.permissions.name === "payments:create"
    );

    if (!hasPermission) {
      return { authenticated: false };
    }

    return { authenticated: true, userId: user.id };
  }

  // Check if it's an API key
  if (authHeader.startsWith("sk_")) {
    const [prefix, ...secretParts] = authHeader.split("_");
    const fullPrefix = `${prefix}_${secretParts[0]}`;
    
    // Hash the secret for comparison
    const encoder = new TextEncoder();
    const data = encoder.encode(authHeader);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedSecret = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: apiKey } = await supabase
      .from("api_keys")
      .select("id, tenant_id, revoked_at")
      .eq("prefix", fullPrefix)
      .eq("hashed_secret", hashedSecret)
      .eq("tenant_id", tenantId)
      .single();

    if (!apiKey || apiKey.revoked_at) {
      return { authenticated: false };
    }

    // Update last_used_at
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", apiKey.id);

    return { authenticated: true };
  }

  return { authenticated: false };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get tenant ID from header
    const tenantId = req.headers.get("x-tenant");
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "X-Tenant header is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate
    const auth = await authenticateRequest(req, supabase, tenantId);
    if (!auth.authenticated) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for idempotency key
    const idempotencyKey = req.headers.get("idempotency-key");
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("idempotency_keys")
        .select("response")
        .eq("tenant_id", tenantId)
        .eq("key", idempotencyKey)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (existing) {
        console.log("Returning cached response for idempotency key:", idempotencyKey);
        return new Response(
          JSON.stringify(existing.response),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Parse and validate request
    const body = await req.json();
    const params = validateRequest(body);

    // Get payment provider
    const provider = await getPaymentProvider(supabase, tenantId);

    console.log(`Creating checkout session with ${provider.name} for tenant ${tenantId}`);

    // Create session with provider
    const providerSession = await provider.createCheckoutSession({
      ...params,
      tenantId,
    });

    // Store in database
    const { data: session, error: dbError } = await supabase
      .from("checkout_sessions")
      .insert({
        tenant_id: tenantId,
        amount: params.amount,
        currency: params.currency,
        reference: params.reference,
        method_types: params.methodTypes,
        provider: provider.name,
        provider_session_id: providerSession.providerSessionId,
        redirect_url: providerSession.redirectUrl,
        qr_image_url: providerSession.qrImageUrl,
        expires_at: providerSession.expiresAt,
        status: providerSession.status || "pending",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to create checkout session");
    }

    const response = {
      id: session.id,
      redirect_url: session.redirect_url,
      qr_image_url: session.qr_image_url,
      status: session.status,
      expires_at: session.expires_at,
    };

    // Store idempotency key if provided
    if (idempotencyKey) {
      await supabase
        .from("idempotency_keys")
        .insert({
          tenant_id: tenantId,
          key: idempotencyKey,
          response,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        });
    }

    console.log("Checkout session created:", session.id);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in checkout-sessions-create:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
