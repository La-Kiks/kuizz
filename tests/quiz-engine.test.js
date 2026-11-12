import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shuffle, createSession, currentQuestion, answerCurrent, next, isFinished,
  score, missedQuestions, updateToReview, nextProgress, progressAfterAnswer, correctAnswerText,
} from '../js/quiz-engine.js';

const quiz = {
  id: 'demo',
  title: 'Démo',
  subject: 'frontend',
  questions: [
    { id: 'q1', type: 'mcq', question: 'A ?', choices: ['a', 'b', 'c'], answer: 2, explanation: 'c' },
    { id: 'q2', type: 'truefalse', question: 'B ?', answer: false },
    { id: 'q3', type: 'flashcard', front: 'C', back: 'D' },
  ],
};

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function sessionInOrder(options = {}) {
  const session = createSession(quiz, { random: seeded(), ...options });
  session.questions.sort((a, b) => a.id.localeCompare(b.id));
  return session;
}

test('shuffle renvoie une permutation sans modifier l\'original', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input, seeded(42));
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5]);
});

test('createSession en mode all contient toutes les questions', () => {
  const s = createSession(quiz, { random: seeded() });
  assert.equal(s.mode, 'all');
  assert.equal(s.quizId, 'demo');
  assert.equal(s.current, 0);
  assert.deepEqual(s.results, []);
  assert.deepEqual(s.questions.map((q) => q.id).sort(), ['q1', 'q2', 'q3']);
});

test('createSession en mode review ne garde que les questions à revoir', () => {
  const s = createSession(quiz, { mode: 'review', toReview: ['q2', 'inconnue'], random: seeded() });
  assert.deepEqual(s.questions.map((q) => q.id), ['q2']);
});

test('les choix QCM mélangés gardent leur index d\'origine', () => {
  const s = createSession(quiz, { random: seeded(7) });
  const q = s.questions.find((x) => x.id === 'q1');
  assert.deepEqual(q.displayChoices.map((c) => c.text).sort(), ['a', 'b', 'c']);
  for (const c of q.displayChoices) assert.equal(q.choices[c.index], c.text);
  assert.equal(quiz.questions[0].displayChoices, undefined, 'le quiz source n\'est pas modifié');
});

test('déroulé complet : correction, score et erreurs', () => {
  const s = sessionInOrder();
  assert.equal(currentQuestion(s).id, 'q1');
  assert.equal(answerCurrent(s, 2), true);
  next(s);
  assert.equal(answerCurrent(s, true), false);
  next(s);
  assert.equal(answerCurrent(s, false), false);
  next(s);
  assert.equal(isFinished(s), true);
  assert.equal(currentQuestion(s), null);
  assert.deepEqual(score(s), { correct: 1, total: 3, ratio: 1 / 3 });
  assert.deepEqual(missedQuestions(s).map((q) => q.id), ['q2', 'q3']);
});

test('answerCurrent refuse une double réponse, next exige une réponse', () => {
  const s = sessionInOrder();
  assert.throws(() => next(s), /pas encore répondu/);
  answerCurrent(s, 0);
  assert.throws(() => answerCurrent(s, 1), /déjà répondu/);
});

test('answerCurrent sur une session terminée', () => {
  const s = createSession(quiz, { mode: 'review', toReview: [], random: seeded() });
  assert.equal(isFinished(s), true);
  assert.throws(() => answerCurrent(s, true), /terminée/);
});

test('score d\'une session vide', () => {
  const s = createSession(quiz, { mode: 'review', toReview: [] });
  assert.deepEqual(score(s), { correct: 0, total: 0, ratio: 0 });
});

test('updateToReview ajoute les ratées et retire les réussies', () => {
  const out = updateToReview(['q1', 'q9'], [{ id: 'q1', correct: true }, { id: 'q2', correct: false }]);
  assert.deepEqual([...out].sort(), ['q2', 'q9']);
});

test('nextProgress : meilleur score mis à jour en mode all', () => {
  const now = new Date('2026-11-12T10:00:00Z');
  const s = sessionInOrder();
  answerCurrent(s, 2); next(s);
  answerCurrent(s, false); next(s);
  answerCurrent(s, true); next(s);
  const prev = { bestScore: 0.5, lastPlayed: null, toReview: ['q2'] };
  assert.deepEqual(nextProgress(prev, s, now), {
    bestScore: 1, lastPlayed: '2026-11-12T10:00:00.000Z', toReview: [],
  });
});

test('nextProgress : meilleur score inchangé en mode review', () => {
  const now = new Date('2026-11-12T10:00:00Z');
  const r = createSession(quiz, { mode: 'review', toReview: ['q2'], random: seeded() });
  answerCurrent(r, true); next(r);
  const prev = { bestScore: 0.5, lastPlayed: null, toReview: ['q2'] };
  assert.deepEqual(nextProgress(prev, r, now), {
    bestScore: 0.5, lastPlayed: '2026-11-12T10:00:00.000Z', toReview: ['q2'],
  });
  assert.equal(nextProgress({ bestScore: null, lastPlayed: null, toReview: [] }, r, now).bestScore, null);
});

test('nextProgress : premier score enregistré même s\'il est bas', () => {
  const s = sessionInOrder();
  answerCurrent(s, 0); next(s);
  answerCurrent(s, true); next(s);
  answerCurrent(s, false); next(s);
  assert.equal(nextProgress({ bestScore: null, lastPlayed: null, toReview: [] }, s).bestScore, 0);
});

test('progressAfterAnswer : une erreur est ajoutée, le meilleur score est conservé', () => {
  const now = new Date('2026-11-12T10:00:00Z');
  const prev = { bestScore: 0.5, lastPlayed: null, toReview: ['q2'] };
  assert.deepEqual(progressAfterAnswer(prev, { id: 'q1', response: 0, correct: false }, now), {
    bestScore: 0.5, lastPlayed: '2026-11-12T10:00:00.000Z', toReview: ['q2', 'q1'],
  });
});

test('progressAfterAnswer : une bonne réponse retire la question à revoir', () => {
  const prev = { bestScore: null, lastPlayed: null, toReview: ['q1', 'q2'] };
  const out = progressAfterAnswer(prev, { id: 'q1', response: 2, correct: true });
  assert.deepEqual(out.toReview, ['q2']);
  assert.equal(out.bestScore, null);
  assert.equal(typeof out.lastPlayed, 'string');
});

test('sauvegardes intermédiaires puis finale : même résultat que la sauvegarde finale seule', () => {
  const s = sessionInOrder();
  let progress = { bestScore: null, lastPlayed: null, toReview: [] };
  for (const response of [0, false, false]) {
    answerCurrent(s, response);
    progress = progressAfterAnswer(progress, s.results.at(-1));
    next(s);
  }
  assert.deepEqual(progress.toReview, ['q1', 'q3']);
  const fromScratch = nextProgress({ bestScore: null, lastPlayed: null, toReview: [] }, s);
  assert.deepEqual(nextProgress(progress, s).toReview, fromScratch.toReview);
  assert.equal(nextProgress(progress, s).bestScore, fromScratch.bestScore);
});

test('correctAnswerText selon le type', () => {
  assert.equal(correctAnswerText(quiz.questions[0]), 'c');
  assert.equal(correctAnswerText(quiz.questions[1]), 'Faux');
  assert.equal(correctAnswerText({ type: 'truefalse', answer: true }), 'Vrai');
  assert.equal(correctAnswerText(quiz.questions[2]), 'D');
});

test('QCM : la correction utilise l’index d’origine, pas la position affichée', () => {
  const mcq = { id: 'm', title: 'M', subject: 'frontend', questions: [quiz.questions[0]] };
  const rightIndex = mcq.questions[0].answer;
  const build = () => createSession(mcq, { random: () => 0 });
  const session = build();
  const q = currentQuestion(session);
  const shownAt = q.displayChoices.findIndex((c) => c.index === rightIndex);
  assert.notEqual(q.displayChoices[0].index, 0);
  assert.notEqual(shownAt, rightIndex);
  assert.equal(answerCurrent(session, q.displayChoices[shownAt].index), true);
  const other = build();
  assert.equal(answerCurrent(other, shownAt), false);
});
