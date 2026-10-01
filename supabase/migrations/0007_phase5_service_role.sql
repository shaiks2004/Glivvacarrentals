-- Phase 5: Ensure protect_profile_privileges allows service_role while keeping auth_role strict
create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true;
$$;

revoke all on function public.auth_role() from public;
grant execute on function public.auth_role() to anon, authenticated, service_role;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jwt_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    ''
  );
begin
  if auth_role() <> 'admin' and v_jwt_role <> 'service_role' then
    new.role := old.role;
    new.active := old.active;
    new.created_by := old.created_by;
    new.must_change_password := old.must_change_password;
  end if;
  return new;
end;
$$;
