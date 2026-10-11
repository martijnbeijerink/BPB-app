-- BPB-app · demo-gegevens verwijderen
--
-- Haalt de personen weg die demo-gegevens-laden.sql heeft aangemaakt (Joost,
-- Sanne, Bram, Fatima, Pieter), met hun koppelingen, gedeelde onderdelen,
-- berichten en bibliotheekitems.
--
-- Je eigen twee testaccounts blijven bestaan, net als hun onderlinge
-- koppeling en de bibliotheekitems die Marjolijn heeft geplaatst.
--
-- Uitvoeren: plak dit bestand in de SQL Editor van Supabase en kies Run.

do $$
declare
  demo_domain constant text := '@demo.bpb-app.invalid';
  demo uuid[];
begin
  select coalesce(array_agg(id), '{}') into demo from auth.users where email like '%' || demo_domain;
  delete from public.assignments where client_id = any (demo) or coach_id = any (demo);
  delete from public.library_items where created_by = any (demo);
  delete from auth.users where email like '%' || demo_domain;
end
$$;

select count(*) as demo_accounts_over from auth.users where email like '%@demo.bpb-app.invalid';
