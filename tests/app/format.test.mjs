// Test van het weergeven van namen, datums en tijden (zie app/src/lib/format.ts).

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dayHeading, dayLabel, firstName, initials, sameDay, timeLabel } from '../../app/src/lib/format.ts';

// Tijden in de tijdzone van de computer.
const local = (year, month, day, hour = 12, minute = 0) => new Date(year, month - 1, day, hour, minute);
const now = local(2026, 10, 10, 9, 30); // zaterdag 10 oktober 2026

test('korte dag: vandaag, gisteren, daarna de datum', () => {
  assert.equal(dayLabel(local(2026, 10, 10, 0, 5).toISOString(), now), 'Vandaag');
  assert.equal(dayLabel(local(2026, 10, 9, 23, 55).toISOString(), now), 'Gisteren');
  assert.equal(dayLabel(local(2026, 10, 8).toISOString(), now), '8 okt');
  assert.equal(dayLabel(local(2026, 3, 1).toISOString(), now), '1 mrt');
});

test('korte dag: een ander jaar staat erbij', () => {
  assert.equal(dayLabel(local(2025, 12, 31).toISOString(), now), '31 dec 2025');
});

test('dagkop in een gesprek: weekdag en maand voluit', () => {
  assert.equal(dayHeading(local(2026, 10, 10).toISOString(), now), 'Vandaag');
  assert.equal(dayHeading(local(2026, 10, 9).toISOString(), now), 'Gisteren');
  assert.equal(dayHeading(local(2026, 10, 8).toISOString(), now), 'Donderdag 8 oktober');
});

test('tijd met voorloopnullen', () => {
  assert.equal(timeLabel(local(2026, 10, 10, 9, 5).toISOString()), '09:05');
  assert.equal(timeLabel(local(2026, 10, 10, 17, 40).toISOString()), '17:40');
});

test('zelfde dag', () => {
  assert.equal(sameDay(local(2026, 10, 10, 0, 1).toISOString(), local(2026, 10, 10, 23, 59).toISOString()), true);
  assert.equal(sameDay(local(2026, 10, 10, 23, 59).toISOString(), local(2026, 10, 11, 0, 1).toISOString()), false);
});

test('voornaam en initialen', () => {
  assert.equal(firstName('Anouk V.'), 'Anouk');
  assert.equal(firstName('  Marjolijn '), 'Marjolijn');
  assert.equal(initials('Anouk V.'), 'AV');
  assert.equal(initials('Marjolijn'), 'M');
  assert.equal(initials('Bram de Vries'), 'BD');
  assert.equal(initials(''), '?');
});
