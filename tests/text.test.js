import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeInline, formatPercent } from '../js/render/text.js';

test('texte sans code', () => {
  assert.deepEqual(tokenizeInline('Bonjour'), [{ type: 'text', value: 'Bonjour' }]);
  assert.deepEqual(tokenizeInline(''), []);
});

test('code inline au milieu, au début et à la fin', () => {
  assert.deepEqual(tokenizeInline('La balise `<nav>` sert à `naviguer`'), [
    { type: 'text', value: 'La balise ' },
    { type: 'code', value: '<nav>' },
    { type: 'text', value: ' sert à ' },
    { type: 'code', value: 'naviguer' },
  ]);
  assert.deepEqual(tokenizeInline('`fetch()` renvoie une Promise'), [
    { type: 'code', value: 'fetch()' },
    { type: 'text', value: ' renvoie une Promise' },
  ]);
});

test('backtick isolé laissé tel quel', () => {
  assert.deepEqual(tokenizeInline('a `b'), [{ type: 'text', value: 'a `b' }]);
  assert.deepEqual(tokenizeInline('``'), [{ type: 'text', value: '``' }]);
});

test('formatPercent arrondit et utilise une espace fine insécable', () => {
  assert.equal(formatPercent(0.856), '86 %');
  assert.equal(formatPercent(0), '0 %');
  assert.equal(formatPercent(1), '100 %');
});
