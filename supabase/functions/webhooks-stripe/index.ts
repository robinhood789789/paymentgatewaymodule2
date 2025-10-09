import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
};

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<Stripe.Event | null> {
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error("Stripe signature verification failed:", err);
    return null;
  }
}

async function processPaymentEvent(
  supabase: any,
  event: Stripe.Event,
  tenantId: string
) {
  const eventType = event.type;
  const data = event.data.object as any;

  console.log(`Processing Stripe event: ${eventType} for tenant ${tenantId}`);

  // Find checkout session by provider_session_id
  const { data: session } = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("provider_session_id", data.id)
    .eq("tenant_id", tenantId)
    .single();

  if (!session) {
    console.log("No checkout session found for provider session:", data.id);
    return;
  }

  let paymentStatus = session.status;
  let paidAt: string | undefined;
  let providerPaymentId = data.id;

  // Map Stripe event to payment status
  if (eventType === "checkout.session.completed" || eventType === "payment_intent.succeeded") {
    paymentStatus = "completed";
    paidAt = new Date().toISOString();
  } else if (eventType === "checkout.session.expired" || eventType === "payment_intent.canceled") {
    paymentStatus = "expired";
  } else if (eventType === "payment_intent.payment_failed") {
    paymentStatus = "failed";
  }

  // Update checkout session
  const { data: beforeSession } = await supabase
    .from("checkout_sessions")
    .select("*")
    .eq("id", session.id)
    .single();

  await supabase
    .from("checkout_sessions")
    .update({ status: paymentStatus })
    .eq("id", session.id);

  // Create or update payment record
  const { data: existingPayment } = await supabase
    .from("payments")
    .select("*")
    .eq("checkout_session_id", session.id)
    .single();

  let payment;
  if (existingPayment) {
    const { data: beforePayment } = await supabase
      .from("payments")
      .select("*")
      .eq("id", existingPayment.id)
      .single();

    const { data: updated } = await supabase
      .from("payments")
      .update({
        status: paymentStatus,
        paid_at: paidAt,
        metadata: data,
      })
      .eq("id", existingPayment.id)
      .select()
      .single();

    payment = updated;

    // Audit log for payment update
    await supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      action: "payment.updated",
      target: `payment:${existingPayment.id}`,
      before: beforePayment,
      after: updated,
    });
  } else {
    const { data: created } = await supabase
      .from("payments")
      .insert({
        tenant_id: tenantId,
        checkout_session_id: session.id,
        amount: session.amount,
        currency: session.currency,
        status: paymentStatus,
        provider: "stripe",
        provider_payment_id: providerPaymentId,
        paid_at: paidAt,
        metadata: data,
      })
      .select()
      .single();

    payment = created;

    // Audit log for payment creation
    await supabase.from("audit_logs").insert({
      tenant_id: tenantId,
      action: "payment.created",
      target: `payment:${created.id}`,
      after: created,
    });
  }

  // Audit log for session status change
  await supabase.from("audit_logs").insert({
    tenant_id: tenantId,
    action: "checkout_session.status_changed",
    target: `checkout_session:${session.id}`,
    before: beforeSession,
    after: { ...session, status: paymentStatus },
  });

  // Enqueue webhook events for tenant webhooks
  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("enabled", true);

  if (webhooks && webhooks.length > 0) {
    const webhookEventPayload = {
      event_type: eventType,
      provider: "stripe",
      checkout_session: session,
      payment: payment,
      raw_event: data,
    };

    for (const webhook of webhooks) {
      await supabase.from("webhook_events").insert({
        tenant_id: tenantId,
        event_type: eventType,
        provider: "stripe",
        payload: webhookEventPayload,
        status: "queued",
        attempts: 0,
      });
    }

    console.log(`Enqueued ${webhooks.length} webhook events for tenant ${tenantId}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature header" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify signature
    const event = await verifyStripeSignature(payload, signature, webhookSecret);
    if (!event) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Verified Stripe webhook event:", event.type, event.id);

    // Check for duplicate event (idempotency)
    const { data: existingEvent } = await supabase
      .from("provider_events")
      .select("id")
      .eq("event_id", event.id)
      .eq("provider", "stripe")
      .single();

    if (existingEvent) {
      console.log("Event already processed:", event.id);
      return new Response(
        JSON.stringify({ received: true, message: "Event already processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store provider event
    await supabase.from("provider_events").insert({
      event_id: event.id,
      provider: "stripe",
      type: event.type,
      payload: event,
    });

    // Extract tenant_id from metadata
    const data = event.data.object as any;
    const tenantId = data.metadata?.tenant_id;

    if (!tenantId) {
      console.log("No tenant_id in event metadata, skipping processing");
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process the event
    await processPaymentEvent(supabase, event, tenantId);

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing Stripe webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
