// Tests op de toegangsregels: wie mag wat zien en doen?
// Elke test probeert iets als een bepaalde gebruiker. Waar iemand bij
// gegevens van een ander wil komen, moet de database dat weigeren.

import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, test } from 'node:test';
import { ANON, assertDenied, createDatabase, makeRunner } from './helpers.mjs';

let db, run;
const u = {};      // gebruikers
const d = {};      // disciplines
const k = {};      // koppelingen
const x = {};      // overige rijen

const ids = (result) => result.rows.map((row) => row.id).sort();
const one = async (sql, params) => (await run(null, sql, params)).rows[0].id;

before(async () => {
  db = await createDatabase();
  run = makeRunner(db);
  await db.exec('begin');

  const user = async (key, name, role, status, aal) => {
    const id = await one('insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id', [`${key}@voorbeeld.nl`, { full_name: name }]);
    await run(null, 'update public.profiles set role = $2, status = $3 where id = $1', [id, role, status]);
    u[key] = { id, aal };
  };
  // Iedereen logt in met alleen e-mailadres en wachtwoord (aal1).
  await user('beheerder', 'Beheerder', 'admin', 'active', 'aal1');
  await user('marjolijn', 'Marjolijn', 'coach', 'active', 'aal1');   // begeleider ontspannen
  await user('sanne', 'Sanne', 'coach', 'active', 'aal1');           // begeleider voeding
  await user('anouk', 'Anouk V.', 'client', 'active', 'aal1');
  await user('bram', 'Bram J.', 'client', 'active', 'aal1');
  await user('geblokkeerd', 'Geblokkeerde cliënt', 'client', 'blocked', 'aal1');
  await user('uitgenodigd', 'Nog niet actief', 'client', 'invited', 'aal1');

  d.ontspannen = await one("insert into public.disciplines (name) values ('Ontspannen') returning id");
  d.voeding = await one("insert into public.disciplines (name) values ('Voeding') returning id");

  const link = (client, coach, discipline, extra = '') =>
    one(`insert into public.assignments (client_id, coach_id, discipline_id${extra ? ', starts_on, ends_on' : ''}) values ($1, $2, $3${extra}) returning id`, [u[client].id, u[coach].id, d[discipline]]);
  k.anoukOntspannen = await link('anouk', 'marjolijn', 'ontspannen');
  k.anoukVoeding = await link('anouk', 'sanne', 'voeding');
  k.bramOntspannen = await link('bram', 'marjolijn', 'ontspannen');
  k.geblokkeerd = await link('geblokkeerd', 'marjolijn', 'ontspannen');
  k.bramVoedingGestopt = await link('bram', 'sanne', 'voeding', ', current_date - 30, current_date - 1');

  x.bibliotheek = await one("insert into public.library_items (title, theme, kind, created_by) values ('Ademhalingsoefening', 'ontspannen', 'video', $1) returning id", [u.marjolijn.id]);

  const note = (assignment, coach, text) =>
    one("insert into public.personal_items (assignment_id, kind, body, created_by) values ($1, 'note', $2, $3) returning id", [assignment, text, u[coach].id]);
  x.itemAnoukOntspannen = await note(k.anoukOntspannen, 'marjolijn', 'Notitie voor Anouk, ontspannen');
  x.itemAnoukVoeding = await note(k.anoukVoeding, 'sanne', 'Notitie voor Anouk, voeding');
  x.itemBram = await note(k.bramOntspannen, 'marjolijn', 'Notitie voor Bram');
  x.itemGestopt = await note(k.bramVoedingGestopt, 'sanne', 'Notitie uit een beëindigd traject');

  const message = (assignment, sender, text) =>
    one('insert into public.messages (assignment_id, sender_id, body) values ($1, $2, $3) returning id', [assignment, u[sender].id, text]);
  x.berichtAnoukOntspannen = await message(k.anoukOntspannen, 'anouk', 'Bericht van Anouk aan Marjolijn');
  x.berichtAnoukVoeding = await message(k.anoukVoeding, 'sanne', 'Bericht van Sanne aan Anouk');
  x.berichtBram = await message(k.bramOntspannen, 'bram', 'Bericht van Bram aan Marjolijn');
  x.berichtGestopt = await message(k.bramVoedingGestopt, 'bram', 'Bericht uit een beëindigd traject');

  x.bijlage = await one("insert into public.attachments (message_id, storage_path, file_name) values ($1, 'prive/rustmomenten.pdf', 'rustmomenten.pdf') returning id", [x.berichtAnoukOntspannen]);
  await run(null, 'insert into public.read_states (user_id, assignment_id, messages_read_at) values ($1, $2, now())', [u.anouk.id, k.anoukOntspannen]);
  await run(null, "insert into public.devices (user_id, push_token, platform) values ($1, 'token-anouk', 'ios')", [u.anouk.id]);
  await db.exec('commit');
});

after(async () => { await db.close(); });
beforeEach(async () => { await db.exec('begin'); });
afterEach(async () => { await db.exec('rollback'); });

describe('Niet ingelogd', () => {
  test('een bezoeker zonder account kan geen enkele tabel lezen', async () => {
    for (const table of ['profiles', 'disciplines', 'assignments', 'library_items', 'personal_items', 'messages', 'attachments', 'read_states', 'devices']) {
      await assertDenied(run(ANON, `select * from public.${table}`), table);
    }
  });
  test('een bezoeker zonder account kan de beheerfunctie niet aanroepen', async () => {
    await assertDenied(run(ANON, "select public.admin_update_profile($1, 'admin', 'active')", [u.anouk.id]));
  });
});

describe('Gedeelde bibliotheek', () => {
  test('een cliënt ziet de bibliotheek', async () => {
    assert.deepEqual(ids(await run(u.anouk, 'select id from public.library_items')), [x.bibliotheek]);
  });
  test('een cliënt kan niets toevoegen, wijzigen of verwijderen', async () => {
    await assertDenied(run(u.anouk, "insert into public.library_items (title, theme, kind, created_by) values ('Eigen item', 'brein', 'video', $1)", [u.anouk.id]));
    assert.equal((await run(u.anouk, "update public.library_items set title = 'Aangepast'")).affectedRows, 0);
    assert.equal((await run(u.anouk, 'delete from public.library_items')).affectedRows, 0);
  });
  test('een begeleider kan een item toevoegen, wijzigen en verwijderen', async () => {
    const id = (await run(u.sanne, "insert into public.library_items (title, theme, kind, created_by) values ('Weekmenu', 'voeding', 'document', $1) returning id", [u.sanne.id])).rows[0].id;
    assert.equal((await run(u.marjolijn, "update public.library_items set title = 'Weekmenu, versie 2' where id = $1", [id])).affectedRows, 1);
    assert.equal((await run(u.sanne, 'delete from public.library_items where id = $1', [id])).affectedRows, 1);
  });
  test('een begeleider kan geen item op naam van een ander plaatsen', async () => {
    await assertDenied(run(u.sanne, "insert into public.library_items (title, theme, kind, created_by) values ('Vals', 'voeding', 'document', $1)", [u.marjolijn.id]));
  });
  test('wat een begeleider toevoegt, ziet elke cliënt', async () => {
    await run(u.marjolijn, "insert into public.library_items (title, theme, kind, created_by) values ('Slaaproutine', 'ontspannen', 'document', $1)", [u.marjolijn.id]);
    assert.equal((await run(u.bram, 'select id from public.library_items')).rows.length, 2);
  });
});

describe('Voor mij: persoonlijke onderdelen', () => {
  test('een cliënt ziet alleen de eigen onderdelen', async () => {
    assert.deepEqual(ids(await run(u.anouk, 'select id from public.personal_items')), [x.itemAnoukOntspannen, x.itemAnoukVoeding].sort());
  });
  test('een cliënt ziet niets van een andere cliënt', async () => {
    assert.deepEqual((await run(u.bram, 'select id from public.personal_items where id = $1', [x.itemAnoukOntspannen])).rows, []);
    assert.deepEqual((await run(u.bram, 'select id from public.personal_items where assignment_id = $1', [k.anoukOntspannen])).rows, []);
  });
  test('een begeleider ziet alleen de eigen pagina, ook bij een gedeelde cliënt', async () => {
    // Marjolijn (ontspannen) ziet Anouk en Bram, maar niet wat Sanne (voeding) met Anouk deelt.
    assert.deepEqual(ids(await run(u.marjolijn, 'select id from public.personal_items')), [x.itemAnoukOntspannen, x.itemBram].sort());
    assert.deepEqual((await run(u.marjolijn, 'select id from public.personal_items where id = $1', [x.itemAnoukVoeding])).rows, []);
  });
  test('een begeleider deelt iets en de cliënt ziet het', async () => {
    const id = (await run(u.marjolijn, "insert into public.personal_items (assignment_id, kind, body, created_by) values ($1, 'note', 'Nieuwe notitie', $2) returning id", [k.anoukOntspannen, u.marjolijn.id])).rows[0].id;
    assert.ok(ids(await run(u.anouk, 'select id from public.personal_items')).includes(id));
    assert.ok(!ids(await run(u.bram, 'select id from public.personal_items')).includes(id));
  });
  test('een begeleider kan een item uit de bibliotheek aanraden', async () => {
    await run(u.marjolijn, "insert into public.personal_items (assignment_id, kind, library_item_id, created_by) values ($1, 'library', $2, $3)", [k.anoukOntspannen, x.bibliotheek, u.marjolijn.id]);
  });
  test('een begeleider kan niets plaatsen bij de cliënt van een ander', async () => {
    await assertDenied(run(u.sanne, "insert into public.personal_items (assignment_id, kind, body, created_by) values ($1, 'note', 'Hoort hier niet', $2)", [k.anoukOntspannen, u.sanne.id]));
    await assertDenied(run(u.sanne, "insert into public.personal_items (assignment_id, kind, body, created_by) values ($1, 'note', 'Hoort hier niet', $2)", [k.bramOntspannen, u.sanne.id]));
  });
  test('een begeleider kan niets wijzigen of verwijderen op de pagina van een ander', async () => {
    assert.equal((await run(u.sanne, "update public.personal_items set body = 'Aangepast' where id = $1", [x.itemAnoukOntspannen])).affectedRows, 0);
    assert.equal((await run(u.sanne, 'delete from public.personal_items where id = $1', [x.itemAnoukOntspannen])).affectedRows, 0);
  });
  test('een begeleider kan een eigen onderdeel niet naar een andere koppeling verplaatsen', async () => {
    await assertDenied(run(u.marjolijn, 'update public.personal_items set assignment_id = $2 where id = $1', [x.itemAnoukOntspannen, k.anoukVoeding]));
  });
  test('een cliënt kan zelf niets plaatsen, wijzigen of verwijderen', async () => {
    await assertDenied(run(u.anouk, "insert into public.personal_items (assignment_id, kind, body, created_by) values ($1, 'note', 'Van de cliënt', $2)", [k.anoukOntspannen, u.anouk.id]));
    assert.equal((await run(u.anouk, "update public.personal_items set body = 'Aangepast'")).affectedRows, 0);
    assert.equal((await run(u.anouk, 'delete from public.personal_items')).affectedRows, 0);
  });
  test('de beheerder ziet geen persoonlijke onderdelen en kan er geen plaatsen', async () => {
    assert.deepEqual((await run(u.beheerder, 'select id from public.personal_items')).rows, []);
    await assertDenied(run(u.beheerder, "insert into public.personal_items (assignment_id, kind, body, created_by) values ($1, 'note', 'Van de beheerder', $2)", [k.anoukOntspannen, u.beheerder.id]));
  });
});

describe('Berichten en bijlagen', () => {
  test('een cliënt ziet alleen de eigen gesprekken', async () => {
    assert.deepEqual(ids(await run(u.anouk, 'select id from public.messages')), [x.berichtAnoukOntspannen, x.berichtAnoukVoeding].sort());
    assert.deepEqual((await run(u.bram, 'select id from public.messages where assignment_id = $1', [k.anoukOntspannen])).rows, []);
  });
  test('een begeleider ziet alleen het eigen gesprek, ook bij een gedeelde cliënt', async () => {
    assert.deepEqual(ids(await run(u.marjolijn, 'select id from public.messages')), [x.berichtAnoukOntspannen, x.berichtBram].sort());
    assert.deepEqual((await run(u.marjolijn, 'select id from public.messages where id = $1', [x.berichtAnoukVoeding])).rows, []);
  });
  test('cliënt en begeleider sturen elkaar een bericht', async () => {
    await run(u.anouk, "insert into public.messages (assignment_id, sender_id, body) values ($1, $2, 'Dank je')", [k.anoukOntspannen, u.anouk.id]);
    await run(u.marjolijn, "insert into public.messages (assignment_id, sender_id, body) values ($1, $2, 'Graag gedaan')", [k.anoukOntspannen, u.marjolijn.id]);
    assert.equal((await run(u.anouk, 'select id from public.messages where assignment_id = $1', [k.anoukOntspannen])).rows.length, 3);
  });
  test('niemand kan een bericht sturen in het gesprek van een ander', async () => {
    await assertDenied(run(u.bram, "insert into public.messages (assignment_id, sender_id, body) values ($1, $2, 'Inbreker')", [k.anoukOntspannen, u.bram.id]));
    await assertDenied(run(u.sanne, "insert into public.messages (assignment_id, sender_id, body) values ($1, $2, 'Inbreker')", [k.anoukOntspannen, u.sanne.id]));
  });
  test('niemand kan een bericht sturen onder de naam van een ander', async () => {
    await assertDenied(run(u.anouk, "insert into public.messages (assignment_id, sender_id, body) values ($1, $2, 'Vals')", [k.anoukOntspannen, u.marjolijn.id]));
  });
  test('een verstuurd bericht kan niet worden gewijzigd of verwijderd', async () => {
    await assertDenied(run(u.anouk, "update public.messages set body = 'Aangepast' where id = $1", [x.berichtAnoukOntspannen]));
    await assertDenied(run(u.anouk, 'delete from public.messages where id = $1', [x.berichtAnoukOntspannen]));
  });
  test('een bijlage is alleen zichtbaar voor de twee deelnemers', async () => {
    assert.deepEqual(ids(await run(u.anouk, 'select id from public.attachments')), [x.bijlage]);
    assert.deepEqual(ids(await run(u.marjolijn, 'select id from public.attachments')), [x.bijlage]);
    assert.deepEqual((await run(u.sanne, 'select id from public.attachments')).rows, []);
    assert.deepEqual((await run(u.bram, 'select id from public.attachments')).rows, []);
  });
  test('een bijlage kan alleen bij een eigen bericht', async () => {
    await run(u.anouk, "insert into public.attachments (message_id, storage_path, file_name) values ($1, 'prive/foto.jpg', 'foto.jpg')", [x.berichtAnoukOntspannen]);
    await assertDenied(run(u.marjolijn, "insert into public.attachments (message_id, storage_path, file_name) values ($1, 'prive/foto.jpg', 'foto.jpg')", [x.berichtAnoukOntspannen]));
    await assertDenied(run(u.bram, "insert into public.attachments (message_id, storage_path, file_name) values ($1, 'prive/foto.jpg', 'foto.jpg')", [x.berichtAnoukOntspannen]));
  });
  test('de beheerder ziet geen berichten en geen bijlagen', async () => {
    assert.deepEqual((await run(u.beheerder, 'select id from public.messages')).rows, []);
    assert.deepEqual((await run(u.beheerder, 'select id from public.attachments')).rows, []);
    await assertDenied(run(u.beheerder, "insert into public.messages (assignment_id, sender_id, body) values ($1, $2, 'Van de beheerder')", [k.anoukOntspannen, u.beheerder.id]));
  });
});

describe('Profielen', () => {
  test('een cliënt ziet zichzelf en de eigen begeleiders, geen andere cliënten', async () => {
    assert.deepEqual(ids(await run(u.anouk, 'select id from public.profiles')), [u.anouk.id, u.marjolijn.id, u.sanne.id].sort());
    assert.deepEqual((await run(u.anouk, 'select id from public.profiles where id = $1', [u.bram.id])).rows, []);
  });
  test('een begeleider ziet zichzelf en de eigen cliënten', async () => {
    assert.deepEqual(ids(await run(u.marjolijn, 'select id from public.profiles')), [u.marjolijn.id, u.anouk.id, u.bram.id, u.geblokkeerd.id].sort());
  });
  test('de beheerder ziet alle profielen', async () => {
    assert.equal((await run(u.beheerder, 'select id from public.profiles')).rows.length, Object.keys(u).length);
  });
  test('niemand kan de eigen rol of status aanpassen', async () => {
    await assertDenied(run(u.anouk, "update public.profiles set role = 'admin' where id = $1", [u.anouk.id]));
    await assertDenied(run(u.geblokkeerd, "update public.profiles set status = 'active' where id = $1", [u.geblokkeerd.id]));
    await assertDenied(run(u.marjolijn, "update public.profiles set role = 'admin' where id = $1", [u.marjolijn.id]));
  });
  test('iemand kan de eigen naam aanpassen, niet die van een ander', async () => {
    assert.equal((await run(u.anouk, "update public.profiles set full_name = 'Anouk Visser' where id = $1", [u.anouk.id])).affectedRows, 1);
    assert.equal((await run(u.anouk, "update public.profiles set full_name = 'Gekaapt' where id = $1", [u.marjolijn.id])).affectedRows, 0);
  });
  test('niemand kan zelf een profiel aanmaken of verwijderen', async () => {
    await assertDenied(run(u.anouk, 'delete from public.profiles where id = $1', [u.anouk.id]));
    await assertDenied(run(u.beheerder, 'delete from public.profiles where id = $1', [u.anouk.id]));
  });
});

describe('Beheer: accounts, koppelingen en disciplines', () => {
  test('de beheerder blokkeert een account en dat werkt direct', async () => {
    await run(u.beheerder, "select public.admin_update_profile($1, 'client', 'blocked')", [u.bram.id]);
    assert.deepEqual((await run(u.bram, 'select id from public.library_items')).rows, []);
    assert.deepEqual((await run(u.bram, 'select id from public.messages')).rows, []);
  });
  test('alleen de beheerder kan de beheerfunctie gebruiken', async () => {
    await assertDenied(run(u.marjolijn, "select public.admin_update_profile($1, 'client', 'blocked')", [u.bram.id]));
    await assertDenied(run(u.anouk, "select public.admin_update_profile($1, 'admin', 'active')", [u.anouk.id]));
  });
  test('de beheerder kan het eigen account niet wijzigen', async () => {
    await assertDenied(run(u.beheerder, "select public.admin_update_profile($1, 'admin', 'closed')", [u.beheerder.id]));
  });
  test('een gebruiker met koppelingen kan niet van rol wisselen', async () => {
    await assertDenied(run(u.beheerder, "select public.admin_update_profile($1, 'coach', 'active')", [u.anouk.id]));
  });
  test('alleen de beheerder maakt en wijzigt koppelingen', async () => {
    const id = (await run(u.beheerder, 'insert into public.assignments (client_id, coach_id, discipline_id) values ($1, $2, $3) returning id', [u.bram.id, u.sanne.id, d.voeding])).rows[0].id;
    assert.ok(id);
    await assertDenied(run(u.marjolijn, 'insert into public.assignments (client_id, coach_id, discipline_id) values ($1, $2, $3)', [u.uitgenodigd.id, u.marjolijn.id, d.voeding]));
    await assertDenied(run(u.anouk, 'insert into public.assignments (client_id, coach_id, discipline_id) values ($1, $2, $3)', [u.anouk.id, u.marjolijn.id, d.voeding]));
    assert.equal((await run(u.marjolijn, 'delete from public.assignments where id = $1', [k.anoukVoeding])).affectedRows, 0);
  });
  test('een koppeling verbindt altijd een cliënt met een begeleider', async () => {
    await assertDenied(run(u.beheerder, 'insert into public.assignments (client_id, coach_id, discipline_id) values ($1, $2, $3)', [u.marjolijn.id, u.sanne.id, d.voeding]));
    await assertDenied(run(u.beheerder, 'insert into public.assignments (client_id, coach_id, discipline_id) values ($1, $2, $3)', [u.uitgenodigd.id, u.bram.id, d.voeding]));
  });
  test('een cliënt ziet alleen de eigen koppelingen, een begeleider ook', async () => {
    assert.deepEqual(ids(await run(u.anouk, 'select id from public.assignments')), [k.anoukOntspannen, k.anoukVoeding].sort());
    assert.deepEqual(ids(await run(u.sanne, 'select id from public.assignments')), [k.anoukVoeding, k.bramVoedingGestopt].sort());
  });
  test('alleen de beheerder beheert de lijst met disciplines', async () => {
    await run(u.beheerder, "insert into public.disciplines (name) values ('Bewegen')");
    await assertDenied(run(u.marjolijn, "insert into public.disciplines (name) values ('Slapen')"));
    assert.equal((await run(u.anouk, "update public.disciplines set name = 'Anders'")).affectedRows, 0);
    assert.equal((await run(u.anouk, 'select id from public.disciplines')).rows.length, 3);
  });
});

describe('Inloggen: tweede stap is uit, maar instelbaar', () => {
  const tables = ['library_items', 'personal_items', 'messages', 'attachments', 'assignments', 'disciplines'];
  const verplicht = () => run(null, 'update private.app_settings set require_second_step = true');

  test('standaard is e-mailadres en wachtwoord genoeg voor begeleider en beheerder', async () => {
    assert.deepEqual(ids(await run(u.marjolijn, 'select id from public.personal_items')), [x.itemAnoukOntspannen, x.itemBram].sort());
    await run(u.beheerder, "select public.admin_update_profile($1, 'client', 'blocked')", [u.bram.id]);
  });
  test('niemand kan de instelling zelf lezen of wijzigen', async () => {
    for (const who of [ANON, u.anouk, u.marjolijn, u.beheerder]) {
      await assertDenied(run(who, 'select * from private.app_settings'));
      await assertDenied(run(who, 'update private.app_settings set require_second_step = false'));
    }
  });
  test('met de instelling aan ziet een begeleider zonder tweede stap niets', async () => {
    await verplicht();
    for (const table of tables) assert.deepEqual((await run(u.marjolijn, `select * from public.${table}`)).rows, [], table);
    await assertDenied(run(u.marjolijn, "insert into public.personal_items (assignment_id, kind, body, created_by) values ($1, 'note', 'Zonder tweede stap', $2)", [k.anoukOntspannen, u.marjolijn.id]));
  });
  test('met de instelling aan kan een beheerder zonder tweede stap niets', async () => {
    await verplicht();
    assert.deepEqual(ids(await run(u.beheerder, 'select id from public.profiles')), [u.beheerder.id]);
    await assertDenied(run(u.beheerder, "select public.admin_update_profile($1, 'client', 'blocked')", [u.bram.id]));
  });
  test('met de instelling aan werkt alles weer na de tweede stap', async () => {
    await verplicht();
    assert.deepEqual(ids(await run({ ...u.marjolijn, aal: 'aal2' }, 'select id from public.personal_items')), [x.itemAnoukOntspannen, x.itemBram].sort());
    await run({ ...u.beheerder, aal: 'aal2' }, "select public.admin_update_profile($1, 'client', 'blocked')", [u.bram.id]);
  });
  test('een cliënt heeft nooit een tweede stap nodig', async () => {
    await verplicht();
    assert.deepEqual(ids(await run(u.anouk, 'select id from public.personal_items')), [x.itemAnoukOntspannen, x.itemAnoukVoeding].sort());
  });
});

describe('Accountstatus', () => {
  const tables = ['library_items', 'personal_items', 'messages', 'attachments', 'assignments', 'disciplines'];
  test('een geblokkeerd account ziet niets meer', async () => {
    for (const table of tables) assert.deepEqual((await run(u.geblokkeerd, `select * from public.${table}`)).rows, [], table);
    await assertDenied(run(u.geblokkeerd, "insert into public.messages (assignment_id, sender_id, body) values ($1, $2, 'Toch nog')", [k.geblokkeerd, u.geblokkeerd.id]));
  });
  test('een uitgenodigd account dat nog niet actief is, ziet niets', async () => {
    for (const table of tables) assert.deepEqual((await run(u.uitgenodigd, `select * from public.${table}`)).rows, [], table);
  });
  test('na het einde van een koppeling kan nog gelezen worden, maar niet meer geschreven', async () => {
    assert.deepEqual(ids(await run(u.bram, 'select id from public.personal_items where assignment_id = $1', [k.bramVoedingGestopt])), [x.itemGestopt]);
    assert.deepEqual(ids(await run(u.bram, 'select id from public.messages where assignment_id = $1', [k.bramVoedingGestopt])), [x.berichtGestopt]);
    await assertDenied(run(u.bram, "insert into public.messages (assignment_id, sender_id, body) values ($1, $2, 'Na afloop')", [k.bramVoedingGestopt, u.bram.id]));
    await assertDenied(run(u.sanne, "insert into public.personal_items (assignment_id, kind, body, created_by) values ($1, 'note', 'Na afloop', $2)", [k.bramVoedingGestopt, u.sanne.id]));
  });
});

describe('Leesstand en apparaten', () => {
  test('de leesstand is alleen voor de gebruiker zelf', async () => {
    assert.equal((await run(u.anouk, 'select * from public.read_states')).rows.length, 1);
    // De begeleider ziet dus niet of de cliënt een bericht heeft gelezen.
    assert.deepEqual((await run(u.marjolijn, 'select * from public.read_states')).rows, []);
    assert.deepEqual((await run(u.beheerder, 'select * from public.read_states')).rows, []);
  });
  test('iemand houdt alleen de eigen leesstand bij, en alleen in eigen gesprekken', async () => {
    await run(u.marjolijn, 'insert into public.read_states (user_id, assignment_id, messages_read_at) values ($1, $2, now())', [u.marjolijn.id, k.anoukOntspannen]);
    await assertDenied(run(u.marjolijn, 'insert into public.read_states (user_id, assignment_id, messages_read_at) values ($1, $2, now())', [u.anouk.id, k.anoukOntspannen]));
    await assertDenied(run(u.bram, 'insert into public.read_states (user_id, assignment_id, messages_read_at) values ($1, $2, now())', [u.bram.id, k.anoukOntspannen]));
  });
  test('iemand ziet en beheert alleen de eigen apparaten', async () => {
    assert.equal((await run(u.anouk, 'select * from public.devices')).rows.length, 1);
    assert.deepEqual((await run(u.bram, 'select * from public.devices')).rows, []);
    assert.deepEqual((await run(u.beheerder, 'select * from public.devices')).rows, []);
    await assertDenied(run(u.bram, "insert into public.devices (user_id, push_token, platform) values ($1, 'token-vals', 'android')", [u.anouk.id]));
  });
});
