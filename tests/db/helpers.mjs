// Hulpmiddelen voor de databasetests.
// De tests draaien in een Postgres-database in het geheugen (PGlite), dus
// zonder Supabase-account of Docker. Elke test loopt in een transactie die
// na afloop wordt teruggedraaid, zodat tests elkaar niet beïnvloeden.

import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');

export const ANON = Symbol('niet ingelogd');

/** Nieuwe database met de nabootsing van Supabase en alle migraties. */
export async function createDatabase() {
  const db = new PGlite();
  await db.exec(read('tests/db/shim.sql'));
  const dir = 'supabase/migrations';
  for (const file of readdirSync(path.join(root, dir)).sort()) {
    if (file.endsWith('.sql')) await db.exec(read(path.join(dir, file)));
  }
  return db;
}

/**
 * Voert één opdracht uit als een bepaalde gebruiker.
 *   who = null            → als eigenaar van de database (voor de testgegevens)
 *   who = ANON            → als bezoeker die niet is ingelogd
 *   who = { id, aal }     → als ingelogde gebruiker; aal2 = tweede inlogstap gedaan
 */
export function makeRunner(db) {
  return async function run(who, sql, params = []) {
    await db.exec('savepoint q');
    try {
      const claims = who && who !== ANON ? JSON.stringify({ sub: who.id, role: 'authenticated', aal: who.aal ?? 'aal1' }) : '';
      await db.query("select set_config('request.jwt.claims', $1, true)", [claims]);
      await db.exec(who === ANON ? 'set local role anon' : who ? 'set local role authenticated' : 'reset role');
      const result = await db.query(sql, params);
      await db.exec('reset role');
      await db.exec('release savepoint q');
      return result;
    } catch (error) {
      await db.exec('rollback to savepoint q');
      await db.exec('release savepoint q');
      await db.exec('reset role');
      throw error;
    }
  };
}

/** De opdracht moet door de database worden geweigerd. */
export async function assertDenied(promise, message) {
  await assert.rejects(promise, (error) => {
    assert.ok(['42501', '23514'].includes(error.code), `${message ?? 'verwacht: geweigerd'} (kreeg ${error.code}: ${error.message})`);
    return true;
  }, message);
}
