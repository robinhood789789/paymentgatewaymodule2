import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user making the request is super admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !requestingUser) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized');
    }

    // Check if requesting user is super admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', requestingUser.id)
      .single();

    if (!profile?.is_super_admin) {
      throw new Error('Only super admins can use this function');
    }

    console.log('🔐 Super admin verified:', requestingUser.id);

    const { user_ids } = await req.json();

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      throw new Error('Missing or invalid user_ids array');
    }

    console.log('🗑️ Deleting users:', user_ids);

    const results = [];

    for (const userId of user_ids) {
      try {
        // Cannot delete yourself
        if (userId === requestingUser.id) {
          results.push({
            user_id: userId,
            success: false,
            error: 'Cannot delete your own account'
          });
          continue;
        }

        // Delete all memberships
        const { error: membershipError } = await supabase
          .from('memberships')
          .delete()
          .eq('user_id', userId);

        if (membershipError) {
          console.error('Delete memberships error:', membershipError);
          throw membershipError;
        }

        // Delete profile
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (profileError) {
          console.error('Delete profile error:', profileError);
        }

        // Delete auth user using admin API
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

        if (deleteAuthError) {
          console.error('Delete auth user error:', deleteAuthError);
          throw deleteAuthError;
        }

        console.log('✅ Successfully deleted user:', userId);

        results.push({
          user_id: userId,
          success: true
        });

      } catch (error) {
        console.error('❌ Error deleting user:', userId, error);
        results.push({
          user_id: userId,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
