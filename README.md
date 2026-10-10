# BPB-app

App voor cliënten en begeleiders van Burnout Preventie & Begeleiding. Cliënten zien een gedeelde bibliotheek met filmpjes en documenten, krijgen per discipline persoonlijke onderdelen van hun begeleider en wisselen berichten uit.

Het functioneel en technisch ontwerp staan in de map `docs/`, de klikbare demo in `demo/`. Beide zijn losse HTML-bestanden die in elke browser openen.

## Stand van zaken

Het fundament staat (bouwstap 1 uit het technisch ontwerp) en de eerste schermen van de app zijn gebouwd.

| Onderdeel | Status |
| --- | --- |
| Database: tabellen en toegangsregels per rij | Klaar, met 61 tests |
| App: inloggen met e-mailadres en wachtwoord | Klaar, getest op een telefoon tegen het echte Supabase-project |
| App: menubalk met tabs per rol, Bibliotheek met thema's en zoeken, Profiel | Klaar, getest op een telefoon |
| App: Voor mij (cliënt) en Cliënten (begeleider): notitie delen en een bibliotheekitem aanraden | Klaar. In een browser doorgeklikt tegen een nagebootste backend, nog niet op een telefoon |
| App: Berichten tussen cliënt en begeleider, live, met tellers in de menubalk | Klaar, zonder bijlagen. In een browser doorgeklikt tegen een nagebootste backend, nog niet op een telefoon. Het live binnenkomen is alleen op het echte project te controleren |
| Eigen filmpje of document delen, bijlagen bij berichten | Volgt zodra de bestandsopslag en de videodienst zijn gekoppeld |
| Afspelen van filmpjes en openen van documenten | Volgt zodra de videodienst en de bestandsopslag zijn gekoppeld |
| Scherm Afspraken | Volgende stap. De tab bestaat al en toont een tussenscherm |
| Tweede inlogstap | Niet in gebruik: inloggen is e-mailadres en wachtwoord. In de database met één instelling aan te zetten |
| Uitnodigen per e-mail, wachtwoord herstellen | Volgt |
| Meldingen op de telefoon (push) | Volgt |

## Indeling

| Map | Inhoud |
| --- | --- |
| `supabase/migrations/` | De database: tabellen en toegangsregels |
| `tests/db/` | Tests die als cliënt, begeleider en beheerder proberen bij andermans gegevens te komen |
| `tests/app/` | Tests van losse onderdelen van de app |
| `app/` | De app zelf (Expo, React Native, TypeScript) |
| `docs/` | Functioneel en technisch ontwerp, versie 0.3 (concept) |
| `demo/` | Klikbare demo met voorbeeldgegevens, zonder backend |

## Tests draaien

Nodig: Node.js 22.18 of nieuwer. Een Supabase-account of Docker is niet nodig; de tests draaien in een database in het geheugen.

```
npm install
npm test
```

De tests bootsen het inlogsysteem van Supabase na (zie `tests/db/shim.sql`). Ze bewijzen dat de regels kloppen, maar vervangen niet een controle op het echte project.

## Supabase instellen

1. Maak op supabase.com een nieuw project in de regio **Central EU (Frankfurt)**.
2. Open de SQL Editor en voer de bestanden uit `supabase/migrations/` één voor één uit, in de volgorde van hun naam.
3. Zet in de instellingen van Authentication het zelf registreren van nieuwe gebruikers uit. Accounts ontstaan alleen op uitnodiging.

### Een testcliënt aanmaken

Maak onder Authentication een gebruiker aan met e-mailadres en wachtwoord. Voer daarna in de SQL Editor uit, met het e-mailadres van die gebruiker:

```sql
update public.profiles
set full_name = 'Anouk V.', status = 'active'
where id = (select id from auth.users where email = 'anouk@voorbeeld.nl');

insert into public.library_items (title, theme, kind, created_by)
select 'Ademhalingsoefening voor rustmomenten', 'ontspannen', 'video', id
from auth.users where email = 'anouk@voorbeeld.nl';
```

Een nieuw account is standaard cliënt en nog niet actief. Zonder de eerste opdracht ziet de gebruiker na het inloggen alleen de melding dat het account nog niet actief is.

### Een testbegeleider aanmaken en koppelen

Voor mij, Cliënten en Berichten werken pas als een cliënt aan een begeleider is gekoppeld. Maak onder Authentication een tweede gebruiker aan en voer daarna in de SQL Editor uit, met de e-mailadressen van jouw twee testgebruikers:

```sql
-- De begeleider: naam, rol en actief
update public.profiles
set full_name = 'Marjolijn', role = 'coach', status = 'active'
where id = (select id from auth.users where email = 'marjolijn@voorbeeld.nl');

-- De discipline
insert into public.disciplines (name) values ('ontspannen')
on conflict (name) do nothing;

-- De koppeling: deze cliënt, deze begeleider, deze discipline
insert into public.assignments (client_id, coach_id, discipline_id)
select c.id, b.id, d.id
from auth.users c, auth.users b, public.disciplines d
where c.email = 'anouk@voorbeeld.nl'
  and b.email = 'marjolijn@voorbeeld.nl'
  and d.name = 'ontspannen';
```

De laatste opdracht hoort "1 row" te melden. Meldt hij "0 rows", dan klopt een van de e-mailadressen niet.

Een begeleider ziet de tab Cliënten in plaats van Voor mij. Log met de begeleider in om een notitie te delen of een bericht te sturen, en met de cliënt om het te zien. Dat kan op twee telefoons, of op één telefoon door uit en in te loggen.

## De app starten

Nodig: de app Expo Go op je telefoon, op hetzelfde wifi-netwerk als je computer.

De app staat in de submap `app`. Installeren en starten doe je dus daar, niet in de hoofdmap:

```
cd app
npm install
```

Kopieer `app/.env.example` naar `app/.env.local` en vul het adres en de publieke sleutel van je Supabase-project in. Gebruik de publieke sleutel (publishable of anon), nooit een secret key. Start daarna, nog steeds in de map `app`:

```
npx expo start
```

Vanuit de hoofdmap kan het ook met `npm start`.

Krijg je de melding `Unable to resolve "../../App"`, dan is de app vanuit de hoofdmap gestart in plaats van vanuit `app`.

Scan de QR-code met Expo Go (Android) of met de camera (iPhone).

Na het binnenhalen van een nieuwe versie van de code: draai in de map `app` eerst opnieuw `npm install`. Er kunnen onderdelen zijn bijgekomen.

## Namen in de database

De database gebruikt Engelse namen, de ontwerpen Nederlandse.

| Database | Ontwerp |
| --- | --- |
| `profiles` | Gebruikers |
| `disciplines` | Disciplines |
| `assignments` | Koppelingen: één cliënt, één begeleider, één discipline |
| `library_items` | Bibliotheekitems |
| `personal_items` | Persoonlijke items |
| `messages` | Berichten |
| `attachments` | Bijlagen |
| `read_states` | Leesstand |
| `devices` | Apparaten |
