-- VIGO AI CAMPUS · Migración 0002
-- Roles de producto, lectura de soporte y auditoría.
--
-- Aplicar con Supabase CLI:
--   supabase db push
-- o pegando este archivo en el SQL Editor del proyecto.
--
-- Nota: la aplicación funciona sin esta migración (mapea org_admin→admin,
-- operator→PAS y user→estudiante), pero aplicarla habilita los roles
-- estudiante/PAS/PDI/admin de forma nativa y las políticas de soporte.

-- 1. Ampliar el CHECK de roles sin romper los valores existentes.
alter table public.memberships drop constraint if exists memberships_role_check;
alter table public.memberships
  add constraint memberships_role_check
  check (role in ('org_admin', 'operator', 'user', 'estudiante', 'pas', 'pdi', 'admin'));

-- 2. Helper: pertenece a la organización con alguno de los roles indicados.
create or replace function public.has_org_role(target_org uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role = any(allowed_roles)
  );
$$;

grant execute on function public.has_org_role(uuid, text[]) to authenticated;

-- 3. Soporte: PAS y administración pueden leer conversaciones de su organización.
drop policy if exists "support reads org conversations" on public.conversations;
create policy "support reads org conversations"
on public.conversations for select
using (public.has_org_role(organization_id, array['operator','pas','org_admin','admin']));

drop policy if exists "support reads org messages" on public.messages;
create policy "support reads org messages"
on public.messages for select
using (public.has_org_role(organization_id, array['operator','pas','org_admin','admin']));

drop policy if exists "support reads org tickets" on public.tickets;
create policy "support reads org tickets"
on public.tickets for select
using (public.has_org_role(organization_id, array['operator','pas','org_admin','admin']));

drop policy if exists "support updates org tickets" on public.tickets;
create policy "support updates org tickets"
on public.tickets for update
using (public.has_org_role(organization_id, array['operator','pas','org_admin','admin']))
with check (public.has_org_role(organization_id, array['operator','pas','org_admin','admin']));

drop policy if exists "support reads org feedback" on public.feedback;
create policy "support reads org feedback"
on public.feedback for select
using (public.has_org_role(organization_id, array['operator','pas','org_admin','admin']));

drop policy if exists "admins read org usage" on public.usage_events;
create policy "admins read org usage"
on public.usage_events for select
using (public.has_org_role(organization_id, array['org_admin','admin']));

drop policy if exists "admins read org audit" on public.audit_events;
create policy "admins read org audit"
on public.audit_events for select
using (organization_id is not null and public.has_org_role(organization_id, array['org_admin','admin']));

-- 4. Los administradores pueden cambiar roles dentro de su organización.
drop policy if exists "org admins update memberships" on public.memberships;
create policy "org admins update memberships"
on public.memberships for update
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

-- 5. Vista de compatibilidad solicitada en el plan (audit_logs).
create or replace view public.audit_logs
with (security_invoker = true)
as select * from public.audit_events;

comment on view public.audit_logs is 'Alias de compatibilidad sobre audit_events; respeta RLS.';

-- 6. Índice para métricas persistentes.
create index if not exists audit_events_action_created_idx
  on public.audit_events(action, created_at desc);

-- 7. Comprobación rápida (ejecutar manualmente):
-- select role, count(*) from public.memberships group by role;
-- select action, count(*) from public.audit_events group by action;
