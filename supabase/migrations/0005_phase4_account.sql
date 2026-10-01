-- Phase 4: User account area hardening, KYC storage policies, and safe cancellation RPC

-- 1. Storage policies for user KYC documents: users can update/delete their own pending KYC files
drop policy if exists kyc_user_update on storage.objects;
create policy kyc_user_update on storage.objects
  for update
  using (
    bucket_id = 'kyc' and (
      auth.uid()::text = (storage.foldername(name))[1] or
      auth_role() in ('employee', 'admin')
    )
  )
  with check (
    bucket_id = 'kyc' and (
      auth.uid()::text = (storage.foldername(name))[1] or
      auth_role() in ('employee', 'admin')
    )
  );

drop policy if exists kyc_user_delete on storage.objects;
create policy kyc_user_delete on storage.objects
  for delete
  using (
    bucket_id = 'kyc' and (
      auth.uid()::text = (storage.foldername(name))[1] or
      auth_role() in ('employee', 'admin')
    )
  );

-- 2. Document verification integrity trigger
create or replace function public.protect_document_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If non-staff user is inserting, verified must be false
  if tg_op = 'INSERT' then
    if auth_role() not in ('employee', 'admin') then
      new.verified := false;
    end if;
  elsif tg_op = 'UPDATE' then
    -- Non-staff cannot flip verified from false to true
    if auth_role() not in ('employee', 'admin') then
      if old.verified = false and new.verified = true then
        new.verified := false;
      end if;
      -- If document path was changed by owner, reset verification to false
      if old.storage_path is distinct from new.storage_path then
        new.verified := false;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_document_verification on public.documents;
create trigger protect_document_verification
before insert or update on public.documents
for each row execute function public.protect_document_verification();

-- 3. Safe customer/staff booking cancellation RPC
create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_reason text default 'Cancelled by customer'
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_user_id uuid := auth.uid();
  v_role text := auth_role();
  v_old_status text;
  v_customer_phone text;
  v_customer_name text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;

  -- Verify permissions: must be booking owner or staff
  if v_role not in ('employee', 'admin') and v_booking.user_id <> v_user_id then
    raise exception 'permission denied' using errcode = '42501';
  end if;

  -- Check status eligibility
  if v_booking.status in ('completed', 'cancelled', 'rejected') then
    raise exception 'booking is already finalized (% status)', v_booking.status using errcode = '22023';
  end if;

  -- Customers cannot cancel trips that have already started
  if v_role not in ('employee', 'admin') and lower(v_booking.period) <= now() then
    raise exception 'ongoing or past trips cannot be cancelled online, please contact support' using errcode = '22023';
  end if;

  v_old_status := v_booking.status;

  -- Update booking status
  update public.bookings
  set status = 'cancelled',
      notes = case 
        when notes is null or notes = '' then 'Cancellation reason: ' || coalesce(p_reason, 'Cancelled')
        else notes || E'\n' || 'Cancellation reason: ' || coalesce(p_reason, 'Cancelled')
      end
  where id = p_booking_id
  returning * into v_booking;

  -- Record in booking status history
  insert into public.booking_status_history (
    booking_id,
    from_status,
    to_status,
    note,
    changed_by
  ) values (
    p_booking_id,
    v_old_status,
    'cancelled',
    coalesce(p_reason, 'Cancelled by user'),
    v_user_id
  );

  -- Retrieve customer name/phone for notification
  select name, phone into v_customer_name, v_customer_phone
  from public.profiles
  where id = v_booking.user_id;

  -- Enqueue mock notification
  insert into public.notifications (
    channel,
    recipient,
    template_key,
    payload,
    status
  ) values (
    'whatsapp',
    coalesce(v_customer_phone, 'unknown'),
    'booking_rejected',
    jsonb_build_object(
      'name', coalesce(v_customer_name, 'Customer'),
      'ref', v_booking.ref,
      'booking_id', v_booking.id,
      'reason', coalesce(p_reason, 'Cancelled as requested')
    ),
    'queued'
  );

  return v_booking;
end;
$$;

revoke all on function public.cancel_booking(uuid, text) from public;
grant execute on function public.cancel_booking(uuid, text) to authenticated, service_role;
