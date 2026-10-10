-- BPB-app · inloggen met alleen e-mailadres en wachtwoord
--
-- De tweede inlogstap (tweestapsverificatie) is niet langer verplicht voor
-- begeleiders en beheerders. De controle blijft wel in de database zitten,
-- achter één instelling die standaard uit staat. Zo kan de tweede stap later
-- worden verplicht zonder de toegangsregels opnieuw te bouwen:
--
--   update private.app_settings set require_second_step = true;
--
-- De instelling staat in het schema "private". Gebruikers van de app kunnen
-- haar niet lezen of wijzigen; dat kan alleen via de SQL Editor van Supabase.

create table private.app_settings (
  id boolean primary key default true check (id),   -- precies één rij
  require_second_step boolean not null default false
);
insert into private.app_settings default values;
revoke all on private.app_settings from public, anon, authenticated;
-- Tweede slot: row level security aan, zonder regels. Niemand behalve de
-- eigenaar van de database kan de rij dan lezen of wijzigen. De functie
-- hieronder draait als eigenaar en kan de instelling dus wel lezen.
alter table private.app_settings enable row level security;

-- De rol van de ingelogde gebruiker, of niets als die er nu niet in mag:
--  * het account moet actief zijn (niet uitgenodigd, geblokkeerd of gesloten);
--  * alleen als de instelling aan staat: begeleiders en beheerders moeten de
--    tweede inlogstap hebben gedaan.
create or replace function private.app_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.status = 'active'
    and (
      p.role = 'client'
      or not (select s.require_second_step from private.app_settings s)
      or coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
    )
$$;
