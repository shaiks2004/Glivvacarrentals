insert into public.cities (slug, name, state) values
  ('ranchi', 'Ranchi', 'Jharkhand'),
  ('bhubaneswar', 'Bhubaneswar', 'Odisha'),
  ('jamshedpur', 'Jamshedpur', 'Jharkhand'),
  ('dhanbad', 'Dhanbad', 'Jharkhand')
on conflict (slug) do update set name = excluded.name, state = excluded.state;

insert into public.cars (slug, name, category, seats, fuel, transmission, price_per_day, city_id)
select v.slug, v.name, v.category, v.seats, v.fuel, v.transmission, v.price_per_day, c.id
from (values
  ('swift', 'Maruti Swift', 'Hatchback', 5, 'Petrol', 'Manual', 1800.00, 'ranchi'),
  ('creta', 'Hyundai Creta', 'SUV', 5, 'Diesel', 'Automatic', 3800.00, 'ranchi'),
  ('xuv700', 'Mahindra XUV700', 'SUV', 7, 'Diesel', 'Automatic', 5200.00, 'bhubaneswar'),
  ('innova', 'Toyota Innova Crysta', 'MPV', 7, 'Diesel', 'Manual', 4800.00, 'jamshedpur')
) as v(slug, name, category, seats, fuel, transmission, price_per_day, city_slug)
join public.cities c on c.slug = v.city_slug
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  seats = excluded.seats,
  fuel = excluded.fuel,
  transmission = excluded.transmission,
  price_per_day = excluded.price_per_day,
  city_id = excluded.city_id;

insert into public.message_templates (key, channel, body) values
  ('booking_received', 'whatsapp', 'Hi {{name}}, we received booking {{ref}} for {{car}}. Our team will call you shortly.'),
  ('booking_received', 'email', 'We received booking {{ref}} for {{car}}. Our team will call you shortly.'),
  ('booking_confirmed', 'whatsapp', 'Your Glivva booking {{ref}} is confirmed for {{pickup_date}}.'),
  ('booking_rejected', 'whatsapp', 'We could not confirm booking {{ref}}. Please contact Glivva for help.')
on conflict (key, channel) do update set body = excluded.body, active = true;

insert into public.site_settings (key, value) values
  ('phone', to_jsonb('+91 92968 79793'::text)),
  ('whatsapp', to_jsonb('9296879793'::text)),
  ('hours', to_jsonb('Open daily, 7 am to 10 pm'::text)),
  ('gst_percent', to_jsonb(18)),
  ('sla_minutes', to_jsonb(15)),
  ('deposit_rules', to_jsonb('Confirmed by the team before pickup.'::text))
on conflict (key) do update set value = excluded.value;
