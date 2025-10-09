import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Health check endpoint called');

    // Create Supabase client to test connection
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test database connection with a simple query
    const { error: dbError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
      .single();

    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: dbError ? 'down' : 'operational',
        api: 'operational',
        edge_functions: 'operational',
      },
      version: '1.0.0',
    };

    console.log('Health check completed:', status);

    return new Response(
      JSON.stringify(status),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Health check error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: errorMessage,
        services: {
          database: 'unknown',
          api: 'operational',
          edge_functions: 'operational',
        },
      }),
      {
        status: 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
