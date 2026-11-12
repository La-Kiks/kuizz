import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../js/storage.js';

const EMPTY = { bestScore: null, lastPlayed: null, toReview: [] };

function fakeBackend(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
  };
}

const progress = { bestScore: 0.75, lastPlayed: '2026-11-12T10:00:00.000Z', toReview: ['q1', 'q2'] };

test('progression vide par défaut', () => {
  const storage = createStorage(fakeBackend());
  assert.equal(storage.available, true);
  assert.deepEqual(storage.getProgress('demo'), EMPTY);
});

test('saveProgress puis getProgress', () => {
  const backend = fakeBackend();
  const storage = createStorage(backend);
  assert.equal(storage.saveProgress('demo', progress), true);
  assert.deepEqual(storage.getProgress('demo'), progress);
  assert.deepEqual(JSON.parse(backend.data.get('kuizz:v1')), { quizzes: { demo: progress } });
});

test('les autres quiz sont conservés', () => {
  const storage = createStorage(fakeBackend());
  storage.saveProgress('a', progress);
  storage.saveProgress('b', { ...progress, bestScore: 0.1 });
  assert.equal(storage.getProgress('a').bestScore, 0.75);
  assert.equal(storage.getProgress('b').bestScore, 0.1);
});

test('les ids obsolètes sont filtrés', () => {
  const storage = createStorage(fakeBackend());
  storage.saveProgress('demo', progress);
  assert.deepEqual(storage.getProgress('demo', ['q2', 'q3']).toReview, ['q2']);
});

test('données corrompues → progression vide', () => {
  const storage = createStorage(fakeBackend({ 'kuizz:v1': '{pas du json' }));
  assert.deepEqual(storage.getProgress('demo'), EMPTY);
  assert.equal(storage.saveProgress('demo', progress), true);
  assert.deepEqual(storage.getProgress('demo'), progress);
});

test('structure inattendue → valeurs nettoyées', () => {
  const raw = JSON.stringify({ quizzes: { demo: { bestScore: 'x', lastPlayed: 3, toReview: ['q1', 4] } } });
  const storage = createStorage(fakeBackend({ 'kuizz:v1': raw }));
  assert.deepEqual(storage.getProgress('demo'), { bestScore: null, lastPlayed: null, toReview: ['q1'] });
  const storage2 = createStorage(fakeBackend({ 'kuizz:v1': JSON.stringify({ quizzes: [] }) }));
  assert.deepEqual(storage2.getProgress('demo'), EMPTY);
});

test('stockage indisponible → repli en mémoire', () => {
  const storage = createStorage(null);
  assert.equal(storage.available, false);
  assert.deepEqual(storage.getProgress('demo'), EMPTY);
  assert.equal(storage.saveProgress('demo', progress), true);
  assert.deepEqual(storage.getProgress('demo'), progress);
});

test('setItem qui lève (quota plein) → saveProgress renvoie false', () => {
  const backend = fakeBackend();
  backend.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(createStorage(backend).saveProgress('demo', progress), false);
});

test('getItem qui lève → progression vide', () => {
  const backend = fakeBackend();
  backend.getItem = () => { throw new Error('SecurityError'); };
  assert.deepEqual(createStorage(backend).getProgress('demo'), EMPTY);
});
