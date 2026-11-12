import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, quizPath } from '../js/router.js';

test('accueil', () => {
  for (const hash of ['', '#', '#/']) assert.deepEqual(parseRoute(hash), { name: 'home' });
});

test('lancement, session, résultats', () => {
  assert.deepEqual(parseRoute('#/quiz/frontend-html'), { name: 'start', quizId: 'frontend-html' });
  assert.deepEqual(parseRoute('#/quiz/frontend-html/play'), { name: 'session', quizId: 'frontend-html', mode: 'all' });
  assert.deepEqual(parseRoute('#/quiz/frontend-html/review'), { name: 'session', quizId: 'frontend-html', mode: 'review' });
  assert.deepEqual(parseRoute('#/quiz/frontend-html/results'), { name: 'results', quizId: 'frontend-html' });
});

test('routes inconnues ou mal formées', () => {
  for (const hash of ['#/quiz', '#/quiz/x/autre', '#/autre', '#app', '#/quiz/%E0%A4%A']) {
    assert.deepEqual(parseRoute(hash), { name: 'notfound' }, hash);
  }
});

test('quizPath encode l\'id et s\'inverse avec parseRoute', () => {
  assert.equal(quizPath('frontend-html'), '#/quiz/frontend-html');
  assert.equal(quizPath('frontend-html', 'play'), '#/quiz/frontend-html/play');
  assert.deepEqual(parseRoute(quizPath('a b/c', 'results')), { name: 'results', quizId: 'a b/c' });
});
