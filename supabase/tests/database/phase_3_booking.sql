\set ON_ERROR_STOP on
create extension if not exists pgtap;

begin;
select plan(9);

select '00000000-0000-0000-0000-000000000020'::uuid as user_p3 \gset
select id as swift_id from public.cars where slug = 'swift' \gset
select id as creta_id from public.cars where slug = 'creta' \gset

set local role postgres;
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  (:'user_p3', 'authenticated', 'authenticated', 'p3-user@example.test', 'not-used', now(), '{"name":"Phase3 User","phone":"+919988776655"}'::jsonb)
on conflict (id) do nothing;

-- 1. Test guest booking via RPC as anon
set local role anon;
select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.sub', '', true);

select lives_ok(
  format(
    $$select public.create_booking(
      'GLV-P3-GUEST',
      %s,
      'Ranchi Airport',
      tstzrange('2028-11-01 10:00+05:30', '2028-11-03 10:00+05:30', '[)'),
      'self',
      '[{"id":"gps","rate":150}]'::jsonb,
      'Special flight arrival',
      'Guest Traveler',
      '+919876543210',
      'guest@example.test'
    )$$,
    :'creta_id'
  ),
  'guest can create a booking request via RPC'
);

reset role;
set local role postgres;
select is((select status from public.bookings where ref = 'GLV-P3-GUEST'), 'pending', 'guest booking is inserted with pending status');
select is((select count(*)::int from public.notifications where template_key = 'booking_received' and payload ->> 'ref' = 'GLV-P3-GUEST'), 1, 'mock notification is queued for guest');

-- 2. Test parallel / duplicate booking for the same car & period (must fail with exclusion constraint error 23P01)
select throws_ok(
  format(
    $$select public.create_booking(
      'GLV-P3-DUP',
      %s,
      'Ranchi Airport',
      tstzrange('2028-11-02 10:00+05:30', '2028-11-04 10:00+05:30', '[)'),
      'self',
      '[]'::jsonb,
      null,
      'Second Guest',
      '+919876543211',
      'guest2@example.test'
    )$$,
    :'creta_id'
  ),
  '23P01',
  null,
  'second overlapping booking for same car fails with 23P01'
);

-- 3. Test logged-in user booking
set local role authenticated;
select set_config('request.jwt.claim.sub', :'user_p3', true);
select lives_ok(
  format(
    $$select public.create_booking(
      'GLV-P3-USER',
      %s,
      'Ranchi Station',
      tstzrange('2028-11-05 10:00+05:30', '2028-11-07 10:00+05:30', '[)'),
      'chauffeur',
      '[]'::jsonb,
      'User reservation'
    )$$,
    :'swift_id'
  ),
  'logged-in user can create booking via RPC'
);

reset role;
set local role postgres;
select is((select user_id from public.bookings where ref = 'GLV-P3-USER'), :'user_p3', 'booking references authenticated user profile');
select is((select subtotal from public.bookings where ref = 'GLV-P3-USER'), 5600.00::numeric, 'subtotal correctly includes chauffeur daily rate');

-- 4. Test search_available_cars RPC
-- Creta is booked from Nov 1 to Nov 3 in 2028. Searching Nov 1-3 in Ranchi should NOT return Creta.
select is(
  (select count(*)::int from public.search_available_cars('ranchi', tstzrange('2028-11-01 10:00+05:30', '2028-11-03 10:00+05:30', '[)')) where slug = 'creta'),
  0,
  'search_available_cars excludes booked car for overlapping dates'
);

-- Searching Nov 10-12 in Ranchi should return available cars
select ok(
  (select count(*)::int from public.search_available_cars('ranchi', tstzrange('2028-11-10 10:00+05:30', '2028-11-12 10:00+05:30', '[)'))) >= 2,
  'search_available_cars includes available cars for open dates'
);

select * from finish();
rollback;
