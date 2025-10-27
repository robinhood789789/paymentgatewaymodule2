import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { requireStepUp } from "../_shared/mfa-guards.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tenant',
};

interface WithdrawalRequest {
  amount: number;
  currency: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant from header
    const tenantId = req.headers.get('X-Tenant');
    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'Missing X-Tenant header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing withdrawal for user:', user.id, 'tenant:', tenantId);

    // Check if user is owner of this tenant
    const { data: membership, error: membershipError } = await supabaseClient
      .from('memberships')
      .select('role_id, roles!inner(name)')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (membershipError || !membership || membership.roles.name !== 'owner') {
      console.error('Not owner:', membershipError);
      return new Response(
        JSON.stringify({ error: 'Only owners can request withdrawals' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MFA Step-up check
    const mfaCheck = await requireStepUp({
      supabase: supabaseClient,
      userId: user.id,
      tenantId: tenantId,
      action: 'withdrawal',
      userRole: 'owner',
      isSuperAdmin: false,
    });

    if (!mfaCheck.allowed) {
      console.log('MFA step-up required:', mfaCheck.reason);
      return new Response(
        JSON.stringify({
          error: mfaCheck.reason,
          code: mfaCheck.code,
          requires_mfa: true,
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: WithdrawalRequest = await req.json();
    const { amount, currency, bank_name, bank_account_number, bank_account_name, notes } = body;

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bank_name || !bank_account_number || !bank_account_name) {
      return new Response(
        JSON.stringify({ error: 'Bank details are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('tenant_settings')
      .select('withdrawal_daily_limit, withdrawal_per_transaction_limit, withdrawal_approval_threshold, require_2fa_for_withdrawal')
      .eq('tenant_id', tenantId)
      .single();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Error fetching tenant settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check per-transaction limit
    if (amount > (settings.withdrawal_per_transaction_limit || 500000)) {
      return new Response(
        JSON.stringify({ 
          error: 'Amount exceeds per-transaction limit',
          limit: settings.withdrawal_per_transaction_limit 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabaseClient
      .from('tenant_wallets')
      .select('balance')
      .eq('tenant_id', tenantId)
      .single();

    if (walletError || !wallet) {
      console.error('Error fetching wallet:', walletError);
      return new Response(
        JSON.stringify({ error: 'Error fetching wallet balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (wallet.balance < amount) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient balance',
          current_balance: wallet.balance,
          requested_amount: amount
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check daily limit
    const today = new Date().toISOString().split('T')[0];
    const { data: dailyTotal, error: dailyError } = await supabaseClient
      .from('withdrawal_daily_totals')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .eq('date', today)
      .maybeSingle();

    const currentDailyTotal = dailyTotal?.total_amount || 0;
    const dailyLimit = settings.withdrawal_daily_limit || 1000000;

    if (currentDailyTotal + amount > dailyLimit) {
      return new Response(
        JSON.stringify({ 
          error: 'Daily withdrawal limit exceeded',
          daily_limit: dailyLimit,
          used_today: currentDailyTotal,
          requested: amount
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine if approval is needed
    const approvalThreshold = settings.withdrawal_approval_threshold || 10000000;
    const requiresApproval = amount >= approvalThreshold;

    const status = requiresApproval ? 'pending' : 'succeeded';

    // Create withdrawal record
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        tenant_id: tenantId,
        amount: amount,
        currency: currency || 'THB',
        status: status,
        type: 'withdrawal',
        method: 'bank_transfer',
        bank_name: bank_name,
        bank_account_number: bank_account_number,
        bank_account_name: bank_account_name,
        withdrawal_notes: notes,
        metadata: {
          requested_by: user.id,
          requested_at: new Date().toISOString(),
          requires_approval: requiresApproval,
        }
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating withdrawal:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Error creating withdrawal request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If requires approval, create approval request
    if (requiresApproval) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours to approve

      const { error: approvalError } = await supabaseClient
        .from('approvals')
        .insert({
          tenant_id: tenantId,
          requested_by: user.id,
          action_type: 'withdrawal',
          action_data: {
            payment_id: payment.id,
            amount: amount,
            currency: currency,
            bank_name: bank_name,
            bank_account_number: bank_account_number,
            bank_account_name: bank_account_name,
          },
          status: 'pending',
          expires_at: expiresAt.toISOString(),
        });

      if (approvalError) {
        console.error('Error creating approval:', approvalError);
      }
    } else {
      // Update daily total
      await supabaseClient.rpc('upsert_withdrawal_daily_total', {
        p_tenant_id: tenantId,
        p_date: today,
        p_amount: amount,
      }).catch(async () => {
        // Fallback: manual upsert
        const { error: upsertError } = await supabaseClient
          .from('withdrawal_daily_totals')
          .upsert({
            tenant_id: tenantId,
            date: today,
            total_amount: currentDailyTotal + amount,
            transaction_count: (dailyTotal?.transaction_count || 0) + 1,
          }, {
            onConflict: 'tenant_id,date'
          });
        
        if (upsertError) {
          console.error('Error updating daily total:', upsertError);
        }
      });
    }

    // Log audit trail
    await supabaseClient
      .from('audit_logs')
      .insert({
        tenant_id: tenantId,
        actor_user_id: user.id,
        action: 'withdrawal.create',
        target: payment.id,
        after: {
          amount: amount,
          currency: currency,
          status: status,
          requires_approval: requiresApproval,
          bank_name: bank_name,
        },
      });

    console.log('Withdrawal created successfully:', payment.id, 'Status:', status);

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        status: status,
        requires_approval: requiresApproval,
        message: requiresApproval 
          ? 'Withdrawal request created. Approval required for large amounts.' 
          : 'Withdrawal processed successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});