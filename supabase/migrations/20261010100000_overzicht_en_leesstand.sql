-- BPB-app · overzicht per koppeling en leesstand
--
-- Twee functies voor de schermen Voor mij, Cliënten en Berichten, en het
-- live binnenkomen van berichten.
--
-- Beide functies draaien met de rechten van de ingelogde gebruiker
-- (security invoker). De toegangsregels per rij blijven dus gewoon gelden:
-- niemand krijgt via deze functies iets te zien wat hij anders niet zou zien.

-- De koppelingen van de ingelogde gebruiker, met wat er nieuw is.
--   new_items        = persoonlijke onderdelen van de ander sinds het laatste bezoek
--   unread_messages  = berichten van de ander sinds het laatste lezen
create function public.my_assignments()
returns table (
  assignment_id uuid,
  discipline text,
  client_id uuid,
  client_name text,
  coach_id uuid,
  coach_name text,
  ended boolean,
  new_items integer,
  unread_messages integer,
  last_item_at timestamptz,
  last_message_body text,
  last_message_at timestamptz,
  last_message_mine boolean
)
language sql stable security invoker set search_path = '' as $$
  select
    a.id,
    d.name,
    a.client_id,
    c.full_name,
    a.coach_id,
    k.full_name,
    (a.ends_on is not null and a.ends_on < current_date),
    (select count(*)::integer from public.personal_items i
      where i.assignment_id = a.id
        and i.created_by <> (select auth.uid())
        and i.created_at > coalesce(r.items_seen_at, '-infinity'::timestamptz)),
    (select count(*)::integer from public.messages m
      where m.assignment_id = a.id
        and m.sender_id <> (select auth.uid())
        and m.created_at > coalesce(r.messages_read_at, '-infinity'::timestamptz)),
    (select max(i.created_at) from public.personal_items i where i.assignment_id = a.id),
    lm.body,
    lm.created_at,
    lm.sender_id = (select auth.uid())
  from public.assignments a
  join public.disciplines d on d.id = a.discipline_id
  join public.profiles c on c.id = a.client_id
  join public.profiles k on k.id = a.coach_id
  left join public.read_states r on r.assignment_id = a.id and r.user_id = (select auth.uid())
  left join lateral (
    select m.body, m.created_at, m.sender_id
    from public.messages m
    where m.assignment_id = a.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where (select auth.uid()) in (a.client_id, a.coach_id)
  order by d.name, c.full_name, a.created_at
$$;

-- Leesstand bijwerken met de tijd van de server: berichten gelezen en/of
-- persoonlijke onderdelen gezien. Alleen voor de eigen koppelingen; de
-- toegangsregel op read_states weigert de rest.
create function public.mark_read(a_id uuid, mark_messages boolean default false, mark_items boolean default false)
returns void
language sql security invoker set search_path = '' as $$
  insert into public.read_states (user_id, assignment_id, messages_read_at, items_seen_at)
  values (
    (select auth.uid()),
    a_id,
    case when mark_messages then now() end,
    case when mark_items then now() end
  )
  on conflict (user_id, assignment_id) do update set
    messages_read_at = case when mark_messages then now() else public.read_states.messages_read_at end,
    items_seen_at = case when mark_items then now() else public.read_states.items_seen_at end
$$;

revoke all on function public.my_assignments() from public, anon;
revoke all on function public.mark_read(uuid, boolean, boolean) from public, anon;
grant execute on function public.my_assignments() to authenticated;
grant execute on function public.mark_read(uuid, boolean, boolean) to authenticated;

-- Live binnenkomen van berichten en persoonlijke onderdelen. Supabase stuurt
-- een wijziging alleen door naar wie de rij volgens de toegangsregels mag
-- zien. (In de lokale tests bestaat deze publicatie niet; dan slaat dit
-- blok zichzelf over.)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
    alter publication supabase_realtime add table public.personal_items;
  end if;
end
$$;
