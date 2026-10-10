// Test van het filteren van de bibliotheek (zie app/src/lib/library.ts).

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { filterLibrary } from '../../app/src/lib/library.ts';

const items = [
  { id: '1', title: 'Ademhalingsoefening voor rustmomenten', description: '', theme: 'ontspannen', kind: 'video' },
  { id: '2', title: 'Wat doet stress met je brein?', description: '', theme: 'brein', kind: 'video' },
  { id: '3', title: 'Slaaproutine in vijf stappen', description: '', theme: 'ontspannen', kind: 'document' },
];
const ids = (list) => list.map((item) => item.id);

test('zonder thema en zoekterm blijft alles staan', () => {
  assert.deepEqual(ids(filterLibrary(items, null, '')), ['1', '2', '3']);
  assert.deepEqual(ids(filterLibrary(items, null, '   ')), ['1', '2', '3']);
});
test('filteren op thema', () => {
  assert.deepEqual(ids(filterLibrary(items, 'ontspannen', '')), ['1', '3']);
  assert.deepEqual(ids(filterLibrary(items, 'voeding', '')), []);
});
test('zoeken op titel let niet op hoofdletters', () => {
  assert.deepEqual(ids(filterLibrary(items, null, 'STRESS')), ['2']);
  assert.deepEqual(ids(filterLibrary(items, null, ' slaap ')), ['3']);
});
test('thema en zoekterm samen', () => {
  assert.deepEqual(ids(filterLibrary(items, 'ontspannen', 'adem')), ['1']);
  assert.deepEqual(ids(filterLibrary(items, 'brein', 'adem')), []);
});
