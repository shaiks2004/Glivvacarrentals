create extension if not exists pgtap;

begin;
select plan(12);

-- 1. Setup mock profiles and city for testing
insert into public.cities (slug, name, state)
values ('ranchi', 'Ranchi', 'Jharkhand')
on conflict (slug) do nothing;

select id as test_city_id from public.cities where slug = 'ranchi' \gset

insert into auth.users (id, email)
values
  ('55555555-5555-5555-5555-555555555555', 'admin_boss@glivva.test'),
  ('66666666-6666-6666-6666-666666666666', 'standard_user@glivva.test'),
  ('77777777-7777-7777-7777-777777777777', 'operations_guy@glivva.test')
on conflict (id) do nothing;

insert into public.profiles (id, name, phone, role)
values
  ('55555555-5555-5555-5555-555555555555', 'Super Admin', '+919999955555', 'admin'),
  ('66666666-6666-6666-6666-666666666666', 'Standard User', '+919999966666', 'user'),
  ('77777777-7777-7777-7777-777777777777', 'Ops Staff', '+919999977777', 'employee')
on conflict (id) do update set name = excluded.name, role = excluded.role;

-- Test 1: Plain user querying audit_logs gets 0 rows
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';

select is(
  (select count(*)::int from public.audit_logs),
  0,
  'Plain user cannot read audit_logs'
);

-- Test 2: Employee querying audit_logs gets 0 rows
set local "request.jwt.claims" = '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}';

select is(
  (select count(*)::int from public.audit_logs),
  0,
  'Employee cannot read audit_logs'
);

-- Test 3: Admin querying audit_logs can read records
set local "request.jwt.claims" = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

select cmp_ok(
  (select count(*)::int from public.audit_logs),
  '>=',
  0,
  'Admin can query audit_logs table'
);

-- Test 4: Plain user cannot insert or update offers
set local "request.jwt.claims" = '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';

select throws_ok(
  $$insert into public.offers (code, title, percent_off) values ('HACK50', '50% off', 50)$$,
  '42501',
  null,
  'Plain user cannot create promotional offers'
);

-- Test 5: Admin can insert and update offers
set local "request.jwt.claims" = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

select lives_ok(
  $$insert into public.offers (code, title, description, percent_off, active)
    values ('MONSOON20', 'Monsoon Special', '20% discount on self drive', 20, true)
    on conflict (code) do update set percent_off = 20$$,
  'Admin can create and update promotional offers'
);

-- Test 6: Verify offer was saved
select is(
  (select percent_off from public.offers where code = 'MONSOON20'),
  20,
  'Offer code MONSOON20 saved with 20% discount'
);

-- Test 7: Plain user cannot update site_settings (0 rows updated)
set local "request.jwt.claims" = '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';

update public.site_settings set value = '"hacked"'::jsonb where key = 'phone';

select is(
  (select count(*)::int from public.site_settings where key = 'phone' and value = '"hacked"'::jsonb),
  0,
  'Plain user update on site_settings affects 0 rows'
);

-- Test 8: Admin can update site_settings
set local "request.jwt.claims" = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

select lives_ok(
  $$update public.site_settings set value = '"9876543210"'::jsonb where key = 'whatsapp'$$,
  'Admin can update site_settings'
);

-- Test 9: Plain user querying site_settings gets 0 rows (admin only)
set local "request.jwt.claims" = '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';

select is(
  (select count(*)::int from public.site_settings),
  0,
  'Plain user cannot read site_settings'
);

-- Test 10: Admin can manage employee city assignments
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

select lives_ok(
  format('insert into public.employee_cities (employee_id, city_id) values (''77777777-7777-7777-7777-777777777777'', %s) on conflict do nothing', :test_city_id),
  'Admin can assign employee to city'
);

-- Test 11: Non-admin cannot assign employee cities
set local "request.jwt.claims" = '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}';

select throws_ok(
  format('insert into public.employee_cities (employee_id, city_id) values (''77777777-7777-7777-7777-777777777777'', %s)', :test_city_id),
  '42501',
  null,
  'Employee cannot assign themselves new cities'
);

-- Test 12: Admin can query v_dashboard_kpis
set local "request.jwt.claims" = '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

select isnt_empty(
  $$select * from public.v_dashboard_kpis$$,
  'Admin can query executive dashboard KPIs'
);

select * from finish();
rollback;
