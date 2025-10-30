import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { requireStepUp } from '../_shared/mfa-guards.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate secure random password
function generateTempPassword(): string {
  const length = 16;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const all = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Generate magic link token
function generateMagicToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Client with user auth for verification
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Super Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step-Up MFA required
    const mfaCheck = await requireStepUp({
      supabase,
      userId: user.id,
      action: 'create-payment',
      userRole: 'super_admin',
      isSuperAdmin: true,
    });

    if (!mfaCheck.ok) {
      return new Response(JSON.stringify({ error: mfaCheck.message, code: mfaCheck.code }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      display_name,
      email,
      commission_type = 'revenue_share',
      commission_percent = 10,
      bounty_amount = 0,
      adjust_min_percent = 0,
      adjust_max_percent = 30,
      allow_self_adjust = false,
      linked_tenants = [],
    } = await req.json();

    // Validate inputs
    if (!display_name || !email) {
      return new Response(JSON.stringify({ error: 'Display name and email are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    if (existingUser?.users.some(u => u.email === email)) {
      return new Response(JSON.stringify({ error: 'Email already exists' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate temp password
    const tempPassword = generateTempPassword();

    // Create auth user
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: display_name,
        requires_password_change: true,
        requires_mfa_enrollment: true,
      },
    });

    if (createUserError || !newUser.user) {
      console.error('Failed to create user:', createUserError);
      return new Response(JSON.stringify({ error: 'Failed to create user account' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create shareholder record
    const { data: shareholder, error: shareholderError } = await supabaseAdmin
      .from('shareholders')
      .insert({
        user_id: newUser.user.id,
        full_name: display_name,
        status: 'active',
        default_commission_type: commission_type,
        default_commission_value: commission_percent,
        default_bounty_amount: bounty_amount,
        allow_self_adjust,
        adjust_min_percent,
        adjust_max_percent,
        balance: 0,
        pending_balance: 0,
      })
      .select()
      .single();

    if (shareholderError) {
      console.error('Failed to create shareholder:', shareholderError);
      // Rollback user creation
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: 'Failed to create shareholder record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Link tenants if provided
    if (linked_tenants && linked_tenants.length > 0) {
      const links = linked_tenants.map((link: any) => ({
        shareholder_id: shareholder.id,
        tenant_id: link.tenant_id,
        commission_rate: link.commission_rate || commission_percent,
        commission_type: link.commission_type || commission_type,
        bounty_amount: link.bounty_amount || bounty_amount,
        effective_from: link.effective_from || new Date().toISOString(),
        status: 'active',
      }));

      const { error: linksError } = await supabaseAdmin
        .from('shareholder_clients')
        .insert(links);

      if (linksError) {
        console.error('Failed to link tenants:', linksError);
        // Continue anyway - can be linked later
      }
    }

    // Generate magic link token
    const magicToken = generateMagicToken();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    // Store invitation token (create invitations table if needed)
    await supabaseAdmin
      .from('shareholder_invitations')
      .insert({
        shareholder_id: shareholder.id,
        token: magicToken,
        expires_at: expiresAt.toISOString(),
        used: false,
      })
      .select()
      .single();

    const inviteLink = `${supabaseUrl.replace('//', '//app.')}/partner/accept-invite?token=${magicToken}`;

    // Send invitation email
    try {
      await supabaseAdmin.functions.invoke('send-partner-invitation', {
        body: {
          email,
          display_name,
          invite_link: inviteLink,
        },
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Continue - Super Admin can copy link manually
    }

    // Audit log (mask email for security)
    await supabaseAdmin.from('audit_logs').insert({
      action: 'partner.create',
      actor_user_id: user.id,
      after: {
        shareholder_id: shareholder.id,
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // mask email
        display_name,
        commission_type,
        commission_percent,
        linked_tenants_count: linked_tenants?.length || 0,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        shareholder_id: shareholder.id,
        temp_password: tempPassword, // SHOW ONCE - never persisted
        invite_link: inviteLink,
        expires_at: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in platform-partners-create:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
