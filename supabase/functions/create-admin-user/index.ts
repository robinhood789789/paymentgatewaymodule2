import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the request is from an authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('ไม่พบ Authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('ไม่ได้รับอนุญาต');
    }

    const { email, password, full_name, role, tenant_id } = await req.json();

    if (!email || !password || !full_name || !role || !tenant_id) {
      throw new Error('ข้อมูลไม่ครบถ้วน');
    }

    // Verify user has permission in the tenant
    const { data: membership } = await supabaseClient
      .from('memberships')
      .select('role_id, roles(name)')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .single();

    if (!membership) {
      throw new Error('คุณไม่มีสิทธิ์ในเทนนันต์นี้');
    }

    const userRole = (membership.roles as any)?.name;
    if (userRole !== 'owner' && userRole !== 'admin') {
      throw new Error('คุณไม่มีสิทธิ์สร้างผู้ใช้');
    }

    // Create the new user
    const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (createError) {
      throw createError;
    }

    if (!newUser.user) {
      throw new Error('ไม่สามารถสร้างผู้ใช้ได้');
    }

    // Get the role ID for the specified role in this tenant
    const { data: roleData, error: roleError } = await supabaseClient
      .from('roles')
      .select('id')
      .eq('name', role)
      .eq('tenant_id', tenant_id)
      .eq('is_system', true)
      .single();

    if (roleError || !roleData) {
      // Clean up: delete the created user if role assignment fails
      await supabaseClient.auth.admin.deleteUser(newUser.user.id);
      throw new Error(`ไม่พบบทบาท ${role} ในระบบ`);
    }

    // Create membership for the new user
    const { error: membershipError } = await supabaseClient
      .from('memberships')
      .insert({
        user_id: newUser.user.id,
        tenant_id: tenant_id,
        role_id: roleData.id,
      });

    if (membershipError) {
      // Clean up: delete the created user if membership creation fails
      await supabaseClient.auth.admin.deleteUser(newUser.user.id);
      throw membershipError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name,
          role,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating admin user:', error);
    const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างผู้ใช้';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
