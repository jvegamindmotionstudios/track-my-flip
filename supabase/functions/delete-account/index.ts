import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    // 1. Verify user is authenticated and requesting their own deletion
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized request');
    }

    // 2. Initialize a secure Supabase Admin Client
    // This uses the deeply hidden SUPABASE_SERVICE_ROLE_KEY to bypass RLS and delete the Auth object
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3. Optional: Manually purge tables if they lack ON DELETE CASCADE
    await supabaseAdmin.from('inventory').delete().eq('user_id', user.id);
    await supabaseAdmin.from('tracked_drives').delete().eq('user_id', user.id);
    await supabaseAdmin.from('stops').delete().eq('user_id', user.id);
    await supabaseAdmin.from('user_profiles').delete().eq('user_id', user.id);

    // 4. Finally, securely delete the root Authentication User Profile
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, message: 'Account permanently deleted' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
