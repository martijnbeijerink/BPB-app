# BPB-app

App voor cliënten en begeleiders van Burnout Preventie & Begeleiding. Cliënten zien een gedeelde bibliotheek met filmpjes en documenten, krijgen per discipline persoonlijke onderdelen van hun begeleider en wisselen berichten uit.

Het functioneel en technisch ontwerp staan in de map `docs/`, de klikbare demo in `demo/`. Beide zijn losse HTML-bestanden die in elke browser openen.

## Stand van zaken

Dit is bouwstap 1 uit het technisch ontwerp: het fundament.

| Onderdeel | Status |
| --- | --- |
| Database: tabellen en toegangsregels per rij | Klaar, met 52 tests |
| App: inloggen met e-mailadres en wachtwoord | Klaar, nog niet getest tegen een echt Supabase-project |
| App: startscherm dat de bibliotheek uit de database leest | Klaar, idem |
| Tweede inlogstap | Niet in gebruik: inloggen is e-mailadres en wachtwoord. In de database met één instelling aan te zetten |
| Uitnodigen per e-mail, wachtwoord herstellen | Volgende stap |
| Schermen Bibliotheek, Voor mij, Berichten, Profiel | Volgende stappen |
| Toegangsregels voor bestanden (documenten, bijlagen) | Volgt bij de stap Bibliotheek |

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

Een nieuw account is standaard cliënt en nog niet actief. Zonder de eerste opdracht ziet de gebruiker na het inloggen niets.

## De app starten

Nodig: de app Expo Go op je telefoon, op hetzelfde wifi-netwerk als je computer.

```
cd app
npm install
```

Kopieer `app/.env.example` naar `app/.env.local` en vul het adres en de publieke sleutel van je Supabase-project in. Start daarna:

```
npx expo start
```

Scan de QR-code met Expo Go (Android) of met de camera (iPhone).

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
