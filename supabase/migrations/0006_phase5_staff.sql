-- Phase 5: Employee Portal operational views, call logging, handover records, and staff RPCs

-- 1. Enhanced Call Queue View with customer, vehicle, assignment, and attempts metadata
drop view if exists public.v_call_queue;
create view public.v_call_queue
with (security_invoker = true)
as
select
  b.id,
  b.ref,
  b.user_id,
  b.car_id,
  b.pickup_place,
  b.period,
  b.driver_option,
  b.total,
  b.status,
  b.notes,
  b.created_at,
  p.name as customer_name,
  p.phone as customer_phone,
  c.name as car_name,
  c.slug as car_slug,
  c.category as car_category,
  ba.employee_id,
  ep.name as employee_name,
  ba.assigned_at,
  count(cl.id)::int as attempts,
  max(cl.created_at) as last_call_at
from public.bookings b
left join public.profiles p on p.id = b.user_id
left join public.cars c on c.id = b.car_id
left join public.booking_assignments ba on ba.booking_id = b.id
left join public.profiles ep on ep.id = ba.employee_id
left join public.call_logs cl on cl.booking_id = b.id
where b.status in ('pending', 'contacted', 'no_answer')
  and auth_role() in ('employee', 'admin')
group by
  b.id, b.ref, b.user_id, b.car_id, b.pickup_place, b.period, b.driver_option, b.total,
  b.status, b.notes, b.created_at, p.name, p.phone, c.name, c.slug, c.category,
  ba.employee_id, ep.name, ba.assigned_at;

-- 2. Claim Booking RPC
create or replace function public.claim_booking(
  p_booking_id uuid
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_employee_id uuid := auth.uid();
  v_old_status text;
begin
  if auth_role() not in ('employee', 'admin') then
    raise exception 'access denied: employee role required' using errcode = '42501';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;

  -- Insert or update booking assignment
  insert into public.booking_assignments (booking_id, employee_id, assigned_at, assigned_by)
  values (p_booking_id, v_employee_id, now(), v_employee_id)
  on conflict (booking_id) do update
  set employee_id = excluded.employee_id,
      assigned_at = excluded.assigned_at,
      assigned_by = excluded.assigned_by;

  -- If status was pending, transition to contacted
  if v_booking.status = 'pending' then
    v_old_status := v_booking.status;
    update public.bookings
    set status = 'contacted'
    where id = p_booking_id
    returning * into v_booking;

    insert into public.booking_status_history (
      booking_id,
      from_status,
      to_status,
      note,
      changed_by
    ) values (
      p_booking_id,
      v_old_status,
      'contacted',
      'Lead claimed by agent',
      v_employee_id
    );
  end if;

  return v_booking;
end;
$$;

revoke all on function public.claim_booking(uuid) from public;
grant execute on function public.claim_booking(uuid) to authenticated, service_role;

-- 3. Log Call Outcome RPC
create or replace function public.log_call_outcome(
  p_booking_id uuid,
  p_outcome text,
  p_note text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_employee_id uuid := auth.uid();
  v_old_status text;
  v_new_status text;
  v_customer_phone text;
  v_customer_name text;
begin
  if auth_role() not in ('employee', 'admin') then
    raise exception 'access denied: employee role required' using errcode = '42501';
  end if;

  if p_outcome not in ('confirmed', 'no_answer', 'reschedule', 'customer_cancelled', 'rejected') then
    raise exception 'invalid call outcome: %', p_outcome using errcode = '22023';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;

  -- Insert into call_logs
  insert into public.call_logs (booking_id, employee_id, outcome, note)
  values (p_booking_id, v_employee_id, p_outcome, p_note);

  -- Map outcome to new booking status
  case p_outcome
    when 'confirmed' then v_new_status := 'confirmed';
    when 'no_answer' then v_new_status := 'no_answer';
    when 'reschedule' then v_new_status := 'contacted';
    when 'customer_cancelled' then v_new_status := 'cancelled';
    when 'rejected' then v_new_status := 'rejected';
  end case;

  v_old_status := v_booking.status;

  -- Update booking record
  update public.bookings
  set status = v_new_status,
      notes = case
        when p_note is null or p_note = '' then notes
        when notes is null or notes = '' then 'Call note (' || p_outcome || '): ' || p_note
        else notes || E'\n' || 'Call note (' || p_outcome || '): ' || p_note
      end
  where id = p_booking_id
  returning * into v_booking;

  -- Record status history transition if status changed
  if v_old_status is distinct from v_new_status then
    insert into public.booking_status_history (
      booking_id,
      from_status,
      to_status,
      note,
      changed_by
    ) values (
      p_booking_id,
      v_old_status,
      v_new_status,
      coalesce(p_note, 'Call outcome: ' || p_outcome),
      v_employee_id
    );
  end if;

  -- Retrieve customer metadata for notification
  select name, phone into v_customer_name, v_customer_phone
  from public.profiles
  where id = v_booking.user_id;

  -- Queue customer notification on confirmation or rejection
  if p_outcome = 'confirmed' then
    insert into public.notifications (
      channel,
      recipient,
      template_key,
      payload,
      status
    ) values (
      'whatsapp',
      coalesce(v_customer_phone, 'unknown'),
      'booking_confirmed',
      jsonb_build_object(
        'name', coalesce(v_customer_name, 'Customer'),
        'ref', v_booking.ref,
        'booking_id', v_booking.id,
        'pickup_date', to_char(lower(v_booking.period) at time zone 'Asia/Kolkata', 'DD Mon YYYY HH:MI AM')
      ),
      'queued'
    );
  elsif p_outcome in ('rejected', 'customer_cancelled') then
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
        'reason', coalesce(p_note, 'Call outcome: ' || p_outcome)
      ),
      'queued'
    );
  end if;

  return v_booking;
end;
$$;

revoke all on function public.log_call_outcome(uuid, text, text) from public;
grant execute on function public.log_call_outcome(uuid, text, text) to authenticated, service_role;

-- 4. Record Handover RPC (Pickup / Return)
create or replace function public.record_handover(
  p_booking_id uuid,
  p_type text,
  p_odometer int,
  p_fuel numeric,
  p_photo_paths text[] default '{}',
  p_notes text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_employee_id uuid := auth.uid();
  v_old_status text;
  v_new_status text;
begin
  if auth_role() not in ('employee', 'admin') then
    raise exception 'access denied: employee role required' using errcode = '42501';
  end if;

  if p_type not in ('pickup', 'return') then
    raise exception 'invalid handover type: %', p_type using errcode = '22023';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;

  -- Insert into handover_records
  insert into public.handover_records (
    booking_id,
    type,
    odometer,
    fuel,
    photo_paths,
    notes,
    employee_id
  ) values (
    p_booking_id,
    p_type,
    p_odometer,
    p_fuel,
    coalesce(p_photo_paths, '{}'),
    p_notes,
    v_employee_id
  );

  v_old_status := v_booking.status;
  if p_type = 'pickup' then
    v_new_status := 'active';
  else
    v_new_status := 'completed';
  end if;

  -- Update booking status
  update public.bookings
  set status = v_new_status
  where id = p_booking_id
  returning * into v_booking;

  -- Record status history
  insert into public.booking_status_history (
    booking_id,
    from_status,
    to_status,
    note,
    changed_by
  ) values (
    p_booking_id,
    v_old_status,
    v_new_status,
    'Vehicle ' || p_type || ' completed (Odometer: ' || coalesce(p_odometer::text, 'N/A') || ', Fuel: ' || coalesce(p_fuel::text, 'N/A') || '%)',
    v_employee_id
  );

  return v_booking;
end;
$$;

revoke all on function public.record_handover(uuid, text, int, numeric, text[], text) from public;
grant execute on function public.record_handover(uuid, text, int, numeric, text[], text) to authenticated, service_role;
