-- Glivva Phase 2a base schema.
-- Replaces the draft users table with auth-backed profiles.
create extension if not exists btree_gist;
create extension if not exists pgcrypto;

create table public.cities (
  id serial primary key,
  slug text unique not null,
  name text not null,
  state text
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone text unique,
  role text not null default 'user' check (role in ('user', 'employee', 'admin')),
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.cars (
  id serial primary key,
  slug text unique not null,
  name text not null,
  category text not null check (category in ('Hatchback', 'Sedan', 'SUV', 'MPV', 'Luxury')),
  seats int not null check (seats > 0),
  fuel text not null,
  transmission text not null,
  price_per_day numeric(10, 2) not null check (price_per_day > 0),
  city_id int references public.cities(id),
  reg_number text unique,
  photo_urls text[] not null default '{}',
  active boolean not null default true
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  user_id uuid references public.profiles(id),
  car_id int not null references public.cars(id),
  pickup_place text not null,
  period tstzrange not null,
  driver_option text not null default 'self' check (driver_option in ('self', 'chauffeur')),
  addons jsonb not null default '[]',
  subtotal numeric(10, 2) not null,
  tax numeric(10, 2) not null,
  total numeric(10, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'contacted', 'confirmed', 'active', 'completed', 'cancelled', 'rejected', 'no_answer')),
  notes text,
  created_at timestamptz not null default now(),
  constraint no_double_booking exclude using gist (
    car_id with =,
    period with &&
  ) where (status in ('pending', 'contacted', 'confirmed', 'active'))
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider text not null,
  provider_ref text,
  amount numeric(10, 2) not null check (amount >= 0),
  status text not null check (status in ('created', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('driving_licence', 'id_proof', 'selfie')),
  storage_path text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.offers (
  id serial primary key,
  code text unique not null,
  title text,
  description text,
  percent_off int check (percent_off between 0 and 100),
  active boolean not null default true,
  archived_at timestamptz
);

create table public.reviews (
  id serial primary key,
  booking_id uuid references public.bookings(id) on delete set null,
  rating int check (rating between 1 and 5),
  body text,
  approved boolean not null default false
);

create table public.contact_messages (
  id serial primary key,
  name text,
  email text,
  phone text,
  topic text,
  message text,
  created_at timestamptz not null default now()
);

create index bookings_user_id_idx on public.bookings (user_id);
create index bookings_car_id_idx on public.bookings (car_id);
create index bookings_status_created_idx on public.bookings (status, created_at desc);
create index cars_city_active_idx on public.cars (city_id, active);
create index documents_user_id_idx on public.documents (user_id);
