import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPaymentProvider } from "../_shared/providerFactory.ts";
import { requireStepUp, createMfaError } from "../_shared/mfa-guards.ts";

// Rate limiting: Critical endpoint - strict rate limits recommended
// Recommended: 5 requests per minute per tenant

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant',
};

interface RefundRequest {
  paymentId: string;
  amount?: number; // Optional - if not provided, full refund
  reason?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get tenant ID from header
    const tenantId = req.headers.get('x-tenant');
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Missing X-Tenant header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check refunds:create permission
    const { data: membership } = await supabase
      .from('memberships')
      .select('role_id, roles!inner(name)')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'Not a member of this tenant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userRole = (membership.roles as any)?.name;

    const { data: permissions } = await supabase
      .from('role_permissions')
      .select('permissions(name)')
      .eq('role_id', membership.role_id);

    const hasPermission = permissions?.some(
      (rp: any) => rp.permissions?.name === 'refunds:create'
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Missing refunds:create permission' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MFA Step-up check for refunds
    const mfaCheck = await requireStepUp({
      supabase: supabase as any,
      userId: user.id,
      tenantId,
      action: 'refund',
      userRole
    });

    if (!mfaCheck.ok) {
      return createMfaError(mfaCheck.code!, mfaCheck.message!);
    }

    // Parse request body
    const body: RefundRequest = await req.json();
    const { paymentId, amount, reason } = body;

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'Missing paymentId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('tenant_id', tenantId)
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payment.status !== 'succeeded') {
      return new Response(
        JSON.stringify({ error: 'Can only refund succeeded payments' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate refund amount (default to full refund)
    const refundAmount = amount || payment.amount;

    if (refundAmount > payment.amount) {
      return new Response(
        JSON.stringify({ error: 'Refund amount exceeds payment amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment provider
    const provider = await getPaymentProvider(supabase, tenantId);

    // Secure logging - no PII
    console.log(`[Refund] Processing for payment ${paymentId}, amount: ${refundAmount} ${payment.currency}`);

    // Create refund record with pending status
    const { data: refund, error: refundInsertError } = await supabase
      .from('refunds')
      .insert({
        payment_id: paymentId,
        tenant_id: tenantId,
        amount: refundAmount,
        reason: reason || null,
        status: 'pending'
      })
      .select()
      .single();

    if (refundInsertError) {
      console.error('Refund insert error:', refundInsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create refund record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call provider refund API
    try {
      const refundResponse = await provider.refund(
        payment.provider_payment_id,
        refundAmount,
        reason
      );

      // Update refund record with provider response
      await supabase
        .from('refunds')
        .update({
          provider_refund_id: refundResponse.refundId,
          status: refundResponse.status
        })
        .eq('id', refund.id);

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          tenant_id: tenantId,
          actor_user_id: user.id,
          action: 'refund.created',
          target: `payment:${paymentId}`,
          before: { payment_status: payment.status },
          after: { 
            refund_id: refund.id,
            refund_amount: refundAmount,
            refund_status: refundResponse.status
          },
          ip: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null,
          user_agent: req.headers.get('user-agent') || null
        });

      console.log(`[Refund] Created successfully: ${refund.id}`);

      return new Response(
        JSON.stringify({
          refundId: refund.id,
          status: refundResponse.status,
          amount: refundAmount,
          providerRefundId: refundResponse.refundId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Provider refund error:', error);
      
      // Update refund status to failed
      await supabase
        .from('refunds')
        .update({ status: 'failed' })
        .eq('id', refund.id);

      // Still create audit log for failed attempt
      await supabase
        .from('audit_logs')
        .insert({
          tenant_id: tenantId,
          actor_user_id: user.id,
          action: 'refund.failed',
          target: `payment:${paymentId}`,
          before: { payment_status: payment.status },
          after: { 
            refund_id: refund.id,
            refund_amount: refundAmount,
            error: (error as Error).message
          },
          ip: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null,
          user_agent: req.headers.get('user-agent') || null
        });

      return new Response(
        JSON.stringify({ error: 'Refund failed', details: (error as Error).message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    // Secure error logging - no sensitive data
    console.error('[Refund] Error:', (error as Error).message);
    return new Response(
      JSON.stringify({ error: 'Failed to process refund' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
