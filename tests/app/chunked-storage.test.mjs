// Test van de opslag van de inlogsessie in stukken (zie
// app/src/lib/chunked-storage.ts). De beveiligde opslag van een telefoon
// bewaart per sleutel maar ongeveer 2 kB.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { chunked } from '../../app/src/lib/chunked-storage.ts';

function memoryStore(limit = 2048) {
  const data = new Map();
  return {
    data,
    async getItem(key) { return data.has(key) ? data.get(key) : null; },
    async setItem(key, value) {
      assert.ok(Buffer.byteLength(value, 'utf8') <= limit, `waarde voor ${key} is groter dan ${limit} bytes`);
      data.set(key, value);
    },
    async removeItem(key) { data.delete(key); },
  };
}

test('een grote sessie komt ongeschonden terug', async () => {
  const backend = memoryStore();
  const store = chunked(backend);
  const session = JSON.stringify({ token: 'x'.repeat(6000), naam: 'Zoë Çelik – cliënt' });
  await store.setItem('sessie', session);
  assert.equal(await store.getItem('sessie'), session);
  assert.ok(backend.data.size > 3, 'verwacht meerdere stukken');
});

test('tekens buiten ASCII passen binnen de limiet per stuk', async () => {
  const store = chunked(memoryStore());
  const value = 'ë€漢'.repeat(3000);
  await store.setItem('sessie', value);
  assert.equal(await store.getItem('sessie'), value);
});

test('een kortere waarde ruimt de oude stukken op', async () => {
  const backend = memoryStore();
  const store = chunked(backend);
  await store.setItem('sessie', 'a'.repeat(9000));
  await store.setItem('sessie', 'kort');
  assert.equal(await store.getItem('sessie'), 'kort');
  assert.deepEqual([...backend.data.keys()].sort(), ['sessie', 'sessie.0']);
});

test('verwijderen haalt alles weg', async () => {
  const backend = memoryStore();
  const store = chunked(backend);
  await store.setItem('sessie', 'a'.repeat(9000));
  await store.removeItem('sessie');
  assert.equal(await store.getItem('sessie'), null);
  assert.equal(backend.data.size, 0);
});

test('een onvolledige of ontbrekende sessie telt als niet ingelogd', async () => {
  const backend = memoryStore();
  const store = chunked(backend);
  assert.equal(await store.getItem('sessie'), null);
  await store.setItem('sessie', 'a'.repeat(9000));
  backend.data.delete('sessie.1');
  assert.equal(await store.getItem('sessie'), null);
});
