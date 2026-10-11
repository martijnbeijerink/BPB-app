-- BPB-app · demo-gegevens laden
--
-- Zet de voorbeeldgegevens uit de klikbare demo in de database, zodat de app
-- op de telefoon hetzelfde laat zien: de bibliotheek, de cliënten van
-- Marjolijn, de disciplines van Anouk, gedeelde onderdelen, berichten en
-- afspraken.
--
-- Voer eerst alle bestanden uit supabase/migrations/ uit, ook die van de
-- afspraken.
--
-- Uitvoeren: plak dit hele bestand in de SQL Editor van Supabase en kies Run.
-- Supabase waarschuwt dat er iets wordt verwijderd; dat klopt, zie hieronder.
--
-- Wat je vooraf nodig hebt: twee accounts waarmee je kunt inloggen, één
-- actieve cliënt en één actieve professional. Dat zijn de testaccounts uit de
-- README. Zij worden Anouk en Marjolijn.
--
-- Wat het doet:
--   1. Het verwijdert de koppelingen van die twee accounts, met alles wat
--      eraan hangt (gedeelde onderdelen, berichten, afspraken), en de bibliotheekitems
--      die zij hebben geplaatst.
--   2. Het maakt vijf extra personen aan die alleen als naam bestaan: de
--      professionals Joost en Sanne en de cliënten Bram, Fatima en Pieter.
--      Met deze accounts kan niemand inloggen.
--   3. Het zet de voorbeeldgegevens erin.
--
-- Opnieuw uitvoeren mag: dan staat alles weer in de beginstand.
-- Gaat er iets mis, dan verandert er niets.
--
-- Niet voor een database met echte cliënten.

do $$
declare
  -- Laat deze twee leeg als je precies één actieve cliënt en één actieve
  -- professional hebt. Vul anders hier hun e-mailadressen in.
  client_email text := '';
  coach_email text := '';

  demo_domain constant text := '@demo.bpb-app.invalid';
  found uuid[];
  everyone uuid[];
  anouk uuid; marjolijn uuid; joost uuid; sanne uuid; bram uuid; fatima uuid; pieter uuid;
  d_ontspannen uuid; d_bewegen uuid; d_voeding uuid;
  l_anouk uuid; l_bram uuid; l_fatima uuid; l_pieter uuid; l_bewegen uuid; l_voeding uuid;
  b_adem uuid; b_brein uuid; b_werkblad uuid; b_wandel uuid;
  today timestamptz := date_trunc('day', now());
begin
  if to_regclass('public.appointments') is null then
    raise exception 'De tabel voor afspraken ontbreekt. Voer eerst supabase/migrations/20261011090000_afspraken.sql uit.';
  end if;

  -- 1. De twee accounts waarmee je inlogt ----------------------------------
  if trim(client_email) <> '' then
    select array_agg(u.id) into found from auth.users u where lower(u.email) = lower(trim(client_email));
  else
    select array_agg(u.id) into found from auth.users u join public.profiles p on p.id = u.id
    where p.role = 'client' and p.status = 'active' and u.email not like '%' || demo_domain;
  end if;
  if coalesce(cardinality(found), 0) <> 1 then
    raise exception 'Cliënt niet gevonden: er moet precies één actieve cliënt zijn. Vul anders bovenaan client_email in. Gevonden: %', coalesce(cardinality(found), 0);
  end if;
  anouk := found[1];

  if trim(coach_email) <> '' then
    select array_agg(u.id) into found from auth.users u where lower(u.email) = lower(trim(coach_email));
  else
    select array_agg(u.id) into found from auth.users u join public.profiles p on p.id = u.id
    where p.role = 'coach' and p.status = 'active' and u.email not like '%' || demo_domain;
  end if;
  if coalesce(cardinality(found), 0) <> 1 then
    raise exception 'Professional niet gevonden: er moet precies één actieve professional zijn. Vul anders bovenaan coach_email in. Gevonden: %', coalesce(cardinality(found), 0);
  end if;
  marjolijn := found[1];

  if (select role from public.profiles where id = anouk) is distinct from 'client' then
    raise exception 'Het account bij client_email heeft niet de rol cliënt.';
  end if;
  if (select role from public.profiles where id = marjolijn) is distinct from 'coach' then
    raise exception 'Het account bij coach_email heeft niet de rol professional (coach).';
  end if;
  update public.profiles set full_name = 'Anouk V.', status = 'active' where id = anouk;
  update public.profiles set full_name = 'Marjolijn', status = 'active' where id = marjolijn;

  -- 2. Opruimen: eerdere demo-gegevens en de oude testgegevens --------------
  select array[anouk, marjolijn] || coalesce(array_agg(u.id), '{}') into everyone
  from auth.users u where u.email like '%' || demo_domain;
  delete from public.assignments where client_id = any (everyone) or coach_id = any (everyone);
  delete from public.library_items where created_by = any (everyone);
  delete from auth.users where email like '%' || demo_domain;

  -- 3. Personen die alleen als naam bestaan ---------------------------------
  -- Zonder wachtwoord en zonder inlogmethode: met deze accounts kan niemand inloggen.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    v.key || demo_domain, '', now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb, jsonb_build_object('full_name', v.full_name), now(), now(),
    '', '', '', ''
  from (values
    ('joost', 'Joost'), ('sanne', 'Sanne'),
    ('bram', 'Bram J.'), ('fatima', 'Fatima E.'), ('pieter', 'Pieter K.')
  ) as v (key, full_name);

  select id into joost from auth.users where email = 'joost' || demo_domain;
  select id into sanne from auth.users where email = 'sanne' || demo_domain;
  select id into bram from auth.users where email = 'bram' || demo_domain;
  select id into fatima from auth.users where email = 'fatima' || demo_domain;
  select id into pieter from auth.users where email = 'pieter' || demo_domain;
  update public.profiles set role = 'coach', status = 'active' where id in (joost, sanne);
  update public.profiles set role = 'client', status = 'active' where id in (bram, fatima, pieter);

  -- 4. Disciplines ----------------------------------------------------------
  select id into d_ontspannen from public.disciplines where lower(name) = 'ontspannen' limit 1;
  if d_ontspannen is null then insert into public.disciplines (name) values ('ontspannen') returning id into d_ontspannen; end if;
  select id into d_bewegen from public.disciplines where lower(name) = 'bewegen' limit 1;
  if d_bewegen is null then insert into public.disciplines (name) values ('bewegen') returning id into d_bewegen; end if;
  select id into d_voeding from public.disciplines where lower(name) = 'voeding' limit 1;
  if d_voeding is null then insert into public.disciplines (name) values ('voeding') returning id into d_voeding; end if;

  -- 5. Bibliotheek ----------------------------------------------------------
  insert into public.library_items (title, description, theme, kind, created_by, created_at)
  values ('Ademhalingsoefening voor rustmomenten', 'Een korte oefening om tussendoor tot rust te komen.', 'ontspannen', 'video', marjolijn, today - interval '20 days')
  returning id into b_adem;
  insert into public.library_items (title, description, theme, kind, created_by, created_at)
  values ('Wat doet stress met je brein?', 'Uitleg over wat langdurige stress in je hoofd doet.', 'brein', 'video', marjolijn, today - interval '21 days')
  returning id into b_brein;
  insert into public.library_items (title, description, theme, kind, created_by, created_at)
  values ('Werkblad: energiegevers en energievreters', 'Breng in kaart wat je energie geeft en wat je energie kost.', 'inzicht', 'document', marjolijn, today - interval '22 days')
  returning id into b_werkblad;
  insert into public.library_items (title, description, theme, kind, created_by, created_at)
  values ('Wandelschema voor de eerste weken', 'Rustig opbouwen met korte wandelingen.', 'bewegen', 'document', joost, today - interval '23 days')
  returning id into b_wandel;

  -- 6. Koppelingen: één cliënt, één professional, één discipline -------------
  insert into public.assignments (client_id, coach_id, discipline_id, starts_on) values (anouk, marjolijn, d_ontspannen, current_date - 30) returning id into l_anouk;
  insert into public.assignments (client_id, coach_id, discipline_id, starts_on) values (bram, marjolijn, d_ontspannen, current_date - 30) returning id into l_bram;
  insert into public.assignments (client_id, coach_id, discipline_id, starts_on) values (fatima, marjolijn, d_ontspannen, current_date - 30) returning id into l_fatima;
  insert into public.assignments (client_id, coach_id, discipline_id, starts_on) values (pieter, marjolijn, d_ontspannen, current_date - 30) returning id into l_pieter;
  insert into public.assignments (client_id, coach_id, discipline_id, starts_on) values (anouk, joost, d_bewegen, current_date - 30) returning id into l_bewegen;
  insert into public.assignments (client_id, coach_id, discipline_id, starts_on) values (anouk, sanne, d_voeding, current_date - 30) returning id into l_voeding;

  -- 7. Persoonlijke onderdelen ----------------------------------------------
  insert into public.personal_items (assignment_id, kind, title, body, library_item_id, created_by, created_at) values
    (l_anouk, 'note', null, 'Doe deze week elke dag de ademhalingsoefening, het liefst op een vast moment. Schrijf op hoe dat ging.', null, marjolijn, today - interval '2 days' + interval '11 hours'),
    (l_anouk, 'video', 'Uitleg bij je rustmomenten', null, null, marjolijn, today - interval '4 days' + interval '14 hours'),
    (l_anouk, 'document', 'Weekschema met rustmomenten', null, null, marjolijn, today - interval '8 days' + interval '9 hours'),
    (l_anouk, 'library', null, null, b_adem, marjolijn, today - interval '10 days' + interval '15 hours'),
    (l_bram, 'document', 'Weekschema met rustmomenten', null, null, marjolijn, today - interval '6 days' + interval '10 hours'),
    (l_fatima, 'note', null, 'Neem elke dag een vast rustmoment, weg van je scherm.', null, marjolijn, today - interval '10 days' + interval '13 hours'),
    (l_bewegen, 'library', null, null, b_wandel, joost, today - interval '6 days' + interval '8 hours');

  -- 8. Berichten ------------------------------------------------------------
  insert into public.messages (assignment_id, sender_id, body, created_at) values
    (l_anouk, marjolijn, 'Hoi, hoe ging het met de rustmomenten deze week?', today - interval '5 days' + interval '10 hours 12 minutes'),
    (l_anouk, anouk, 'Best goed. Ik heb het vijf dagen bijgehouden.', today - interval '5 days' + interval '16 hours 40 minutes'),
    (l_anouk, marjolijn, 'Mooi, dank je. Ik kijk ernaar en zet een reactie onder Voor mij.', today - interval '1 day' + interval '9 hours 5 minutes'),
    (l_bram, marjolijn, 'Ik heb een weekschema voor je klaargezet.', today - interval '6 days' + interval '10 hours 5 minutes'),
    (l_fatima, fatima, 'Dit was mijn wandeling van vandaag.', today - interval '10 days' + interval '17 hours 30 minutes'),
    (l_bewegen, joost, 'Hoe gaat het wandelen?', today - interval '6 days' + interval '8 hours 10 minutes'),
    (l_bewegen, anouk, 'Het wandelen gaat goed, dank je.', today - interval '6 days' + interval '12 hours 25 minutes');

  -- 9. Leesstand: net als in de demo heeft Anouk bij Ontspannen twee nieuwe
  --    onderdelen en één ongelezen bericht. De rest is gelezen.
  insert into public.read_states (user_id, assignment_id, messages_read_at, items_seen_at) values
    (anouk, l_anouk, today - interval '2 days', today - interval '5 days'),
    (anouk, l_bewegen, now(), now()),
    (anouk, l_voeding, now(), now()),
    (marjolijn, l_anouk, now(), now()),
    (marjolijn, l_bram, now(), now()),
    (marjolijn, l_fatima, now(), now()),
    (marjolijn, l_pieter, now(), now());

  -- 10. Afspraken: dagen vanaf vandaag, in Nederlandse tijd. Een afspraak
  --     die op een weekend zou vallen, schuift naar de dichtstbijzijnde werkdag.
  insert into public.appointments (assignment_id, starts_at, place, created_by)
  select v.assignment_id,
    ((d.day + case extract(isodow from d.day)::int
        when 6 then (case when v.days < 0 then -1 else 2 end)
        when 7 then (case when v.days < 0 then -2 else 1 end)
        else 0 end) + v.at) at time zone 'Europe/Amsterdam',
    v.place, v.coach
  from (values
    (l_anouk, marjolijn, -28, time '10:00', 'Op locatie'),
    (l_anouk, marjolijn, -14, time '10:00', 'Op locatie'),
    (l_anouk, marjolijn, 5, time '10:00', 'Op locatie'),
    (l_anouk, marjolijn, 19, time '10:00', 'Op locatie'),
    (l_bewegen, joost, -9, time '14:30', 'Op locatie'),
    (l_bewegen, joost, 8, time '14:30', 'Op locatie'),
    (l_voeding, sanne, 12, time '09:00', 'Telefonisch'),
    (l_bram, marjolijn, -6, time '11:30', 'Op locatie'),
    (l_bram, marjolijn, 7, time '11:30', 'Op locatie'),
    (l_fatima, marjolijn, -20, time '13:00', 'Telefonisch'),
    (l_fatima, marjolijn, 2, time '13:00', 'Op locatie'),
    (l_pieter, marjolijn, 9, time '15:00', 'Op locatie')
  ) as v (assignment_id, coach, days, at, place)
  cross join lateral (select (now() at time zone 'Europe/Amsterdam')::date + v.days as day) d;
end
$$;

-- Controle: dit hoort na het uitvoeren te verschijnen.
select
  (select count(*) from public.library_items) as bibliotheekitems,
  (select count(*) from public.assignments a join public.profiles p on p.id = a.client_id where p.full_name = 'Anouk V.') as disciplines_van_anouk,
  (select count(*) from public.assignments a join public.profiles p on p.id = a.coach_id where p.full_name = 'Marjolijn') as clienten_van_marjolijn,
  (select count(*) from public.personal_items) as persoonlijke_onderdelen,
  (select count(*) from public.messages) as berichten,
  (select count(*) from public.appointments) as afspraken;
