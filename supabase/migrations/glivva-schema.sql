-- Glivva Car Rentals: PostgreSQL schema (works on Supabase, Neon, Railway, RDS)
create extension if not exists btree_gist;   -- needed for the no-double-booking rule
create extension if not exists pgcrypto;     -- gen_random_uuid()

create table cities (
  id          serial primary key,
  slug        text unique not null,
  name        text not null,
  state       text
);

create table users (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text unique,
  phone       text unique,
  role        text not null default 'customer' check (role in ('customer','staff','admin')),
  created_at  timestamptz not null default now()
);

create table cars (
  id            serial primary key,
  slug          text unique not null,
  name          text not null,
  category      text not null check (category in ('Hatchback','Sedan','SUV','MPV','Luxury')),
  seats         int  not null,
  fuel          text not null,
  transmission  text not null,
  price_per_day numeric(10,2) not null check (price_per_day > 0),
  city_id       int references cities(id),
  reg_number    text unique,
  photo_urls    text[] not null default '{}',
  active        boolean not null default true
);

create table bookings (
  id            uuid primary key default gen_random_uuid(),
  ref           text unique not null,                      -- e.g. GLV-AB12C
  user_id       uuid references users(id),
  car_id        int  not null references cars(id),
  pickup_place  text not null,
  period        tstzrange not null,                        -- [pickup, return)
  driver_option text not null default 'self' check (driver_option in ('self','chauffeur')),
  addons        jsonb not null default '[]',
  subtotal      numeric(10,2) not null,
  tax           numeric(10,2) not null,
  total         numeric(10,2) not null,
  status        text not null default 'pending'
                check (status in ('pending','confirmed','active','completed','cancelled')),
  notes         text,
  created_at    timestamptz not null default now(),
  -- the database itself refuses overlapping bookings for the same car
  constraint no_double_booking
    exclude using gist (car_id with =, period with &&) where (status in ('pending','confirmed','active'))
);

create table payments (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references bookings(id),
  provider     text not null,                  -- e.g. razorpay
  provider_ref text,
  amount       numeric(10,2) not null,
  status       text not null check (status in ('created','paid','failed','refunded')),
  created_at   timestamptz not null default now()
);

-- KYC files live in private object storage; only the path is stored here
create table documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id),
  kind         text not null check (kind in ('driving_licence','id_proof','selfie')),
  storage_path text not null,
  verified     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table offers  (id serial primary key, code text unique not null, title text, description text, percent_off int, active boolean default true);
create table reviews (id serial primary key, booking_id uuid references bookings(id), rating int check (rating between 1 and 5), body text, approved boolean default false);
create table contact_messages (id serial primary key, name text, email text, phone text, topic text, message text, created_at timestamptz default now());

create index on bookings (user_id);
create index on bookings (car_id);
create index on cars (city_id, active);
