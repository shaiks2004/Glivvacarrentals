-- Phase 6: Enhanced v_dashboard_kpis aggregation and admin review management

drop view if exists public.v_dashboard_kpis;
create view public.v_dashboard_kpis
with (security_invoker = true)
as
select
  count(b.id) filter (where b.status = 'pending')::bigint as pending_bookings,
  count(b.id) filter (where b.status = 'confirmed')::bigint as confirmed_bookings,
  count(b.id) filter (where b.status = 'active')::bigint as active_bookings,
  coalesce(sum(b.total) filter (where b.status in ('confirmed', 'active', 'completed')), 0)::numeric(10, 2) as booked_value
from (select auth_role() as role) actor
left join public.bookings b on true
where actor.role in ('employee', 'admin')
group by actor.role;

-- Ensure admin has full management over reviews (delete/approve/edit)
drop policy if exists reviews_admin_write on public.reviews;
create policy reviews_admin_all on public.reviews
  for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
