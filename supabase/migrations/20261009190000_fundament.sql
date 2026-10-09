-- BPB-app · fundament
-- Tabellen uit het datamodel en de toegangsregels per rij (row level security).
--
-- Kernidee: alles wat privé is hangt aan één "koppeling" (assignment):
-- één cliënt, één begeleider, één discipline. Persoonlijke onderdelen en
-- berichten horen bij een koppeling en zijn alleen zichtbaar voor die twee.
--
-- Namen in de database (Engels) en in de ontwerpen (Nederlands):
--   profiles        = gebruikers        assignments    = koppelingen
--   disciplines     = disciplines       library_items  = bibliotheekitems
--   personal_items  = persoonlijke items   messages    = berichten
--   attachments     = bijlagen          read_states    = leesstand
--   devices         = apparaten

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Soorten
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('client', 'coach', 'admin');
create type public.account_status as enum ('invited', 'active', 'blocked', 'closed');
create type public.library_theme as enum ('bewegen', 'brein', 'emoties', 'inzicht', 'ontspannen', 'voeding');
create type public.library_kind as enum ('video', 'document');
create type public.personal_kind as enum ('video', 'document', 'note', 'library');

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'client',
  status public.account_status not null default 'invited',
  -- einde van het traject; een jaar later vervalt de toegang (latere stap)
  trajectory_ended_on date,
  created_at timestamptz not null default now()
);

create table public.disciplines (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete restrict,
  discipline_id uuid not null references public.disciplines (id) on delete restrict,
  starts_on date not null default current_date,
  ends_on date,
  created_at timestamptz not null default now(),
  check (client_id <> coach_id),
  check (ends_on is null or ends_on >= starts_on)
);
-- per cliënt en discipline hooguit één lopende koppeling
create unique index assignments_one_open_per_discipline
  on public.assignments (client_id, discipline_id) where ends_on is null;
create index assignments_client_idx on public.assignments (client_id);
create index assignments_coach_idx on public.assignments (coach_id);

create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  theme public.library_theme not null,
  kind public.library_kind not null,
  storage_path text,   -- document in de bestandsopslag
  video_id text,       -- filmpje bij de videodienst
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.personal_items (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  kind public.personal_kind not null,
  title text,
  body text,           -- tekst van een notitie
  storage_path text,
  video_id text,
  library_item_id uuid references public.library_items (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  check (
    (kind = 'note' and body is not null and length(trim(body)) > 0)
    or (kind = 'library' and library_item_id is not null)
    or (kind in ('video', 'document') and title is not null and length(trim(title)) > 0)
  )
);
create index personal_items_assignment_idx on public.personal_items (assignment_id, created_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete restrict,
  body text not null default '' check (length(body) <= 4000),
  created_at timestamptz not null default now()
);
create index messages_assignment_idx on public.messages (assignment_id, created_at);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_at timestamptz not null default now()
);
create index attachments_message_idx on public.attachments (message_id);

-- Tot waar een gebruiker gelezen heeft. Alleen voor de gebruiker zelf:
-- de begeleider ziet niet of een cliënt een bericht heeft gelezen.
create table public.read_states (
  user_id uuid not null references public.profiles (id) on delete cascade,
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  messages_read_at timestamptz,
  items_seen_at timestamptz,
  primary key (user_id, assignment_id)
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  push_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now()
);
create index devices_user_idx on public.devices (user_id);

-- ---------------------------------------------------------------------------
-- Hulpfuncties voor de toegangsregels
-- Ze staan in het schema "private", dat niet via de API bereikbaar is.
-- ---------------------------------------------------------------------------

-- De rol van de ingelogde gebruiker, of niets als die er nu niet in mag:
--  * het account moet actief zijn (niet uitgenodigd, geblokkeerd of gesloten);
--  * begeleiders en beheerders moeten de tweede inlogstap hebben gedaan.
create function private.app_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.status = 'active'
    and (p.role = 'client' or coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2')
$$;

-- Hoort de ingelogde gebruiker bij deze koppeling (als cliënt of begeleider)?
create function private.is_member(a_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.app_role() in ('client', 'coach'), false)
    and exists (
      select 1 from public.assignments a
      where a.id = a_id and (select auth.uid()) in (a.client_id, a.coach_id)
    )
$$;

-- Mag de ingelogde gebruiker nog schrijven in deze koppeling (niet beëindigd)?
create function private.can_post(a_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.app_role() in ('client', 'coach'), false)
    and exists (
      select 1 from public.assignments a
      where a.id = a_id
        and (select auth.uid()) in (a.client_id, a.coach_id)
        and (a.ends_on is null or a.ends_on >= current_date)
    )
$$;

-- Is de ingelogde gebruiker de begeleider van deze lopende koppeling?
create function private.is_coach_of(a_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.app_role() = 'coach', false)
    and exists (
      select 1 from public.assignments a
      where a.id = a_id
        and a.coach_id = (select auth.uid())
        and (a.ends_on is null or a.ends_on >= current_date)
    )
$$;

-- Delen de ingelogde gebruiker en een ander een koppeling?
create function private.shares_assignment(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.app_role() in ('client', 'coach'), false)
    and exists (
      select 1 from public.assignments a
      where (a.client_id = (select auth.uid()) and a.coach_id = other)
         or (a.coach_id = (select auth.uid()) and a.client_id = other)
    )
$$;

-- Hoort de ingelogde gebruiker bij de koppeling van dit bericht?
create function private.is_member_of_message(m_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.messages m
    where m.id = m_id and private.is_member(m.assignment_id)
  )
$$;

-- Is dit een eigen bericht in een lopende koppeling?
create function private.is_own_message(m_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.messages m
    where m.id = m_id
      and m.sender_id = (select auth.uid())
      and private.can_post(m.assignment_id)
  )
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Elk nieuw inlogaccount krijgt een profiel: cliënt, nog niet actief.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Een koppeling verbindt altijd een cliënt met een begeleider.
create function private.check_assignment_roles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select p.role from public.profiles p where p.id = new.client_id) is distinct from 'client' then
    raise exception 'De cliënt van een koppeling moet de rol cliënt hebben' using errcode = '23514';
  end if;
  if (select p.role from public.profiles p where p.id = new.coach_id) is distinct from 'coach' then
    raise exception 'De begeleider van een koppeling moet de rol begeleider hebben' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger assignments_check_roles
  before insert or update on public.assignments
  for each row execute function private.check_assignment_roles();

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end
$$;
create trigger library_items_touch
  before update on public.library_items
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Beheerfunctie: rol en status van een account wijzigen.
-- De beheerder doet dit via deze functie en niet rechtstreeks in de tabel,
-- zodat niemand de eigen rol of status kan aanpassen.
-- ---------------------------------------------------------------------------
create function public.admin_update_profile(
  target uuid,
  new_role public.user_role,
  new_status public.account_status,
  new_trajectory_ended_on date default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if private.app_role() is distinct from 'admin' then
    raise exception 'Alleen de beheerder mag accounts wijzigen' using errcode = '42501';
  end if;
  if target = (select auth.uid()) then
    raise exception 'De beheerder kan het eigen account niet wijzigen' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.assignments a
    where (a.client_id = target and new_role <> 'client')
       or (a.coach_id = target and new_role <> 'coach')
  ) then
    raise exception 'Deze gebruiker heeft nog koppelingen in de huidige rol' using errcode = '23514';
  end if;
  update public.profiles
  set role = new_role, status = new_status, trajectory_ended_on = new_trajectory_ended_on
  where id = target;
  if not found then
    raise exception 'Gebruiker niet gevonden' using errcode = 'P0002';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Rechten: eerst alles dicht, dan per tabel precies wat nodig is.
-- Niet-ingelogde bezoekers (anon) krijgen niets.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;
grant execute on function public.admin_update_profile(uuid, public.user_role, public.account_status, date) to authenticated;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.disciplines to authenticated;
grant select, insert, update, delete on public.assignments to authenticated;
grant select, insert, update, delete on public.library_items to authenticated;
grant select, insert, update, delete on public.personal_items to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert on public.attachments to authenticated;
grant select, insert, update, delete on public.read_states to authenticated;
grant select, insert, update, delete on public.devices to authenticated;

alter table public.profiles enable row level security;
alter table public.disciplines enable row level security;
alter table public.assignments enable row level security;
alter table public.library_items enable row level security;
alter table public.personal_items enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;
alter table public.read_states enable row level security;
alter table public.devices enable row level security;

-- ---------------------------------------------------------------------------
-- Toegangsregels
-- ---------------------------------------------------------------------------

-- Profielen: jezelf, de mensen met wie je een koppeling deelt, en de
-- beheerder ziet iedereen. Een cliënt ziet dus nooit een andere cliënt.
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or private.app_role() = 'admin'
    or private.shares_assignment(id)
  );
-- Alleen de eigen naam is aanpasbaar (zie de kolomrechten hierboven).
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()) and private.app_role() is not null)
  with check (id = (select auth.uid()));

-- Disciplines: iedereen met toegang leest, de beheerder beheert.
create policy disciplines_select on public.disciplines for select to authenticated
  using (private.app_role() is not null);
create policy disciplines_insert on public.disciplines for insert to authenticated
  with check (private.app_role() = 'admin');
create policy disciplines_update on public.disciplines for update to authenticated
  using (private.app_role() = 'admin') with check (private.app_role() = 'admin');
create policy disciplines_delete on public.disciplines for delete to authenticated
  using (private.app_role() = 'admin');

-- Koppelingen: de beheerder beheert; cliënt en begeleider zien de eigen.
create policy assignments_select on public.assignments for select to authenticated
  using (
    private.app_role() = 'admin'
    or (private.app_role() is not null and (select auth.uid()) in (client_id, coach_id))
  );
create policy assignments_insert on public.assignments for insert to authenticated
  with check (private.app_role() = 'admin');
create policy assignments_update on public.assignments for update to authenticated
  using (private.app_role() = 'admin') with check (private.app_role() = 'admin');
create policy assignments_delete on public.assignments for delete to authenticated
  using (private.app_role() = 'admin');

-- Gedeelde bibliotheek: iedereen met toegang leest; begeleiders en de
-- beheerder beheren.
create policy library_select on public.library_items for select to authenticated
  using (private.app_role() is not null);
create policy library_insert on public.library_items for insert to authenticated
  with check (private.app_role() in ('coach', 'admin') and created_by = (select auth.uid()));
create policy library_update on public.library_items for update to authenticated
  using (private.app_role() in ('coach', 'admin'))
  with check (private.app_role() in ('coach', 'admin'));
create policy library_delete on public.library_items for delete to authenticated
  using (private.app_role() in ('coach', 'admin'));

-- Persoonlijke onderdelen: alleen de cliënt en de begeleider van die
-- koppeling. De beheerder ziet ze niet. Alleen de begeleider plaatst.
create policy personal_select on public.personal_items for select to authenticated
  using (private.is_member(assignment_id));
create policy personal_insert on public.personal_items for insert to authenticated
  with check (private.is_coach_of(assignment_id) and created_by = (select auth.uid()));
create policy personal_update on public.personal_items for update to authenticated
  using (private.is_coach_of(assignment_id))
  with check (private.is_coach_of(assignment_id));
create policy personal_delete on public.personal_items for delete to authenticated
  using (private.is_coach_of(assignment_id));

-- Berichten: alleen de twee deelnemers van de koppeling. Versturen kan
-- alleen onder eigen naam en zolang de koppeling loopt. Wijzigen en
-- verwijderen kan niet (geen rechten uitgedeeld).
create policy messages_select on public.messages for select to authenticated
  using (private.is_member(assignment_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (private.can_post(assignment_id) and sender_id = (select auth.uid()));

-- Bijlagen volgen het bericht waar ze bij horen.
create policy attachments_select on public.attachments for select to authenticated
  using (private.is_member_of_message(message_id));
create policy attachments_insert on public.attachments for insert to authenticated
  with check (private.is_own_message(message_id));

-- Leesstand en apparaten: alleen van jezelf.
create policy read_states_all on public.read_states for all to authenticated
  using (user_id = (select auth.uid()) and private.is_member(assignment_id))
  with check (user_id = (select auth.uid()) and private.is_member(assignment_id));
create policy devices_all on public.devices for all to authenticated
  using (user_id = (select auth.uid()) and private.app_role() is not null)
  with check (user_id = (select auth.uid()) and private.app_role() is not null);
