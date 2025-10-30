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
    const { 
      owner_user_id, 
      owner_name, 
      owner_type,
      tenant_name,
      business_type,
      provider,
      force_2fa,
      platform_fee_percent,
      features 
    } = await req.json();

    if (!owner_user_id || !owner_name || !owner_type || !tenant_name) {
      throw new Error('Missing required fields: owner_user_id, owner_name, owner_type, tenant_name');
    }

    // Generate automatic login password
    const temporaryPassword = `${owner_type}${Math.random().toString(36).slice(-8)}${Date.now().toString(36).slice(-4)}`;

    console.log('Creating merchant for owner:', { owner_user_id, owner_name, owner_type, tenant_name });

    // Create new tenant with additional info
    const { data: newTenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .insert({
        name: tenant_name,
        status: 'active',
        business_type: business_type,
        kyc_level: 0,
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Error creating tenant:', tenantError);
      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    console.log('Tenant created successfully:', newTenant.id);

    // Create tenant settings with provider
    await supabaseClient
      .from('tenant_settings')
      .insert({
        tenant_id: newTenant.id,
        provider: provider || 'stripe',
        features: features || {},
        enforce_2fa_roles: force_2fa ? ['owner'] : [],
      });

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

    console.log('Tenant setup completed successfully');

    // Generate API Key automatically
    const generateApiKey = () => {
      const prefix = 'pk_live';
      const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return `${prefix}_${secret}`;
    };

    const hashSecret = async (secret: string) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(secret);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    };

    const apiKey = generateApiKey();
    const hashedSecret = await hashSecret(apiKey);

    // Store API key in database
    const { error: apiKeyError } = await supabaseClient
      .from('api_keys')
      .insert({
        tenant_id: newTenant.id,
        name: `Auto-generated for ${owner_name}`,
        prefix: apiKey.split('_')[0] + '_' + apiKey.split('_')[1],
        hashed_secret: hashedSecret,
        key_type: 'external',
        rate_limit_tier: 'standard',
        scope: { endpoints: ['*'] },
        allowed_operations: ['read', 'write'],
        status: 'active',
        notes: `Auto-generated API key for ${owner_type} - ${owner_name}`,
      });

    if (apiKeyError) {
      console.error('Error creating API key:', apiKeyError);
      // Don't fail the entire operation
    } else {
      console.log('API key created successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        owner_user_id,
        owner_name,
        owner_type,
        tenant: {
          id: newTenant.id,
          name: newTenant.name,
          provider: provider || 'stripe',
        },
        temporary_password: temporaryPassword,
        api_key: apiKey,
        force_2fa,
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
