-- VIGO AI CAMPUS: esquema inicial de referencia.
-- Revisar y adaptar antes de producción. Las políticas RLS requieren pruebas exhaustivas.
create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'demo' check (status in ('demo','active','suspended')),
  default_locale text not null default 'es',
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('org_admin','operator','user')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  slug text not null,
  name text not null,
  description text not null default '',
  instructions text not null default '',
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  source_url text,
  locale text not null default 'es',
  status text not null default 'pending' check (status in ('pending','approved','stale','disabled','failed')),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid references public.knowledge_sources(id) on delete set null,
  title text not null,
  storage_path text,
  version_label text,
  status text not null default 'pending' check (status in ('pending','indexed','stale','failed','disabled')),
  created_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  title text not null default 'Nueva conversación',
  locale text not null default 'es',
  mode text not null default 'demo' check (mode in ('demo','authenticated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  agent_slug text,
  created_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  category text not null default 'general',
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  rating smallint check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  provider text,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost numeric(12,6),
  event_type text not null default 'chat',
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists memberships_user_idx on public.memberships(user_id);
create index if not exists memberships_org_idx on public.memberships(organization_id);
create index if not exists conversations_user_org_idx on public.conversations(user_id, organization_id, updated_at desc);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);
create index if not exists chunks_org_document_idx on public.document_chunks(organization_id, document_id);
create index if not exists tickets_org_status_idx on public.tickets(organization_id, status);
create index if not exists usage_org_created_idx on public.usage_events(organization_id, created_at desc);

-- RLS enabled on all tenant-facing tables.
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.agents enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.tickets enable row level security;
alter table public.feedback enable row level security;
alter table public.usage_events enable row level security;
alter table public.audit_events enable row level security;

-- Helper: user belongs to an organization. SECURITY DEFINER with fixed search_path.
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = target_org and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role = 'org_admin'
  );
$$;

-- Organizations: members may read their organization; only admins can change it.
create policy "org members can read organization"
on public.organizations for select
using (public.is_org_member(id));

create policy "org admins can update organization"
on public.organizations for update
using (public.is_org_admin(id))
with check (public.is_org_admin(id));

-- Memberships: members can read memberships within their org; org admins manage them.
create policy "members can read org memberships"
on public.memberships for select
using (public.is_org_member(organization_id));

create policy "org admins insert memberships"
on public.memberships for insert
with check (public.is_org_admin(organization_id));

create policy "org admins update memberships"
on public.memberships for update
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

create policy "org admins delete memberships"
on public.memberships for delete
using (public.is_org_admin(organization_id));

-- Agents: organization members can read enabled agents; admins manage their org agents.
create policy "members read enabled agents"
on public.agents for select
using ((organization_id is not null and public.is_org_member(organization_id) and enabled) or organization_id is null);

create policy "admins manage agents"
on public.agents for all
using (organization_id is not null and public.is_org_admin(organization_id))
with check (organization_id is not null and public.is_org_admin(organization_id));

-- Sources and documents: members read approved/indexed material; admins manage.
create policy "members read approved sources"
on public.knowledge_sources for select
using (public.is_org_member(organization_id) and status = 'approved');

create policy "admins manage sources"
on public.knowledge_sources for all
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

create policy "members read indexed documents"
on public.documents for select
using (public.is_org_member(organization_id) and status = 'indexed');

create policy "admins manage documents"
on public.documents for all
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

create policy "members read chunks for org"
on public.document_chunks for select
using (public.is_org_member(organization_id));

create policy "admins manage chunks"
on public.document_chunks for all
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

-- Conversations: users can access their own; org admins/operators may access org conversations only if the application authorizes support access.
create policy "users read own conversations"
on public.conversations for select
using (user_id = auth.uid() and public.is_org_member(organization_id));

create policy "users create own conversations"
on public.conversations for insert
with check (user_id = auth.uid() and public.is_org_member(organization_id));

create policy "users update own conversations"
on public.conversations for update
using (user_id = auth.uid() and public.is_org_member(organization_id))
with check (user_id = auth.uid() and public.is_org_member(organization_id));

create policy "users read messages in own conversations"
on public.messages for select
using (exists (
  select 1 from public.conversations c
  where c.id = conversation_id and c.user_id = auth.uid()
    and c.organization_id = messages.organization_id
));

create policy "users create messages in own conversations"
on public.messages for insert
with check (exists (
  select 1 from public.conversations c
  where c.id = conversation_id and c.user_id = auth.uid()
    and c.organization_id = messages.organization_id
));

create policy "users read own tickets"
on public.tickets for select
using (created_by = auth.uid() and public.is_org_member(organization_id));

create policy "users create own tickets"
on public.tickets for insert
with check (created_by = auth.uid() and public.is_org_member(organization_id));

create policy "users read own feedback"
on public.feedback for select
using (user_id = auth.uid() and public.is_org_member(organization_id));

create policy "users create own feedback"
on public.feedback for insert
with check (user_id = auth.uid() and public.is_org_member(organization_id));

create policy "users read own usage"
on public.usage_events for select
using (user_id = auth.uid() and public.is_org_member(organization_id));

-- Audit and usage writes should normally be server-side using a restricted backend role.
-- This starter schema intentionally omits broad client write policies for audit/usage.
-- Review SECURITY DEFINER functions, grants and all policies before production.
