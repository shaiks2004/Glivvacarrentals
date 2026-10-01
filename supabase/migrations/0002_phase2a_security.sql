-- Phase 2a: roles, operational tables, RLS, storage, views, and audit hooks.

create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true;
$$;

revoke all on function public.auth_role() from public;
grant execute on function public.auth_role() to anon, authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.phone,
    'user'
  )
  on conflict (id) do update set
    name = excluded.name,
    phone = excluded.phone;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role <> 'admin' and auth_role() <> 'admin' then
    new.role := old.role;
    new.active := old.active;
    new.created_by := old.created_by;
    new.must_change_password := old.must_change_password;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
before update on public.profiles
for each row execute function public.protect_profile_privileges();

create table public.employee_cities (
  employee_id uuid not null references public.profiles(id) on delete cascade,
  city_id int not null references public.cities(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (employee_id, city_id)
);

create table public.car_documents (
  id uuid primary key default gen_random_uuid(),
  car_id int not null references public.cars(id) on delete cascade,
  type text not null check (type in ('insurance', 'puc', 'rc', 'fitness', 'road_tax', 'permit')),
  number text,
  issue_date date,
  expiry_date date not null,
  file_path text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (car_id, type)
);

create table public.car_service_logs (
  id uuid primary key default gen_random_uuid(),
  car_id int not null references public.cars(id) on delete cascade,
  type text not null,
  service_date date not null,
  odometer int,
  cost numeric(10, 2),
  vendor text,
  notes text,
  next_due_date date,
  next_due_km int,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.car_blocks (
  id uuid primary key default gen_random_uuid(),
  car_id int not null references public.cars(id) on delete cascade,
  period tstzrange not null,
  reason text not null check (reason in ('maintenance', 'reserved', 'other')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint no_overlapping_car_blocks exclude using gist (car_id with =, period with &&)
);

create table public.booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create table public.booking_assignments (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  employee_id uuid not null references public.profiles(id),
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id)
);

create table public.call_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  employee_id uuid not null references public.profiles(id),
  outcome text not null check (outcome in ('confirmed', 'no_answer', 'reschedule', 'customer_cancelled', 'rejected')),
  note text,
  created_at timestamptz not null default now()
);

create table public.handover_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  type text not null check (type in ('pickup', 'return')),
  odometer int,
  fuel numeric(5, 2),
  photo_paths text[] not null default '{}',
  notes text,
  employee_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('whatsapp', 'sms', 'email', 'in_app')),
  recipient text not null,
  template_key text not null,
  payload jsonb not null default '{}',
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  provider_id text,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create table public.message_templates (
  key text not null,
  channel text not null check (channel in ('whatsapp', 'sms', 'email', 'in_app')),
  body text not null,
  active boolean not null default true,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (key, channel)
);

create table public.site_media (
  slot_key text primary key,
  image_url text not null,
  alt text not null default '',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  "table" text not null,
  record_id text,
  before jsonb,
  after jsonb,
  ip inet,
  created_at timestamptz not null default now()
);

create index employee_cities_city_idx on public.employee_cities (city_id);
create index car_documents_car_expiry_idx on public.car_documents (car_id, expiry_date);
create index car_service_logs_car_date_idx on public.car_service_logs (car_id, service_date desc);
create index car_blocks_car_period_idx on public.car_blocks using gist (car_id, period);
create index booking_status_history_booking_idx on public.booking_status_history (booking_id, created_at desc);
create index call_logs_booking_idx on public.call_logs (booking_id, created_at desc);
create index handover_records_booking_idx on public.handover_records (booking_id, created_at desc);
create index notifications_status_created_idx on public.notifications (status, created_at);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create or replace view public.car_compliance
with (security_invoker = true)
as
select
  c.id as car_id,
  c.slug,
  c.name,
  count(cd.id) as document_count,
  count(cd.id) filter (where cd.expiry_date < current_date) as expired_count,
  count(cd.id) filter (where cd.expiry_date >= current_date and cd.expiry_date <= current_date + 30) as expiring_count,
  (count(cd.id) = 6 and count(cd.id) filter (where cd.expiry_date < current_date) = 0 and c.active) as bookable
from public.cars c
left join public.car_documents cd on cd.car_id = c.id
where auth_role() in ('employee', 'admin')
group by c.id, c.slug, c.name, c.active;

create or replace view public.v_call_queue
with (security_invoker = true)
as
select b.id, b.ref, b.user_id, b.car_id, b.pickup_place, b.period, b.status, b.created_at, ba.employee_id
from public.bookings b
left join public.booking_assignments ba on ba.booking_id = b.id
where b.status in ('pending', 'contacted', 'no_answer')
  and auth_role() in ('employee', 'admin');

create or replace view public.v_dashboard_kpis
with (security_invoker = true)
as
select
  count(*) filter (where status = 'pending') as pending_bookings,
  count(*) filter (where status = 'confirmed') as confirmed_bookings,
  count(*) filter (where status = 'active') as active_bookings,
  coalesce(sum(total) filter (where status in ('confirmed', 'active', 'completed')), 0) as booked_value
from public.bookings b
cross join (select auth_role() as role) actor
where actor.role in ('employee', 'admin')
group by actor.role;

create or replace function public.prevent_booking_car_block_overlap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('pending', 'contacted', 'confirmed', 'active') and exists (
    select 1 from public.car_blocks cb
    where cb.car_id = new.car_id and cb.period && new.period
  ) then
    raise exception 'booking overlaps a blocked period' using errcode = '23P01';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_car_block_booking_overlap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.bookings b
    where b.car_id = new.car_id
      and b.status in ('pending', 'contacted', 'confirmed', 'active')
      and b.period && new.period
  ) then
    raise exception 'car block overlaps an active booking' using errcode = '23P01';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_booking_car_block_overlap on public.bookings;
create trigger prevent_booking_car_block_overlap
before insert or update on public.bookings
for each row execute function public.prevent_booking_car_block_overlap();

drop trigger if exists prevent_car_block_booking_overlap on public.car_blocks;
create trigger prevent_car_block_booking_overlap
before insert or update on public.car_blocks
for each row execute function public.prevent_car_block_booking_overlap();

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, action, "table", record_id, before, after)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id', to_jsonb(new) ->> 'key', to_jsonb(old) ->> 'key'),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles after insert or update or delete on public.profiles for each row execute function public.write_audit_log();
drop trigger if exists audit_cars on public.cars;
create trigger audit_cars after insert or update or delete on public.cars for each row execute function public.write_audit_log();
drop trigger if exists audit_bookings on public.bookings;
create trigger audit_bookings after insert or update or delete on public.bookings for each row execute function public.write_audit_log();
drop trigger if exists audit_site_settings on public.site_settings;
create trigger audit_site_settings after insert or update or delete on public.site_settings for each row execute function public.write_audit_log();

alter table public.cities enable row level security;
alter table public.profiles enable row level security;
alter table public.cars enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.documents enable row level security;
alter table public.offers enable row level security;
alter table public.reviews enable row level security;
alter table public.contact_messages enable row level security;
alter table public.employee_cities enable row level security;
alter table public.car_documents enable row level security;
alter table public.car_service_logs enable row level security;
alter table public.car_blocks enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.booking_assignments enable row level security;
alter table public.call_logs enable row level security;
alter table public.handover_records enable row level security;
alter table public.notifications enable row level security;
alter table public.message_templates enable row level security;
alter table public.site_media enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy cities_public_read on public.cities for select using (true);
create policy cities_admin_write on public.cities for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy profiles_self_or_staff_read on public.profiles for select using (auth.uid() = id or auth_role() in ('employee', 'admin'));
create policy profiles_self_update on public.profiles for update using (auth.uid() = id or auth_role() = 'admin') with check (auth.uid() = id or auth_role() = 'admin');
create policy profiles_admin_insert on public.profiles for insert with check (auth_role() = 'admin');
create policy profiles_admin_delete on public.profiles for delete using (auth_role() = 'admin');

create policy cars_public_read on public.cars for select using (active or auth_role() in ('employee', 'admin'));
create policy cars_staff_write on public.cars for insert with check (auth_role() in ('employee', 'admin'));
create policy cars_staff_update on public.cars for update using (auth_role() in ('employee', 'admin')) with check (auth_role() in ('employee', 'admin'));
create policy cars_admin_delete on public.cars for delete using (auth_role() = 'admin');

create policy bookings_owner_or_staff_read on public.bookings for select using (auth.uid() = user_id or auth_role() in ('employee', 'admin'));
create policy bookings_owner_or_staff_update on public.bookings for update using (auth.uid() = user_id or auth_role() in ('employee', 'admin')) with check (auth.uid() = user_id or auth_role() in ('employee', 'admin'));
create policy bookings_admin_delete on public.bookings for delete using (auth_role() = 'admin');

create policy payments_owner_or_staff_read on public.payments for select using (exists (select 1 from public.bookings b where b.id = booking_id and (b.user_id = auth.uid() or auth_role() in ('employee', 'admin'))));
create policy payments_staff_write on public.payments for all using (auth_role() in ('employee', 'admin')) with check (auth_role() in ('employee', 'admin'));

create policy documents_owner_or_assigned_read on public.documents for select using (
  user_id = auth.uid() or auth_role() = 'admin' or exists (
    select 1 from public.booking_assignments ba join public.bookings b on b.id = ba.booking_id
    where ba.employee_id = auth.uid() and b.user_id = documents.user_id
  )
);
create policy documents_owner_insert on public.documents for insert with check (user_id = auth.uid() or auth_role() in ('employee', 'admin'));
create policy documents_owner_or_staff_update on public.documents for update using (user_id = auth.uid() or auth_role() in ('employee', 'admin')) with check (user_id = auth.uid() or auth_role() in ('employee', 'admin'));
create policy documents_admin_delete on public.documents for delete using (auth_role() = 'admin');

create policy offers_public_read on public.offers for select using (active or auth_role() in ('employee', 'admin'));
create policy offers_admin_write on public.offers for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy reviews_public_read on public.reviews for select using (approved or auth_role() in ('employee', 'admin'));
create policy reviews_owner_insert on public.reviews for insert with check (exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));
create policy reviews_admin_write on public.reviews for update using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy contact_public_insert on public.contact_messages for insert with check (true);
create policy contact_staff_read on public.contact_messages for select using (auth_role() in ('employee', 'admin'));
create policy contact_staff_update on public.contact_messages for update using (auth_role() in ('employee', 'admin')) with check (auth_role() in ('employee', 'admin'));

create policy employee_cities_self_or_admin_read on public.employee_cities for select using (employee_id = auth.uid() or auth_role() = 'admin');
create policy employee_cities_admin_write on public.employee_cities for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

create policy car_documents_staff_read on public.car_documents for select using (auth_role() in ('employee', 'admin'));
create policy car_documents_staff_write on public.car_documents for all using (auth_role() in ('employee', 'admin')) with check (auth_role() in ('employee', 'admin'));
create policy car_service_staff_read on public.car_service_logs for select using (auth_role() in ('employee', 'admin'));
create policy car_service_staff_write on public.car_service_logs for all using (auth_role() in ('employee', 'admin')) with check (auth_role() in ('employee', 'admin'));
create policy car_blocks_staff_read on public.car_blocks for select using (auth_role() in ('employee', 'admin'));
create policy car_blocks_staff_write on public.car_blocks for all using (auth_role() in ('employee', 'admin')) with check (auth_role() in ('employee', 'admin'));

create policy booking_history_owner_or_staff_read on public.booking_status_history for select using (auth_role() in ('employee', 'admin') or exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));
create policy booking_history_staff_write on public.booking_status_history for insert with check (auth_role() in ('employee', 'admin'));
create policy assignments_staff_read on public.booking_assignments for select using (employee_id = auth.uid() or auth_role() = 'admin');
create policy assignments_admin_write on public.booking_assignments for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy call_logs_staff_read on public.call_logs for select using (auth_role() in ('employee', 'admin'));
create policy call_logs_staff_write on public.call_logs for all using (auth_role() in ('employee', 'admin')) with check (auth_role() in ('employee', 'admin'));
create policy handover_owner_or_staff_read on public.handover_records for select using (auth_role() in ('employee', 'admin') or exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));
create policy handover_staff_write on public.handover_records for all using (auth_role() in ('employee', 'admin')) with check (auth_role() in ('employee', 'admin'));

create policy notifications_staff_read on public.notifications for select using (auth_role() in ('employee', 'admin'));
create policy notifications_admin_write on public.notifications for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy templates_admin_only on public.message_templates for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy site_media_public_read on public.site_media for select using (true);
create policy site_media_admin_write on public.site_media for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy site_settings_admin_write on public.site_settings for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy audit_logs_admin_read on public.audit_logs for select using (auth_role() = 'admin');

create or replace function public.create_booking(
  p_ref text,
  p_car_id int,
  p_pickup_place text,
  p_period tstzrange,
  p_driver_option text default 'self',
  p_addons jsonb default '[]',
  p_notes text default null
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
  v_booking public.bookings;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_period is null or lower(p_period) is null or upper(p_period) is null or lower(p_period) >= upper(p_period) then
    raise exception 'valid booking period required' using errcode = '22023';
  end if;
  if p_driver_option not in ('self', 'chauffeur') then
    raise exception 'invalid driver option' using errcode = '22023';
  end if;
  select * into v_car from public.cars where id = p_car_id and active;
  if not found then
    raise exception 'car is not bookable' using errcode = 'P0002';
  end if;
  v_days := ceil(extract(epoch from (upper(p_period) - lower(p_period))) / 86400);
  v_subtotal := v_car.price_per_day * v_days;
  if p_driver_option = 'chauffeur' then v_subtotal := v_subtotal + (1000 * v_days); end if;
  v_tax := round(v_subtotal * 0.18, 2);
  v_total := v_subtotal + v_tax;
  insert into public.bookings (ref, user_id, car_id, pickup_place, period, driver_option, addons, subtotal, tax, total, status, notes)
  values (p_ref, v_user_id, p_car_id, p_pickup_place, p_period, p_driver_option, coalesce(p_addons, '[]'), v_subtotal, v_tax, v_total, 'pending', p_notes)
  returning * into v_booking;
  return v_booking;
end;
$$;

revoke insert on public.bookings from anon, authenticated;
grant execute on function public.create_booking(text, int, text, tstzrange, text, jsonb, text) to anon, authenticated;

insert into storage.buckets (id, name, public) values
  ('site-media', 'site-media', true),
  ('car-photos', 'car-photos', true),
  ('car-documents', 'car-documents', false),
  ('kyc', 'kyc', false)
on conflict (id) do nothing;

create policy site_media_public_read on storage.objects for select using (bucket_id = 'site-media');
create policy site_media_admin_write on storage.objects for insert with check (bucket_id = 'site-media' and auth_role() = 'admin');
create policy site_media_admin_update on storage.objects for update using (bucket_id = 'site-media' and auth_role() = 'admin') with check (bucket_id = 'site-media' and auth_role() = 'admin');
create policy site_media_admin_delete on storage.objects for delete using (bucket_id = 'site-media' and auth_role() = 'admin');
create policy car_photos_public_read on storage.objects for select using (bucket_id = 'car-photos');
create policy car_photos_staff_write on storage.objects for insert with check (bucket_id = 'car-photos' and auth_role() in ('employee', 'admin'));
create policy car_photos_staff_update on storage.objects for update using (bucket_id = 'car-photos' and auth_role() in ('employee', 'admin')) with check (bucket_id = 'car-photos' and auth_role() in ('employee', 'admin'));
create policy car_photos_admin_delete on storage.objects for delete using (bucket_id = 'car-photos' and auth_role() = 'admin');
create policy private_documents_read on storage.objects for select using (bucket_id in ('car-documents', 'kyc') and auth_role() in ('employee', 'admin'));
create policy private_documents_user_insert on storage.objects for insert with check (bucket_id = 'kyc' and auth.uid()::text = (storage.foldername(name))[1]);
create policy private_documents_staff_write on storage.objects for insert with check (bucket_id in ('car-documents', 'kyc') and auth_role() in ('employee', 'admin'));
create policy private_documents_staff_update on storage.objects for update using (bucket_id in ('car-documents', 'kyc') and auth_role() in ('employee', 'admin')) with check (bucket_id in ('car-documents', 'kyc') and auth_role() in ('employee', 'admin'));
create policy private_documents_admin_delete on storage.objects for delete using (bucket_id in ('car-documents', 'kyc') and auth_role() = 'admin');
