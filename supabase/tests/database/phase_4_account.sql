create extension if not exists pgtap;

begin;
select plan(10);

-- Prepare mock users
insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'account_user_a@glivva.test'),
  ('22222222-2222-2222-2222-222222222222', 'account_user_b@glivva.test')
on conflict (id) do nothing;

insert into public.profiles (id, name, phone, role)
values
  ('11111111-1111-1111-1111-111111111111', 'User A', '+919999911111', 'user'),
  ('22222222-2222-2222-2222-222222222222', 'User B', '+919999922222', 'user')
on conflict (id) do update set name = excluded.name, role = excluded.role;

-- Get car id
select id as swift_id from public.cars where slug = 'swift' \gset

-- 1. Create booking for User A as User A
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select public.create_booking(
  p_ref => 'GLV-ACCA1'::text,
  p_car_id => :swift_id::int,
  p_pickup_place => 'Ranchi Airport'::text,
  p_period => tstzrange('2027-01-01 10:00:00+05:30', '2027-01-03 10:00:00+05:30', '[)'),
  p_driver_option => 'self'::text,
  p_addons => '[]'::jsonb,
  p_notes => 'User A Booking'::text
);

-- Create booking for User B as User B
set local "request.jwt.claims" = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select public.create_booking(
  p_ref => 'GLV-ACCB1'::text,
  p_car_id => :swift_id::int,
  p_pickup_place => 'Ranchi Airport'::text,
  p_period => tstzrange('2027-01-05 10:00:00+05:30', '2027-01-08 10:00:00+05:30', '[)'),
  p_driver_option => 'self'::text,
  p_addons => '[]'::jsonb,
  p_notes => 'User B Booking'::text
);

reset role;
-- Insert documents for User A and User B
insert into public.documents (id, user_id, kind, storage_path, verified)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'driving_licence', '11111111-1111-1111-1111-111111111111/dl.jpg', false),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'driving_licence', '22222222-2222-2222-2222-222222222222/dl.jpg', false)
on conflict (id) do nothing;

select id as user_a_booking_id from public.bookings where ref = 'GLV-ACCA1' \gset
select id as user_b_booking_id from public.bookings where ref = 'GLV-ACCB1' \gset

-- Test 1: User A sees only User A's booking
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from public.bookings where ref in ('GLV-ACCA1', 'GLV-ACCB1')),
  1,
  'User A can only query their own bookings'
);

-- Test 2: User A sees only User A's documents
select is(
  (select count(*)::int from public.documents where id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')),
  1,
  'User A can only query their own documents'
);

-- Test 3: User A attempting to mark their own document verified resets to false
update public.documents set verified = true where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is(
  (select verified from public.documents where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  false,
  'User cannot self-verify their own document'
);

-- Test 4: User A attempting to cancel User B booking fails with permission error
select throws_ok(
  format('select public.cancel_booking(%L::uuid, %L)', :'user_b_booking_id', 'Intrusion cancel'),
  '42501',
  'permission denied',
  'User A cannot cancel User B booking'
);

-- Test 5: User A cancelling their own booking succeeds
select lives_ok(
  format('select public.cancel_booking(%L::uuid, %L)', :'user_a_booking_id', 'Customer change of plans'),
  'User A can cancel their own booking'
);

-- Test 6: Cancelled booking has status 'cancelled'
select is(
  (select status from public.bookings where ref = 'GLV-ACCA1'),
  'cancelled',
  'Booking status is updated to cancelled'
);

-- Test 7: Booking status history has record of cancellation
reset role;
select is(
  (select count(*)::int from public.booking_status_history where booking_id = :'user_a_booking_id' and to_status = 'cancelled'),
  1,
  'Cancellation is recorded in booking_status_history'
);

-- Test 8: Notification is queued for cancellation
select is(
  (select count(*)::int from public.notifications where payload ->> 'ref' = 'GLV-ACCA1' and template_key = 'booking_rejected' and status = 'queued'),
  1,
  'Cancellation notification is enqueued'
);

-- Test 9: Cancelling an already cancelled booking fails
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok(
  format('select public.cancel_booking(%L::uuid, %L)', :'user_a_booking_id', 'Duplicate cancel'),
  '22023',
  NULL,
  'Cannot cancel an already cancelled booking'
);

-- Test 10: Anon user cannot query bookings or documents
set local role anon;
set local "request.jwt.claims" = '{"role":"anon"}';

select is(
  (select count(*)::int from public.bookings where ref = 'GLV-ACCA1'),
  0,
  'Anon cannot view bookings'
);

select * from finish();
rollback;
