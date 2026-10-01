\set ON_ERROR_STOP on
create extension if not exists pgtap;

begin;
select plan(11);

select '00000000-0000-0000-0000-000000000010'::uuid as user_h1,
       '00000000-0000-0000-0000-000000000011'::uuid as employee_h1,
       '00000000-0000-0000-0000-000000000012'::uuid as admin_h1 \gset

set local role postgres;
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  (:'user_h1', 'authenticated', 'authenticated', 'h1-user@example.test', 'not-used', now(), '{"name":"Hardening User"}'::jsonb),
  (:'employee_h1', 'authenticated', 'authenticated', 'h1-employee@example.test', 'not-used', now(), '{"name":"Hardening Employee"}'::jsonb),
  (:'admin_h1', 'authenticated', 'authenticated', 'h1-admin@example.test', 'not-used', now(), '{"name":"Hardening Admin"}'::jsonb)
on conflict (id) do nothing;

update public.profiles set role = 'employee' where id = :'employee_h1';
update public.profiles set role = 'admin' where id = :'admin_h1';

-- 1. Test audit_logs immutability trigger directly
insert into public.audit_logs (id, action, "table", record_id)
values ('00000000-0000-0000-0000-000000000099'::uuid, 'TEST_IMMUTABLE', 'test_table', '99');

select throws_ok(
  $$update public.audit_logs set action = 'TAMPERED' where id = '00000000-0000-0000-0000-000000000099'::uuid$$,
  '42501',
  null,
  'audit_logs update is rejected by immutability trigger'
);

select throws_ok(
  $$delete from public.audit_logs where id = '00000000-0000-0000-0000-000000000099'::uuid$$,
  '42501',
  null,
  'audit_logs delete is rejected by immutability trigger'
);

-- 2. Test protect_profile_privileges when user tries to update another profile or admin profile
set local role authenticated;
select set_config('request.jwt.claim.sub', :'user_h1', true);

-- User attempts to change admin profile
update public.profiles set role = 'user', active = false, must_change_password = true where id = :'admin_h1';
reset role;
set local role postgres;
select is((select role from public.profiles where id = :'admin_h1'), 'admin', 'user cannot change admin role');
select is((select active from public.profiles where id = :'admin_h1'), true, 'user cannot deactivate admin');
select is((select must_change_password from public.profiles where id = :'admin_h1'), false, 'user cannot change admin must_change_password');

-- 3. Test admin can update profile privileges
set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_h1', true);
update public.profiles set active = false, must_change_password = true where id = :'user_h1';
reset role;
set local role postgres;
select is((select active from public.profiles where id = :'user_h1'), false, 'admin can deactivate user');
select is((select must_change_password from public.profiles where id = :'user_h1'), true, 'admin can set must_change_password');

-- 4. Test RPC validation on invalid parameters
set local role authenticated;
select set_config('request.jwt.claim.sub', :'admin_h1', true);
select throws_ok(
  $$select public.create_booking('GLV-ERR1', 99999, 'Ranchi', tstzrange('2026-10-20 10:00+05:30', '2026-10-22 10:00+05:30', '[)'), 'self', '[]'::jsonb)$$,
  'P0002',
  null,
  'RPC rejects non-existent car'
);
select throws_ok(
  $$select public.create_booking('GLV-ERR2', 1, 'Ranchi', tstzrange('2026-10-22 10:00+05:30', '2026-10-20 10:00+05:30', '[)'), 'self', '[]'::jsonb)$$,
  '22000',
  null,
  'RPC rejects invalid inverted period'
);
select throws_ok(
  $$select public.create_booking('GLV-ERR3', 1, 'Ranchi', tstzrange('2026-10-20 10:00+05:30', '2026-10-22 10:00+05:30', '[)'), 'invalid_driver_mode', '[]'::jsonb)$$,
  '22023',
  null,
  'RPC rejects invalid driver option'
);

-- 5. Test unauthenticated RPC call
reset role;
set local role anon;
select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select public.create_booking('GLV-ERR4', 1, 'Ranchi', tstzrange('2026-10-20 10:00+05:30', '2026-10-22 10:00+05:30', '[)'), 'self', '[]'::jsonb)$$,
  '22023',
  null,
  'RPC rejects unauthenticated caller without guest contact details'
);

select * from finish();
rollback;
