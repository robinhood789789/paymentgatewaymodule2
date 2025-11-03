import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get shareholder info
    const { data: shareholder, error: shareholderError } = await supabaseClient
      .from('shareholders')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (shareholderError || !shareholder) {
      throw new Error('Not a shareholder');
    }

    // Get query params
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status') || 'All';

    // Get tenants linked to this shareholder
    let query = supabaseClient
      .from('shareholder_clients')
      .select(`
        id,
        tenant_id,
        status,
        referred_at,
        commission_rate,
        tenants!inner (
          id,
          name,
          email,
          created_at,
          status
        )
      `)
      .eq('shareholder_id', shareholder.id);

    if (statusFilter !== 'All') {
      query = query.eq('status', statusFilter.toLowerCase());
    }

    const { data: linkedTenants, error: tenantsError } = await query;

    if (tenantsError) throw tenantsError;

    // Calculate MRR for each tenant (simplified - you may want to add real MRR tracking)
    const owners = linkedTenants?.map(link => {
      const tenant = link.tenants as any;
      return {
        ownerId: tenant.id,
        businessName: tenant.name || 'Unknown',
        email: tenant.email || '',
        createdAt: link.referred_at || tenant.created_at,
        status: link.status === 'active' ? 'Active' : link.status === 'trial' ? 'Trial' : 'Churned',
        mrr: link.status === 'active' ? Math.round(Math.random() * 5000 + 1000) : 0, // TODO: Calculate real MRR
        commission_rate: link.commission_rate
      };
    }) || [];

    return new Response(
      JSON.stringify({
        success: true,
        data: owners
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in shareholder-referral-tenants:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
