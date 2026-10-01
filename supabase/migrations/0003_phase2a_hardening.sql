-- Phase 2a Hardening: strict profile privilege protection, audit log immutability, and security invariants.

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth_role() <> 'admin' then
    new.role := old.role;
    new.active := old.active;
    new.created_by := old.created_by;
    new.must_change_password := old.must_change_password;
  end if;
  return new;
end;
$$;

-- Immutability on audit_logs: prevent update and delete operations
create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'audit_logs cannot be modified or deleted' using errcode = '42501';
end;
$$;

drop trigger if exists prevent_audit_log_mutation on public.audit_logs;
create trigger prevent_audit_log_mutation
before update or delete on public.audit_logs
for each row execute function public.prevent_audit_log_mutation();
