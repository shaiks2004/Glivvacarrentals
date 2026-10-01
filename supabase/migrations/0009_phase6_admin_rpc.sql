-- Phase 6: Admin employee provisioning RPC

create or replace function public.admin_provision_employee(
  p_name text,
  p_email text,
  p_phone text,
  p_password text,
  p_city_ids int[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_admin_id uuid := auth.uid();
  v_new_id uuid := gen_random_uuid();
  v_enc_pass text;
  v_city_id int;
begin
  if auth_role() <> 'admin' then
    raise exception 'forbidden: admin privileges required' using errcode = '42501';
  end if;

  if p_email is null or p_name is null or p_password is null then
    raise exception 'name, email and password required' using errcode = '22023';
  end if;

  v_enc_pass := extensions.crypt(p_password, extensions.gen_salt('bf'));

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    v_new_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    lower(trim(p_email)),
    v_enc_pass,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', trim(p_name), 'phone', trim(p_phone)),
    now(),
    now()
  );

  update public.profiles set
    name = trim(p_name),
    phone = nullif(trim(p_phone), ''),
    role = 'employee',
    active = true,
    must_change_password = true,
    created_by = v_admin_id
  where id = v_new_id;

  if p_city_ids is not null then
    foreach v_city_id in array p_city_ids loop
      insert into public.employee_cities (employee_id, city_id)
      values (v_new_id, v_city_id)
      on conflict do nothing;
    end loop;
  end if;

  insert into public.audit_logs (actor_id, action, "table", record_id, after)
  values (
    v_admin_id,
    'CREATE_EMPLOYEE',
    'profiles',
    v_new_id::text,
    jsonb_build_object('email', p_email, 'name', p_name, 'role', 'employee')
  );

  return v_new_id;
end;
$$;

revoke all on function public.admin_provision_employee(text, text, text, text, int[]) from public;
grant execute on function public.admin_provision_employee(text, text, text, text, int[]) to authenticated;
