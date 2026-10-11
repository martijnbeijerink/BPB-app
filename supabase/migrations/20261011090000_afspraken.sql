-- BPB-app · afspraken
--
-- Een afspraak hoort bij één koppeling: één cliënt, één professional, één
-- discipline. Alleen die twee zien de afspraak. De professional (in de
-- database: coach) voegt een afspraak toe en kan die wijzigen of laten
-- vervallen, zolang de koppeling loopt. De beheerder ziet afspraken niet.

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  starts_at timestamptz not null,
  -- vrije tekst, zodat later ook een adres of een kamer kan
  place text not null default 'Op locatie' check (length(trim(place)) between 1 and 80),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);
create index appointments_assignment_idx on public.appointments (assignment_id, starts_at);

-- Rechten: eerst alles dicht, dan precies wat nodig is. Wijzigen kan alleen
-- het tijdstip en de plaats; een afspraak verhuist niet naar een andere koppeling.
revoke all on public.appointments from anon, authenticated;
grant select, insert, delete on public.appointments to authenticated;
grant update (starts_at, place) on public.appointments to authenticated;

alter table public.appointments enable row level security;

create policy appointments_select on public.appointments for select to authenticated
  using (private.is_member(assignment_id));
create policy appointments_insert on public.appointments for insert to authenticated
  with check (private.is_coach_of(assignment_id) and created_by = (select auth.uid()));
create policy appointments_update on public.appointments for update to authenticated
  using (private.is_coach_of(assignment_id))
  with check (private.is_coach_of(assignment_id));
create policy appointments_delete on public.appointments for delete to authenticated
  using (private.is_coach_of(assignment_id));

-- Live: een nieuwe of vervallen afspraak verschijnt direct bij de ander.
-- (In de lokale tests bestaat deze publicatie niet; dan slaat dit blok
-- zichzelf over.)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.appointments;
  end if;
end
$$;
