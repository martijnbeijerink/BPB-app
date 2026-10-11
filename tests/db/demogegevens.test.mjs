// Tests op het laden van de demo-gegevens (supabase/demo/).
// Het script draait als eigenaar van de database, net als in de SQL Editor
// van Supabase. Daarna kijken de tests als Anouk en als Marjolijn wat de app
// te zien krijgt.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createDatabase, makeRunner } from './helpers.mjs';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/demo');
const load = readFileSync(path.join(dir, 'demo-gegevens-laden.sql'), 'utf8');
const remove = readFileSync(path.join(dir, 'demo-gegevens-verwijderen.sql'), 'utf8');
const withEmails = (client, coach) => load.replace("client_email text := ''", `client_email text := '${client}'`).replace("coach_email text := ''", `coach_email text := '${coach}'`);

/** Nieuwe database met de twee testaccounts uit de README. */
async function start() {
  const db = await createDatabase();
  const user = async (email, role) => {
    const { rows } = await db.query('insert into auth.users (email) values ($1) returning id', [email]);
    await db.query("update public.profiles set role = $2, status = 'active', full_name = 'Test' where id = $1", [rows[0].id, role]);
    return { id: rows[0].id, aal: 'aal1' };
  };
  const client = await user('mijn.client@voorbeeld.nl', 'client');
  const coach = await user('mijn.professional@voorbeeld.nl', 'coach');
  return { db, client, coach, run: makeRunner(db) };
}
/** Voert een vraag uit als gebruiker, in een eigen transactie (zo werkt makeRunner). */
async function as(ctx, who, sql) {
  await ctx.db.exec('begin');
  try {
    return (await ctx.run(who, sql)).rows;
  } finally {
    await ctx.db.exec('rollback');
  }
}
const count = async (db, table) => Number((await db.query(`select count(*) as n from ${table}`)).rows[0].n);

describe('Demo-gegevens laden', () => {
  let ctx;
  before(async () => {
    ctx = await start();
    // Oude testgegevens, zoals de README ze laat aanmaken: die moeten plaatsmaken.
    await ctx.db.exec(`
      insert into public.disciplines (name) values ('ontspannen');
      insert into public.assignments (client_id, coach_id, discipline_id)
        select '${ctx.client.id}', '${ctx.coach.id}', id from public.disciplines;
      insert into public.library_items (title, theme, kind, created_by) values ('Ademhalingsoefening voor rustmomenten', 'ontspannen', 'video', '${ctx.client.id}');
      insert into public.messages (assignment_id, sender_id, body) select id, '${ctx.client.id}', 'oud testbericht' from public.assignments;
    `);
    await ctx.db.exec(load);
  });

  test('het script meldt wat er staat', async () => {
    const results = await ctx.db.exec(load);
    assert.deepEqual(results.at(-1).rows, [{ bibliotheekitems: 4, disciplines_van_anouk: 3, clienten_van_marjolijn: 4, persoonlijke_onderdelen: 7, berichten: 7, afspraken: 12 }]);
  });

  test('Anouk ziet drie disciplines, met twee nieuwe onderdelen en één ongelezen bericht bij Ontspannen', async () => {
    const rows = await as(ctx, ctx.client, 'select discipline, coach_name, client_name, new_items, unread_messages, last_message_body from public.my_assignments()');
    assert.deepEqual(rows.map((r) => [r.discipline, r.coach_name, r.new_items, r.unread_messages]), [
      ['bewegen', 'Joost', 0, 0],
      ['ontspannen', 'Marjolijn', 2, 1],
      ['voeding', 'Sanne', 0, 0],
    ]);
    assert.ok(rows.every((r) => r.client_name === 'Anouk V.'));
    assert.equal(rows[1].last_message_body, 'Mooi, dank je. Ik kijk ernaar en zet een reactie onder Voor mij.');
  });

  test('Anouk ziet haar vier onderdelen bij Ontspannen, nieuwste eerst, en niets van andere cliënten', async () => {
    const rows = await as(ctx, ctx.client, `select i.kind, coalesce(i.title, l.title, left(i.body, 20)) as label from public.personal_items i
      join public.assignments a on a.id = i.assignment_id join public.disciplines d on d.id = a.discipline_id
      left join public.library_items l on l.id = i.library_item_id where d.name = 'ontspannen' order by i.created_at desc`);
    assert.deepEqual(rows.map((r) => r.kind), ['note', 'video', 'document', 'library']);
    assert.equal(rows[3].label, 'Ademhalingsoefening voor rustmomenten');
    const all = await as(ctx, ctx.client, 'select count(*)::int as n from public.personal_items');
    assert.equal(all[0].n, 5, 'vier bij Ontspannen en één bij Bewegen');
    const messages = await as(ctx, ctx.client, 'select count(*)::int as n from public.messages');
    assert.equal(messages[0].n, 5, 'drie met Marjolijn en twee met Joost');
  });

  test('Marjolijn ziet vier cliënten en heeft niets ongelezen', async () => {
    const rows = await as(ctx, ctx.coach, 'select client_name, discipline, unread_messages, new_items from public.my_assignments()');
    assert.deepEqual(rows.map((r) => r.client_name), ['Anouk V.', 'Bram J.', 'Fatima E.', 'Pieter K.']);
    assert.ok(rows.every((r) => r.discipline === 'ontspannen' && r.unread_messages === 0 && r.new_items === 0));
    const messages = await as(ctx, ctx.coach, 'select count(*)::int as n from public.messages');
    assert.equal(messages[0].n, 5, 'de gesprekken van Joost met Anouk ziet zij niet');
  });

  test('iedereen ziet de vier bibliotheekitems, in de volgorde van de demo', async () => {
    const rows = await as(ctx, ctx.client, 'select title, theme, kind from public.library_items order by created_at desc');
    assert.deepEqual(rows.map((r) => r.title), ['Ademhalingsoefening voor rustmomenten', 'Wat doet stress met je brein?', 'Werkblad: energiegevers en energievreters', 'Wandelschema voor de eerste weken']);
  });

  test('Anouk ziet haar zeven afspraken bij drie professionals, Marjolijn die met haar vier cliënten', async () => {
    const mine = await as(ctx, ctx.client, `select d.name as discipline, ap.place, ap.starts_at > now() as komend,
        extract(isodow from ap.starts_at at time zone 'Europe/Amsterdam')::int as weekdag,
        to_char(ap.starts_at at time zone 'Europe/Amsterdam', 'HH24:MI') as tijd
      from public.appointments ap join public.assignments a on a.id = ap.assignment_id join public.disciplines d on d.id = a.discipline_id`);
    assert.equal(mine.length, 7);
    assert.equal(mine.filter((r) => r.komend).length, 4, 'vier komend, drie geweest');
    assert.ok(mine.every((r) => r.weekdag <= 5), 'geen afspraken in het weekend');
    assert.deepEqual([...new Set(mine.filter((r) => r.discipline === 'ontspannen').map((r) => r.tijd))], ['10:00'], 'Nederlandse tijd');
    assert.deepEqual(mine.filter((r) => r.discipline === 'voeding').map((r) => r.place), ['Telefonisch']);
    const coach = await as(ctx, ctx.coach, 'select count(*)::int as n, count(*) filter (where starts_at > now())::int as komend from public.appointments');
    assert.deepEqual(coach, [{ n: 9, komend: 5 }]);
  });

  test('de oude testgegevens zijn vervangen en de eigen accounts zijn dezelfde gebleven', async () => {
    assert.equal(Number((await ctx.db.query("select count(*) as n from public.messages where body = 'oud testbericht'")).rows[0].n), 0);
    const { rows } = await ctx.db.query("select u.email, p.full_name, p.role, p.status from auth.users u join public.profiles p on p.id = u.id where u.email like '%@voorbeeld.nl' order by u.email");
    assert.deepEqual(rows, [
      { email: 'mijn.client@voorbeeld.nl', full_name: 'Anouk V.', role: 'client', status: 'active' },
      { email: 'mijn.professional@voorbeeld.nl', full_name: 'Marjolijn', role: 'coach', status: 'active' },
    ]);
  });

  test('de extra personen hebben geen wachtwoord', async () => {
    const { rows } = await ctx.db.query("select count(*)::int as n, count(*) filter (where encrypted_password = '')::int as leeg from auth.users where email like '%@demo.bpb-app.invalid'");
    assert.deepEqual(rows, [{ n: 5, leeg: 5 }]);
  });

  test('opnieuw uitvoeren geeft dezelfde stand, zonder dubbelen', async () => {
    // Iets veranderen, zoals tijdens een demo gebeurt.
    await ctx.db.query("insert into public.messages (assignment_id, sender_id, body) select a.id, a.client_id, 'tijdens de demo' from public.assignments a limit 1");
    await ctx.db.exec(load);
    await ctx.db.exec(load);
    assert.equal(await count(ctx.db, 'auth.users'), 7);
    assert.equal(await count(ctx.db, 'public.assignments'), 6);
    assert.equal(await count(ctx.db, 'public.library_items'), 4);
    assert.equal(await count(ctx.db, 'public.personal_items'), 7);
    assert.equal(await count(ctx.db, 'public.messages'), 7);
    assert.equal(await count(ctx.db, 'public.disciplines'), 3);
    assert.equal(await count(ctx.db, 'public.appointments'), 12);
  });

  test('verwijderen haalt de extra personen weg en laat de eigen accounts staan', async () => {
    const results = await ctx.db.exec(remove);
    assert.deepEqual(results.at(-1).rows, [{ demo_accounts_over: 0 }]);
    assert.equal(await count(ctx.db, 'auth.users'), 2);
    assert.equal(await count(ctx.db, 'public.assignments'), 1, 'alleen de koppeling tussen de twee eigen accounts');
    assert.equal(await count(ctx.db, 'public.library_items'), 3, 'het item van Joost is weg');
    await ctx.db.exec(load);
    assert.equal(await count(ctx.db, 'public.assignments'), 6, 'laden kan daarna gewoon weer');
  });
});

describe('Demo-gegevens laden: de twee accounts kiezen', () => {
  test('bij twee actieve cliënten stopt het script en verandert er niets', async () => {
    const ctx = await start();
    await ctx.db.exec("insert into auth.users (email) values ('tweede@voorbeeld.nl'); update public.profiles set status = 'active' where id = (select id from auth.users where email = 'tweede@voorbeeld.nl');");
    await assert.rejects(ctx.db.exec(load), /precies één actieve cliënt/);
    assert.equal(await count(ctx.db, 'auth.users'), 3);
    assert.equal(await count(ctx.db, 'public.assignments'), 0);
    assert.equal(await count(ctx.db, 'public.library_items'), 0);
  });

  test('met de e-mailadressen ingevuld kiest het script die accounts', async () => {
    const ctx = await start();
    await ctx.db.exec("insert into auth.users (email) values ('tweede@voorbeeld.nl'); update public.profiles set status = 'active' where id = (select id from auth.users where email = 'tweede@voorbeeld.nl');");
    await ctx.db.exec(withEmails('Mijn.Client@voorbeeld.nl ', 'mijn.professional@voorbeeld.nl'));
    const rows = await as(ctx, ctx.client, 'select count(*)::int as n from public.my_assignments()');
    assert.equal(rows[0].n, 3);
  });

  test('een onbekend of verwisseld e-mailadres geeft een duidelijke melding', async () => {
    const ctx = await start();
    await assert.rejects(ctx.db.exec(withEmails('bestaat.niet@voorbeeld.nl', 'mijn.professional@voorbeeld.nl')), /Cliënt niet gevonden/);
    await assert.rejects(ctx.db.exec(withEmails('mijn.professional@voorbeeld.nl', 'mijn.client@voorbeeld.nl')), /niet de rol cliënt/);
    assert.equal(await count(ctx.db, 'public.assignments'), 0);
  });

  test('zonder professional stopt het script', async () => {
    const db = await createDatabase();
    await db.exec("insert into auth.users (email) values ('alleen@voorbeeld.nl'); update public.profiles set status = 'active';");
    await assert.rejects(db.exec(load), /Professional niet gevonden/);
  });
});
