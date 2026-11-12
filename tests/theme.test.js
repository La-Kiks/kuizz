import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextTheme, parseStoredTheme, resolveTheme } from '../js/theme.js';

test('parseStoredTheme : valeurs valides et invalides', () => {
  assert.equal(parseStoredTheme('light'), 'light');
  assert.equal(parseStoredTheme('dark'), 'dark');
  for (const bad of [null, undefined, '', 'auto', 'DARK', 1, {}]) assert.equal(parseStoredTheme(bad), null);
});

test('resolveTheme : le choix enregistré prime, sinon le système', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
  assert.equal(resolveTheme('bogus', true), 'dark');
});

test('nextTheme bascule', () => {
  assert.equal(nextTheme('light'), 'dark');
  assert.equal(nextTheme('dark'), 'light');
});
