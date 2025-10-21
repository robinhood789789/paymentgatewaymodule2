import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the request is from an authenticated super admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is super admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_super_admin) {
      throw new Error('Only super admins can create owner users');
    }

    // Parse request body
    const { email, full_name, tenant_name } = await req.json();

    if (!email || !full_name || !tenant_name) {
      throw new Error('Missing required fields: email, full_name, tenant_name');
    }

    // Generate temporary password
    const temporaryPassword = `Owner${Math.random().toString(36).slice(-8)}!${Date.now().toString(36)}`;

    console.log('Creating new owner user:', { email, full_name, tenant_name });

    // Create the new user
    const { data: newUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (createUserError) {
      console.error('Error creating user:', createUserError);
      throw new Error(`Failed to create user: ${createUserError.message}`);
    }

    console.log('User created successfully:', newUser.user.id);

    // Create new tenant
    const { data: newTenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .insert({
        name: tenant_name,
        status: 'active',
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      // Cleanup: delete the created user
      await supabaseClient.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    console.log('Tenant created successfully:', newTenant.id);

    // Get or create owner role for this tenant
    const { data: ownerRole, error: roleError } = await supabaseClient
      .from('roles')
      .select('id')
      .eq('tenant_id', newTenant.id)
      .eq('name', 'owner')
      .single();

    let ownerRoleId = ownerRole?.id;

    if (roleError || !ownerRoleId) {
      // Create owner role
      const { data: newRole, error: createRoleError } = await supabaseClient
        .from('roles')
        .insert({
          tenant_id: newTenant.id,
          name: 'owner',
          description: 'Tenant owner with full access',
          is_system: true,
        })
        .select()
        .single();

      if (createRoleError) {
        console.error('Error creating owner role:', createRoleError);
        // Cleanup
        await supabaseClient.auth.admin.deleteUser(newUser.user.id);
        await supabaseClient.from('tenants').delete().eq('id', newTenant.id);
        throw new Error(`Failed to create owner role: ${createRoleError.message}`);
      }

      ownerRoleId = newRole.id;

      // Assign all permissions to owner role
      const { data: permissions } = await supabaseClient
        .from('permissions')
        .select('id');

      if (permissions && permissions.length > 0) {
        const rolePermissions = permissions.map(p => ({
          role_id: ownerRoleId,
          permission_id: p.id,
        }));

        await supabaseClient
          .from('role_permissions')
          .insert(rolePermissions);
      }
    }

    // Create membership
    const { error: membershipError } = await supabaseClient
      .from('memberships')
      .insert({
        user_id: newUser.user.id,
        tenant_id: newTenant.id,
        role_id: ownerRoleId,
      });

    if (membershipError) {
      console.error('Error creating membership:', membershipError);
      // Cleanup
      await supabaseClient.auth.admin.deleteUser(newUser.user.id);
      await supabaseClient.from('tenants').delete().eq('id', newTenant.id);
      throw new Error(`Failed to create membership: ${membershipError.message}`);
    }

    console.log('Owner user setup completed successfully');

    // Send welcome email to the new owner
    try {
      const { error: emailError } = await supabaseClient.functions.invoke('send-owner-welcome-email', {
        body: {
          tenantName: tenant_name,
          email,
          temporaryPassword,
        },
      });

      if (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't fail the entire operation if email fails
      } else {
        console.log('Welcome email sent successfully to:', email);
      }
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Continue despite email failure
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name,
        },
        tenant: {
          id: newTenant.id,
          name: newTenant.name,
        },
        temporary_password: temporaryPassword,
        email_sent: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-owner-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้าง Owner User';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
