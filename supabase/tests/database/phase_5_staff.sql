create extension if not exists pgtap;

begin;
select plan(14);

-- Prepare mock users
insert into auth.users (id, email)
values
  ('33333333-3333-3333-3333-333333333333', 'staff_member@glivva.test'),
  ('44444444-4444-4444-4444-444444444444', 'customer_lead@glivva.test')
on conflict (id) do nothing;

insert into public.profiles (id, name, phone, role)
values
  ('33333333-3333-3333-3333-333333333333', 'Staff Agent', '+919888833333', 'employee'),
  ('44444444-4444-4444-4444-444444444444', 'Lead Customer', '+919888844444', 'user')
on conflict (id) do update set name = excluded.name, role = excluded.role;

-- Get car id
select id as swift_id from public.cars where slug = 'swift' \gset

-- 1. Create a pending booking for customer
select public.create_booking(
  p_ref => 'GLV-STF01'::text,
  p_car_id => :swift_id::int,
  p_pickup_place => 'Ranchi Station'::text,
  p_period => tstzrange('2029-01-01 10:00:00+05:30', '2029-01-03 10:00:00+05:30', '[)'),
  p_driver_option => 'self'::text,
  p_addons => '[]'::jsonb,
  p_notes => 'Need car clean'::text,
  p_guest_name => 'Lead Customer'::text,
  p_guest_phone => '+919888844444'::text,
  p_guest_email => 'customer_lead@glivva.test'::text
);

select id as staff_booking_id from public.bookings where ref = 'GLV-STF01' \gset

-- Test 1: Plain user querying v_call_queue sees 0 rows
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select is(
  (select count(*)::int from public.v_call_queue where ref = 'GLV-STF01'),
  0,
  'Plain user cannot read call queue'
);

-- Test 2: Anon user querying v_call_queue sees 0 rows
set local role anon;
set local "request.jwt.claims" = '{"role":"anon"}';

select is(
  (select count(*)::int from public.v_call_queue where ref = 'GLV-STF01'),
  0,
  'Anon cannot read call queue'
);

-- Test 3: Employee querying v_call_queue sees the pending lead with customer name
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select is(
  (select count(*)::int from public.v_call_queue where ref = 'GLV-STF01'),
  1,
  'Employee can view pending lead in call queue'
);

-- Test 4: Plain user cannot claim booking
set local "request.jwt.claims" = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select throws_ok(
  format('select public.claim_booking(%L::uuid)', :'staff_booking_id'),
  '42501',
  'access denied: employee role required',
  'Plain user cannot claim booking'
);

-- Test 5: Employee can claim booking and status updates to 'contacted'
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select lives_ok(
  format('select public.claim_booking(%L::uuid)', :'staff_booking_id'),
  'Employee can claim booking'
);

select is(
  (select status from public.bookings where id = :'staff_booking_id'),
  'contacted',
  'Claiming booking moves status to contacted'
);

-- Test 6: Employee logs call outcome 'confirmed'
select lives_ok(
  format('select public.log_call_outcome(%L::uuid, %L, %L)', :'staff_booking_id', 'confirmed', 'Customer verified via phone call'),
  'Employee can log call outcome as confirmed'
);

select is(
  (select status from public.bookings where id = :'staff_booking_id'),
  'confirmed',
  'Logging confirmed outcome moves status to confirmed'
);

-- Test 7: Call log and notification created
reset role;
select is(
  (select count(*)::int from public.call_logs where booking_id = :'staff_booking_id' and outcome = 'confirmed'),
  1,
  'Call log is recorded'
);

select is(
  (select count(*)::int from public.notifications where payload ->> 'ref' = 'GLV-STF01' and template_key = 'booking_confirmed'),
  1,
  'Booking confirmation notification is queued'
);

-- Test 8: Employee records pickup handover (status -> active)
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select lives_ok(
  format('select public.record_handover(%L::uuid, %L, 45200, 100, %L::text[], %L)', :'staff_booking_id', 'pickup', '{pickup1.jpg}', 'Clean car handed over'),
  'Employee can record pickup handover'
);

select is(
  (select status from public.bookings where id = :'staff_booking_id'),
  'active',
  'Pickup handover moves status to active'
);

-- Test 9: Employee records return handover (status -> completed)
select lives_ok(
  format('select public.record_handover(%L::uuid, %L, 45650, 95, %L::text[], %L)', :'staff_booking_id', 'return', '{return1.jpg}', 'Returned with zero damages'),
  'Employee can record return handover'
);

select is(
  (select status from public.bookings where id = :'staff_booking_id'),
  'completed',
  'Return handover moves status to completed'
);

select * from finish();
rollback;
