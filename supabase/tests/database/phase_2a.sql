\set ON_ERROR_STOP on
create extension if not exists pgtap;

begin;
select plan(46);

select '00000000-0000-0000-0000-000000000001'::uuid as user_a,
       '00000000-0000-0000-0000-000000000002'::uuid as user_b,
       '00000000-0000-0000-0000-000000000003'::uuid as employee_a,
       '00000000-0000-0000-0000-000000000004'::uuid as admin_a \gset
select id as swift_id from public.cars where slug = 'swift' \gset

set local role postgres;
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  (:'user_a', 'authenticated', 'authenticated', 'phase2a-a@example.test', 'not-used', now(), '{"name":"User A"}'::jsonb),
  (:'user_b', 'authenticated', 'authenticated', 'phase2a-b@example.test', 'not-used', now(), '{"name":"User B"}'::jsonb),
  (:'employee_a', 'authenticated', 'authenticated', 'phase2a-employee@example.test', 'not-used', now(), '{"name":"Employee A"}'::jsonb),
  (:'admin_a', 'authenticated', 'authenticated', 'phase2a-admin@example.test', 'not-used', now(), '{"name":"Admin A"}'::jsonb)
on conflict (id) do nothing;
update public.profiles set role = 'employee' where id = :'employee_a';
update public.profiles set role = 'admin' where id = :'admin_a';

select has_table('public', 'profiles', 'profiles table exists');
select has_column('public', 'profiles', 'must_change_password', 'profiles has password-change flag');
select has_column('public', 'bookings', 'user_id', 'bookings reference profiles');
select has_column('public', 'documents', 'user_id', 'documents reference profiles');
select ok((select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.bookings'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%contacted%' and pg_get_constraintdef(oid) like '%no_answer%' and pg_get_constraintdef(oid) like '%rejected%') is not null, 'booking status check includes contacted, no_answer and rejected');
select ok((select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.bookings'::regclass and contype = 'x' and pg_get_constraintdef(oid) like '%pending%' and pg_get_constraintdef(oid) like '%contacted%' and pg_get_constraintdef(oid) like '%confirmed%' and pg_get_constraintdef(oid) like '%active%') is not null, 'booking exclusion includes pending, contacted, confirmed and active');
select ok((select proconfig @> array['search_path=public'] from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'auth_role'), 'auth_role search_path is public');
select is((select provolatile from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'auth_role'), 's', 'auth_role is stable');
select ok((select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'auth_role'), 'auth_role is security definer');
select ok((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.v_call_queue'::regclass), 'v_call_queue is security invoker');
select ok((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.car_compliance'::regclass), 'car_compliance is security invoker');
select ok((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.v_dashboard_kpis'::regclass), 'v_dashboard_kpis is security invoker');

insert into public.bookings (ref, user_id, car_id, pickup_place, period, subtotal, tax, total)
values ('GLV-2A001', :'user_a', :'swift_id', 'Ranchi', tstzrange('2026-10-01 10:00+05:30', '2026-10-03 10:00+05:30', '[)'), 3600, 648, 4248);
insert into storage.objects (bucket_id, name, owner, metadata)
values ('kyc', :'user_b' || '/licence.pdf', :'user_b', '{}'::jsonb);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'user_a', true);
select is((select count(*)::int from public.bookings), 1, 'a user can read their own booking');
update public.profiles set name = 'User A Updated', phone = '+919000000001', role = 'admin', active = false, must_change_password = true where id = :'user_a';
select is((select name from public.profiles where id = :'user_a'), 'User A Updated', 'a user can update their name');
select is((select phone from public.profiles where id = :'user_a'), '+919000000001', 'a user can update their phone');
select is((select role from public.profiles where id = :'user_a'), 'user', 'a user cannot change their role');
select is((select active from public.profiles where id = :'user_a'), true, 'a user cannot deactivate their profile');
select is((select must_change_password from public.profiles where id = :'user_a'), false, 'a user cannot change must_change_password');

select set_config('request.jwt.claim.sub', :'user_b', true);
select is((select count(*)::int from public.bookings), 0, 'a user cannot read another users booking');
select is((select role from public.profiles where id = :'user_b'), 'user', 'new auth users receive the user role');
select is((select count(*)::int from public.v_call_queue), 0, 'a plain user cannot read the call queue');
select is((select count(*)::int from public.car_compliance), 0, 'a plain user cannot read compliance');
select is((select count(*)::int from public.v_dashboard_kpis), 0, 'a plain user cannot read dashboard KPIs');
select throws_ok($$insert into public.cars (slug, name, category, seats, fuel, transmission, price_per_day) values ('user-car', 'User Car', 'SUV', 5, 'Petrol', 'Manual', 1000)$$, '42501', null, 'a user cannot insert cars');
select throws_ok($$insert into public.bookings (ref, user_id, car_id, pickup_place, period, subtotal, tax, total, status) values ('GLV-DIRECT-USER', '00000000-0000-0000-0000-000000000002'::uuid, 1, 'Ranchi', tstzrange('2026-10-10 10:00+05:30', '2026-10-11 10:00+05:30', '[)'), 1, 1, 1, 'confirmed')$$, '42501', null, 'a user cannot insert bookings directly');
select is((select count(*)::int from storage.objects where bucket_id = 'kyc'), 0, 'a user cannot read another users KYC files');

set local role anon;
select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.sub', '', true);
select is((select count(*)::int from public.bookings), 0, 'anon cannot read bookings');
select is((select count(*)::int from public.profiles), 0, 'anon cannot read profiles');
select is((select count(*)::int from public.documents), 0, 'anon cannot read documents');
select is((select count(*)::int from public.notifications), 0, 'anon cannot read notifications');
select is((select count(*)::int from public.audit_logs), 0, 'anon cannot read audit logs');
select is((select count(*)::int from public.v_call_queue), 0, 'anon cannot read the call queue');
select throws_ok($$insert into public.bookings (ref, user_id, car_id, pickup_place, period, subtotal, tax, total) values ('GLV-DIRECT-ANON', null, 2, 'Ranchi', tstzrange('2026-10-12 10:00+05:30', '2026-10-13 10:00+05:30', '[)'), 1, 1, 1)$$, '42501', null, 'anon cannot insert bookings directly');
select lives_ok($$insert into public.contact_messages (name, email, topic, message) values ('Anon', 'anon@example.test', 'test', 'hello')$$, 'anon can insert contact messages');
select is((select count(*)::int from public.contact_messages where email = 'anon@example.test'), 0, 'anon cannot read contact messages');
reset role;
set local role postgres;
insert into public.contact_messages (name, email, topic, message) values ('Marker', 'marker@example.test', 'test', 'hello');
set local role anon;
update public.contact_messages set message = 'changed' where email = 'marker@example.test';
reset role;
set local role postgres;
select is((select message from public.contact_messages where email = 'marker@example.test'), 'hello', 'anon cannot update contact messages');

set local role postgres;
insert into public.audit_logs (action, "table", record_id) values ('marker', 'phase2a', 'marker');
set local role authenticated;
select set_config('request.jwt.claim.sub', :'employee_a', true);
select is((select count(*)::int from public.site_settings), 0, 'an employee cannot read admin settings');
select throws_ok($$insert into public.site_settings (key, value) values ('employee-write', '{}'::jsonb)$$, '42501', null, 'an employee cannot write admin settings');
delete from public.cars where id = 1;
reset role;
set local role postgres;
select is((select count(*)::int from public.cars where id = 1), 1, 'an employee cannot delete cars');
set local role authenticated;
update public.audit_logs set action = 'changed' where record_id = 'marker';
reset role;
set local role postgres;
select is((select action from public.audit_logs where record_id = 'marker'), 'marker', 'audit logs cannot be updated');
set local role authenticated;
delete from public.audit_logs where record_id = 'marker';
reset role;
set local role postgres;
select is((select count(*)::int from public.audit_logs where record_id = 'marker'), 1, 'audit logs cannot be deleted');

set local role postgres;
select throws_ok($$insert into public.bookings (ref, user_id, car_id, pickup_place, period, subtotal, tax, total) values ('GLV-OVERLAP', '00000000-0000-0000-0000-000000000002'::uuid, 2, 'Ranchi', tstzrange('2026-10-02 10:00+05:30', '2026-10-04 10:00+05:30', '[)'), 3600, 648, 4248)$$, '23P01', null, 'overlapping active booking for the same car is rejected');
select throws_ok($$insert into public.car_blocks (car_id, period, reason) values (2, tstzrange('2026-10-02 10:00+05:30', '2026-10-04 10:00+05:30', '[)'), 'maintenance')$$, '23P01', null, 'a block cannot overlap an active booking');
insert into public.car_blocks (car_id, period, reason) values (2, tstzrange('2026-10-05 10:00+05:30', '2026-10-06 10:00+05:30', '[)'), 'maintenance');
select throws_ok($$insert into public.bookings (ref, user_id, car_id, pickup_place, period, subtotal, tax, total) values ('GLV-BLOCKED', '00000000-0000-0000-0000-000000000002'::uuid, 2, 'Ranchi', tstzrange('2026-10-05 10:00+05:30', '2026-10-06 10:00+05:30', '[)'), 1800, 324, 2124)$$, '23P01', null, 'a booking cannot overlap a car block');
set local role authenticated;
select set_config('request.jwt.claim.sub', :'user_a', true);
select ok((public.create_booking('GLV-RPC', 2, 'Ranchi', tstzrange('2026-10-10 10:00+05:30', '2026-10-11 10:00+05:30', '[)'), 'self', '[]'::jsonb, 'rpc test')).status = 'pending', 'RPC creates pending booking');
select is((select total from public.bookings where ref = 'GLV-RPC'), 2124.00::numeric, 'RPC computes total instead of accepting client total');

select * from finish();
rollback;
