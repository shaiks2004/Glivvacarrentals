import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // 1. Verify caller is an active admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: callerUser },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Invalid user session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile, error: profileError } = await userClient
      .from('profiles')
      .select('role, active')
      .eq('id', callerUser.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== 'admin' || !callerProfile.active) {
      return new Response(JSON.stringify({ error: 'Forbidden. Admin privileges required.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse request payload
    const body = await req.json();
    const { email, password, name, phone, city_ids } = body;

    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: 'email, password, and name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Service role client to provision employee
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,
      user_metadata: { name: name.trim(), phone: phone?.trim() || null },
    });

    if (createError || !newAuthUser.user) {
      return new Response(JSON.stringify({ error: createError?.message || 'Failed to create user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = newAuthUser.user.id;

    // 4. Update profile to role = 'employee' and must_change_password = true
    const { error: updateProfileError } = await adminClient
      .from('profiles')
      .update({
        role: 'employee',
        name: name.trim(),
        phone: phone?.trim() || null,
        created_by: callerUser.id,
        must_change_password: true,
        active: true,
      })
      .eq('id', newUserId);

    if (updateProfileError) {
      return new Response(JSON.stringify({ error: updateProfileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Assign cities if provided
    if (Array.isArray(city_ids) && city_ids.length > 0) {
      const cityRows = city_ids.map((cid: number) => ({
        employee_id: newUserId,
        city_id: cid,
      }));
      await adminClient.from('employee_cities').insert(cityRows);
    }

    // 6. Record in audit_logs
    await adminClient.from('audit_logs').insert({
      actor_id: callerUser.id,
      action: 'CREATE_EMPLOYEE',
      table: 'profiles',
      record_id: newUserId,
      after: {
        email: email.trim(),
        name: name.trim(),
        role: 'employee',
        city_ids: city_ids || [],
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        employee_id: newUserId,
        message: 'Employee account created successfully with temporary password.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
