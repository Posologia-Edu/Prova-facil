alter table public.classes add column if not exists is_active boolean not null default true;
create index if not exists idx_classes_is_active on public.classes (is_active);
grant select, insert, update, delete on public.classes to authenticated;
grant all on public.classes to service_role;