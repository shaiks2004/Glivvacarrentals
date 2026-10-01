create extension if not exists pgtap;

begin;
select plan(10);

-- 1. Create mock users
insert into auth.users (id, email)
values
  ('88888888-8888-8888-8888-888888888888', 'customer_kyc@glivva.test'),
  ('99999999-9999-9999-9999-999999999999', 'staff_verifier@glivva.test')
on conflict (id) do nothing;

insert into public.profiles (id, name, phone, role)
values
  ('88888888-8888-8888-8888-888888888888', 'KYC Customer', '+919999988888', 'user'),
  ('99999999-9999-9999-9999-999999999999', 'Staff Verifier', '+919999999999', 'employee')
on conflict (id) do update set name = excluded.name, phone = excluded.phone, role = excluded.role;

-- 2. Insert test unverified document for customer
insert into public.documents (id, user_id, kind, storage_path, verified)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '88888888-8888-8888-8888-888888888888', 'driving_licence', 'kyc/88888888-8888-8888-8888-888888888888/dl.jpg', false)
on conflict (id) do update set verified = false;

-- Test 1: Plain user calling verify_kyc_document is rejected
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"88888888-8888-8888-8888-888888888888","role":"authenticated"}';

select throws_ok(
  $$select public.verify_kyc_document('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, true)$$,
  '42501',
  null,
  'Plain user cannot verify KYC documents'
);

-- Test 2: Staff calling verify_kyc_document succeeds
set local "request.jwt.claims" = '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';

select lives_ok(
  $$select public.verify_kyc_document('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, true)$$,
  'Staff can verify customer KYC document'
);

-- Test 3: Verify document verified field is true
select is(
  (select verified from public.documents where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
  true,
  'Document verified status updated to true'
);

-- Test 4: Approval notification queued
select is(
  (select count(*)::int from public.notifications where template_key = 'kyc_approved' and status = 'queued' and payload->>'name' = 'KYC Customer'),
  1,
  'kyc_approved notification queued for test user'
);

-- Test 5: Reject document workflow
select lives_ok(
  $$select public.verify_kyc_document('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, false, 'Expired licence copy')$$,
  'Staff can mark document unverified with reason'
);

-- Test 6: Document verified is now false
select is(
  (select verified from public.documents where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
  false,
  'Document verified status updated to false'
);

-- Test 7: Rejection notification queued
select is(
  (select count(*)::int from public.notifications where template_key = 'kyc_rejected' and status = 'queued' and payload->>'name' = 'KYC Customer'),
  1,
  'kyc_rejected notification queued for test user'
);

-- Test 8: Non-staff cannot dispatch notifications
set local "request.jwt.claims" = '{"sub":"88888888-8888-8888-8888-888888888888","role":"authenticated"}';

select throws_ok(
  $$select public.dispatch_notifications_sandbox()$$,
  '42501',
  null,
  'Non-staff cannot invoke notification dispatcher'
);

-- Test 9: Staff can invoke notification dispatcher
set local "request.jwt.claims" = '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';

select cmp_ok(
  (select public.dispatch_notifications_sandbox()),
  '>=',
  1,
  'Staff dispatch_notifications_sandbox processes queued notifications'
);

-- Test 10: Notifications status is now sent
select cmp_ok(
  (select count(*)::int from public.notifications where template_key = 'kyc_approved' and status = 'sent' and payload->>'name' = 'KYC Customer'),
  '>=',
  1,
  'Notification transitioned from queued to sent with provider ID'
);

select * from finish();
rollback;
