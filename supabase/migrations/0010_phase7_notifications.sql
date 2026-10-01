-- Phase 7: KYC Document Verification, RLS read policy, and Notification Engine RPCs

-- 1. Ensure staff/admin can read customer KYC documents for verification
drop policy if exists documents_owner_or_assigned_read on public.documents;
drop policy if exists documents_owner_or_staff_read on public.documents;
create policy documents_owner_or_staff_read on public.documents
  for select using (
    user_id = auth.uid() or auth_role() in ('employee', 'admin')
  );

-- 2. Insert KYC and cancellation message templates
insert into public.message_templates (key, channel, body) values
  ('kyc_approved', 'whatsapp', 'Hi {{name}}, your KYC documents have been verified and approved by Glivva. Your bookings are now ready for instant trip confirmation.'),
  ('kyc_approved', 'email', 'Dear {{name}}, your KYC documents have been successfully verified. You are now fully approved for Glivva self-drive rentals.'),
  ('kyc_rejected', 'whatsapp', 'Hi {{name}}, we could not verify your KYC document ({{kind}}). Reason: {{reason}}. Please re-upload via your account dashboard.'),
  ('kyc_rejected', 'email', 'Dear {{name}}, your uploaded KYC document ({{kind}}) was declined. Reason: {{reason}}. Please log in to upload a clear copy.'),
  ('booking_cancelled', 'whatsapp', 'Hi {{name}}, your booking {{ref}} has been cancelled. If any refund is due, it will be processed within 5-7 working days.'),
  ('booking_cancelled', 'email', 'Dear {{name}}, your booking {{ref}} has been cancelled. Free cancellation policy applies per terms.')
on conflict (key, channel) do update set body = excluded.body, active = true;

-- 3. KYC Document Verification RPC
create or replace function public.verify_kyc_document(
  p_document_id uuid,
  p_verified boolean,
  p_note text default null
)
returns public.documents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc public.documents%rowtype;
  v_user public.profiles%rowtype;
  v_actor_id uuid := auth.uid();
begin
  if auth_role() not in ('employee', 'admin') then
    raise exception 'forbidden: staff or admin role required' using errcode = '42501';
  end if;

  select * into v_doc from public.documents where id = p_document_id;
  if not found then
    raise exception 'document not found' using errcode = 'P0002';
  end if;

  update public.documents
  set verified = p_verified
  where id = p_document_id
  returning * into v_doc;

  select * into v_user from public.profiles where id = v_doc.user_id;

  -- Enqueue notification to user
  if p_verified then
    insert into public.notifications (channel, recipient, template_key, payload, status)
    values (
      'whatsapp',
      coalesce(v_user.phone, v_user.name, 'Customer'),
      'kyc_approved',
      jsonb_build_object('name', v_user.name, 'kind', v_doc.kind),
      'queued'
    );
  else
    insert into public.notifications (channel, recipient, template_key, payload, status)
    values (
      'whatsapp',
      coalesce(v_user.phone, v_user.name, 'Customer'),
      'kyc_rejected',
      jsonb_build_object('name', v_user.name, 'kind', v_doc.kind, 'reason', coalesce(p_note, 'Document unreadable or invalid')),
      'queued'
    );
  end if;

  -- Record in audit logs
  insert into public.audit_logs (actor_id, action, "table", record_id, after)
  values (
    v_actor_id,
    case when p_verified then 'VERIFY_KYC_DOC' else 'REJECT_KYC_DOC' end,
    'documents',
    p_document_id::text,
    jsonb_build_object('verified', p_verified, 'user_id', v_doc.user_id, 'kind', v_doc.kind, 'note', p_note)
  );

  return v_doc;
end;
$$;

revoke all on function public.verify_kyc_document(uuid, boolean, text) from public;
grant execute on function public.verify_kyc_document(uuid, boolean, text) to authenticated;

-- 4. Sandbox Notification Dispatcher RPC
create or replace function public.dispatch_notifications_sandbox()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  if auth_role() not in ('employee', 'admin') then
    raise exception 'forbidden: staff or admin role required' using errcode = '42501';
  end if;

  with pending as (
    select id from public.notifications where status = 'queued'
  )
  update public.notifications n
  set
    status = 'sent',
    provider_id = 'MOCK-GW-' || substr(gen_random_uuid()::text, 1, 8),
    attempts = n.attempts + 1
  from pending
  where n.id = pending.id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.dispatch_notifications_sandbox() from public;
grant execute on function public.dispatch_notifications_sandbox() to authenticated;
