import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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

    // Authenticate shareholder
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    // Verify user is an active shareholder
    const { data: shareholder, error: shareholderError } = await supabaseClient
      .from('shareholders')
      .select('id, referral_code')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (shareholderError || !shareholder) {
      throw new Error('Not an active shareholder');
    }

    // Parse request body
    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error('Missing required field: user_id');
    }

    // Validate user_id format (6 digits)
    if (!/^\d{6}$/.test(user_id)) {
      throw new Error('User ID must be exactly 6 digits');
    }

    // Check if user_id already exists
    const { data: existingTenant } = await supabaseClient
      .from('tenants')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingTenant) {
      throw new Error('User ID already exists');
    }

    // Generate email from user_id
    const email = `${user_id}@owner.local`;
    const business_name = `Owner-${user_id}`;

    // Generate temporary password (12 characters)
    const tempPassword = Array.from({ length: 12 }, () => 
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 56)]
    ).join('');

    // Create auth user
    const { data: authUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: business_name,
      }
    });

    if (createUserError || !authUser.user) {
      throw new Error(`Failed to create user: ${createUserError?.message}`);
    }

    // Set security flags
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        requires_password_change: true,
        totp_enabled: false,
      })
      .eq('id', authUser.user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
    }

    // Create tenant with referral tracking
    const tenantId = crypto.randomUUID();
    const { error: tenantError } = await supabaseClient
      .from('tenants')
      .insert({
        id: tenantId,
        name: business_name,
        user_id: user_id,
        status: 'trial',
        referred_by_code: shareholder.referral_code,
        referred_by_shareholder_id: shareholder.id,
        referral_accepted_at: new Date().toISOString(),
      });

    if (tenantError) {
      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    // Create owner role
    const ownerRoleId = crypto.randomUUID();
    const { error: roleError } = await supabaseClient
      .from('roles')
      .insert({
        id: ownerRoleId,
        tenant_id: tenantId,
        name: 'owner',
        description: 'Full system access',
        is_system: true,
      });

    if (roleError) {
      console.error('Role creation error:', roleError);
    }

    // Create membership
    const { error: membershipError } = await supabaseClient
      .from('memberships')
      .insert({
        user_id: authUser.user.id,
        tenant_id: tenantId,
        role_id: ownerRoleId,
      });

    if (membershipError) {
      console.error('Membership creation error:', membershipError);
    }

    // Link to shareholder_clients
    const { error: linkError } = await supabaseClient
      .from('shareholder_clients')
      .insert({
        shareholder_id: shareholder.id,
        tenant_id: tenantId,
        commission_rate: 5.0,
        status: 'active',
        referral_source: 'shareholder_portal',
      });

    if (linkError) {
      console.error('Shareholder link error:', linkError);
    }

    // Create tenant settings
    await supabaseClient
      .from('tenant_settings')
      .insert({
        tenant_id: tenantId,
        provider: 'stripe',
      });

    // Create tenant wallet
    await supabaseClient
      .from('tenant_wallets')
      .insert({
        tenant_id: tenantId,
        balance: 0,
      });

    // Audit log
    await supabaseClient
      .from('audit_logs')
      .insert({
        tenant_id: tenantId,
        actor_user_id: user.id,
        action: 'owner.create',
        target: `user:${authUser.user.id}`,
        after: {
          business_name,
          email,
          created_by_shareholder: shareholder.id,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          owner_id: authUser.user.id,
          tenant_id: tenantId,
          user_id,
          temporary_password: tempPassword,
          message: 'Owner user created successfully. Please provide the temporary password securely.',
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error creating owner:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Failed to create owner user'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
