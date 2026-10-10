// Test van de opbouw van gesprekken (zie app/src/lib/conversation.ts).

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { chatRows, mergeMessages, sortConversations } from '../../app/src/lib/conversation.ts';

// Tijden in de tijdzone van de computer, zodat de dagwissel overal klopt.
const at = (day, hour, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();
const message = (id, day, hour, sender = 'a') => ({ id, sender_id: sender, body: `bericht ${id}`, created_at: at(day, hour) });

test('een gesprek krijgt één dagkop per dag, boven het eerste bericht van die dag', () => {
  const rows = chatRows([message('1', 8, 9), message('2', 8, 15), message('3', 9, 8)]);
  assert.deepEqual(
    rows.map((row) => (row.type === 'day' ? 'dag' : row.message.id)),
    ['dag', '1', '2', 'dag', '3'],
  );
  assert.equal(rows[0].at, at(8, 9));
  assert.equal(new Set(rows.map((row) => row.key)).size, rows.length, 'elke rij heeft een eigen sleutel');
});

test('een leeg gesprek heeft geen rijen', () => {
  assert.deepEqual(chatRows([]), []);
});

test('berichten samenvoegen: geen dubbelen, oudste eerst', () => {
  const known = [message('1', 8, 9), message('3', 9, 8)];
  const merged = mergeMessages(known, [message('2', 8, 15), message('3', 9, 8), message('4', 9, 10)]);
  assert.deepEqual(merged.map((item) => item.id), ['1', '2', '3', '4']);
  assert.equal(known.length, 2, 'de oude lijst blijft ongemoeid');
});

test('hetzelfde bericht dat live en als antwoord binnenkomt, staat er één keer', () => {
  const sent = message('1', 8, 9);
  assert.equal(mergeMessages(mergeMessages([], [sent]), [{ ...sent }]).length, 1);
});

test('gesprekken: nieuwste bericht bovenaan, zonder berichten onderaan in de oude volgorde', () => {
  const list = [
    { name: 'leeg-1', last_message_at: null },
    { name: 'oud', last_message_at: at(7, 9) },
    { name: 'leeg-2', last_message_at: null },
    { name: 'nieuw', last_message_at: at(9, 9) },
  ];
  assert.deepEqual(sortConversations(list).map((item) => item.name), ['nieuw', 'oud', 'leeg-1', 'leeg-2']);
  assert.equal(list[0].name, 'leeg-1', 'de oude lijst blijft ongemoeid');
});
