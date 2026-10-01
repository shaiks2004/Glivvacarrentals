-- Phase 3: Public Booking Flow & Availability Search RPCs

-- 1. Drop old 7-arg create_booking to avoid signature ambiguity
drop function if exists public.create_booking(text, int, text, tstzrange, text, jsonb, text);

-- 2. Create unified 10-arg create_booking RPC supporting both logged-in and guest reservations
create or replace function public.create_booking(
  p_ref text default null,
  p_car_id int default null,
  p_pickup_place text default null,
  p_period tstzrange default null,
  p_driver_option text default 'self',
  p_addons jsonb default '[]',
  p_notes text default null,
  p_guest_name text default null,
  p_guest_phone text default null,
  p_guest_email text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_car public.cars%rowtype;
  v_days numeric;
  v_subtotal numeric(10, 2);
  v_tax numeric(10, 2);
  v_total numeric(10, 2);
  v_ref text := coalesce(p_ref, 'GLV-' || upper(substr(md5(random()::text), 1, 6)));
  v_booking public.bookings;
  v_full_notes text;
  v_customer_name text;
  v_customer_phone text;
  v_addon_cost numeric(10, 2) := 0;
  v_addon record;
begin
  if p_period is null or lower(p_period) is null or upper(p_period) is null or lower(p_period) >= upper(p_period) then
    raise exception 'valid booking period required' using errcode = '22023';
  end if;

  if p_driver_option not in ('self', 'chauffeur') then
    raise exception 'invalid driver option' using errcode = '22023';
  end if;

  if p_car_id is null then
    raise exception 'car selection required' using errcode = '22023';
  end if;

  select * into v_car from public.cars where id = p_car_id and active;
  if not found then
    raise exception 'car is not bookable' using errcode = 'P0002';
  end if;

  -- Verify no expired mandatory car documents
  if exists (
    select 1 from public.car_documents
    where car_id = p_car_id and expiry_date < current_date
  ) then
    raise exception 'car has expired compliance documents' using errcode = '23P01';
  end if;

  -- Compute days (standard 24h day units rounded up)
  v_days := ceil(extract(epoch from (upper(p_period) - lower(p_period))) / 86400);
  if v_days < 1 then v_days := 1; end if;

  v_subtotal := v_car.price_per_day * v_days;
  if p_driver_option = 'chauffeur' then
    v_subtotal := v_subtotal + (1000 * v_days);
  end if;

  -- Add-on calculations if passed as array of objects with rates
  if p_addons is not null and jsonb_array_length(p_addons) > 0 then
    for v_addon in select * from jsonb_to_recordset(p_addons) as x(id text, rate numeric)
    loop
      if v_addon.rate is not null and v_addon.rate > 0 then
        v_addon_cost := v_addon_cost + (v_addon.rate * v_days);
      end if;
    end loop;
    v_subtotal := v_subtotal + v_addon_cost;
  end if;

  v_tax := round(v_subtotal * 0.18, 2);
  v_total := v_subtotal + v_tax;

  -- Format notes with guest contact details if unauthenticated
  v_full_notes := coalesce(p_notes, '');
  if v_user_id is null then
    if coalesce(p_guest_phone, '') = '' or coalesce(p_guest_name, '') = '' then
      raise exception 'name and phone are required for guest booking' using errcode = '22023';
    end if;
    v_customer_name := p_guest_name;
    v_customer_phone := p_guest_phone;
    v_full_notes := 'Guest: ' || p_guest_name || ' | Phone: ' || p_guest_phone ||
                    case when p_guest_email is not null and p_guest_email <> '' then ' | Email: ' || p_guest_email else '' end ||
                    case when v_full_notes <> '' then E'\nNotes: ' || v_full_notes else '' end;
  else
    select name, phone into v_customer_name, v_customer_phone from public.profiles where id = v_user_id;
    v_customer_name := coalesce(v_customer_name, 'Customer');
    v_customer_phone := coalesce(v_customer_phone, 'Phone on file');
  end if;

  insert into public.bookings (
    ref, user_id, car_id, pickup_place, period, driver_option, addons,
    subtotal, tax, total, status, notes
  ) values (
    v_ref, v_user_id, p_car_id, coalesce(p_pickup_place, 'Main Branch'),
    p_period, p_driver_option, coalesce(p_addons, '[]'),
    v_subtotal, v_tax, v_total, 'pending', v_full_notes
  )
  returning * into v_booking;

  -- Queue mock notification into notifications table
  insert into public.notifications (
    channel, recipient, template_key, payload, status
  ) values (
    'whatsapp',
    coalesce(v_customer_phone, '9999999999'),
    'booking_received',
    jsonb_build_object(
      'name', v_customer_name,
      'ref', v_ref,
      'car', v_car.name,
      'pickup_place', coalesce(p_pickup_place, 'Main Branch'),
      'start_date', lower(p_period)::text,
      'end_date', upper(p_period)::text,
      'total', v_total
    ),
    'queued'
  );

  return v_booking;
end;
$$;

revoke all on function public.create_booking(text, int, text, tstzrange, text, jsonb, text, text, text, text) from public;
grant execute on function public.create_booking(text, int, text, tstzrange, text, jsonb, text, text, text, text) to anon, authenticated, service_role;


-- 3. Availability search RPC that respects bookings, blocks, and expired documents
create or replace function public.search_available_cars(
  p_city_slug text default null,
  p_period tstzrange default null
)
returns table (
  id int,
  slug text,
  name text,
  category text,
  seats int,
  fuel text,
  transmission text,
  price_per_day numeric(10, 2),
  city_id int,
  city_name text,
  city_slug text,
  photo_urls text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    c.id,
    c.slug,
    c.name,
    c.category,
    c.seats,
    c.fuel,
    c.transmission,
    c.price_per_day,
    c.city_id,
    ct.name as city_name,
    ct.slug as city_slug,
    c.photo_urls
  from public.cars c
  left join public.cities ct on ct.id = c.city_id
  where c.active = true
    and (p_city_slug is null or ct.slug = p_city_slug)
    -- Must not have expired compliance documents
    and not exists (
      select 1 from public.car_documents cd
      where cd.car_id = c.id and cd.expiry_date < current_date
    )
    -- If period provided, check no overlapping active bookings
    and (
      p_period is null or not exists (
        select 1 from public.bookings b
        where b.car_id = c.id
          and b.status in ('pending', 'contacted', 'confirmed', 'active')
          and b.period && p_period
      )
    )
    -- If period provided, check no overlapping car blocks
    and (
      p_period is null or not exists (
        select 1 from public.car_blocks cb
        where cb.car_id = c.id
          and cb.period && p_period
      )
    )
  order by c.price_per_day asc;
end;
$$;

revoke all on function public.search_available_cars(text, tstzrange) from public;
grant execute on function public.search_available_cars(text, tstzrange) to anon, authenticated, service_role;
