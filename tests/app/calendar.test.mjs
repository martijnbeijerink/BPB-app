// Test van het maandrooster en de verdeling van afspraken (zie app/src/lib/calendar.ts).

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addMonths, isPastDay, localMoment, monthGrid, splitAppointments } from '../../app/src/lib/calendar.ts';

test('oktober 2026 begint op donderdag en heeft vijf weken', () => {
  const weeks = monthGrid(2026, 9);
  assert.equal(weeks.length, 5);
  assert.deepEqual(weeks[0], [null, null, null, 1, 2, 3, 4]);
  assert.deepEqual(weeks[4], [26, 27, 28, 29, 30, 31, null]);
  assert.ok(weeks.every((week) => week.length === 7));
});

test('een maand die op maandag begint, en een maand die op zondag begint', () => {
  assert.deepEqual(monthGrid(2026, 5)[0], [1, 2, 3, 4, 5, 6, 7], 'juni 2026 begint op maandag');
  assert.deepEqual(monthGrid(2026, 10)[0], [null, null, null, null, null, null, 1], 'november 2026 begint op zondag');
  assert.equal(monthGrid(2026, 10).length, 6);
});

test('februari: 28 dagen, en 29 in een schrikkeljaar', () => {
  assert.equal(monthGrid(2027, 1).flat().filter(Boolean).length, 28);
  assert.equal(monthGrid(2028, 1).flat().filter(Boolean).length, 29);
  assert.equal(monthGrid(2027, 1).length, 4, 'februari 2027 past precies in vier weken');
});

test('een maand verder en terug, over de jaargrens', () => {
  assert.deepEqual(addMonths(2026, 9, 1), { year: 2026, month: 10 });
  assert.deepEqual(addMonths(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(addMonths(2027, 0, -1), { year: 2026, month: 11 });
  assert.deepEqual(addMonths(2026, 9, 15), { year: 2028, month: 0 });
});

test('gisteren is voorbij, vandaag en morgen niet', () => {
  const now = new Date(2026, 9, 11, 23, 30);
  assert.equal(isPastDay(2026, 9, 10, now), true);
  assert.equal(isPastDay(2026, 9, 11, now), false);
  assert.equal(isPastDay(2026, 9, 12, now), false);
  assert.equal(isPastDay(2026, 8, 30, now), true);
});

test('het gekozen moment is de tijd op de klok van de telefoon', () => {
  const moment = localMoment(2026, 9, 20, 10, 15);
  assert.deepEqual([moment.getFullYear(), moment.getMonth(), moment.getDate(), moment.getHours(), moment.getMinutes()], [2026, 9, 20, 10, 15]);
});

test('komend: eerstvolgende bovenaan; geweest: laatste bovenaan', () => {
  const now = new Date(2026, 9, 11, 12, 0);
  const at = (day, hour) => ({ id: `${day}-${hour}`, starts_at: new Date(2026, 9, day, hour).toISOString() });
  const { coming, been } = splitAppointments([at(20, 10), at(1, 9), at(11, 13), at(11, 11), at(12, 9), at(5, 14)], now);
  assert.deepEqual(coming.map((item) => item.id), ['11-13', '12-9', '20-10']);
  assert.deepEqual(been.map((item) => item.id), ['11-11', '5-14', '1-9']);
});

test('zonder afspraken zijn beide lijsten leeg', () => {
  assert.deepEqual(splitAppointments([], new Date()), { coming: [], been: [] });
});
