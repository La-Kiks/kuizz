import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQuiz, validateIndex } from '../js/quiz-schema.js';

function validQuiz() {
  return {
    id: 'demo',
    title: 'Démo',
    subject: 'frontend',
    description: 'Un quiz',
    questions: [
      { id: 'q1', type: 'mcq', question: 'A ?', choices: ['a', 'b'], answer: 1, explanation: 'b',
        code: { lang: 'html', content: '<p>x</p>' } },
      { id: 'q2', type: 'truefalse', question: 'B ?', answer: false },
      { id: 'q3', type: 'flashcard', front: 'C', back: 'D' },
    ],
  };
}

test('un quiz valide ne produit aucune erreur', () => {
  assert.deepEqual(validateQuiz(validQuiz()), []);
});

test('champs de quiz obligatoires', () => {
  const quiz = validQuiz();
  delete quiz.title;
  quiz.subject = '';
  const errors = validateQuiz(quiz);
  assert.ok(errors.some((e) => e.includes('"title"')));
  assert.ok(errors.some((e) => e.includes('"subject"')));
});

test('questions vides ou absentes', () => {
  assert.ok(validateQuiz({ ...validQuiz(), questions: [] }).some((e) => e.includes('"questions"')));
  assert.deepEqual(validateQuiz(null), ['le quiz doit être un objet']);
});

test('id de question en double', () => {
  const quiz = validQuiz();
  quiz.questions[1].id = 'q1';
  assert.ok(validateQuiz(quiz).some((e) => e.includes('en double')));
});

test('type inconnu', () => {
  const quiz = validQuiz();
  quiz.questions[0].type = 'open';
  assert.ok(validateQuiz(quiz).some((e) => e.includes('type "open" inconnu')));
});

test('QCM : answer hors limites, choix invalides, choix en double', () => {
  const q = validQuiz();
  q.questions[0].answer = 2;
  assert.ok(validateQuiz(q).some((e) => e.includes('"answer" hors limites')));
  q.questions[0].answer = 0;
  q.questions[0].choices = ['seul'];
  assert.ok(validateQuiz(q).some((e) => e.includes('"choices"')));
  q.questions[0].choices = ['a', 'a'];
  assert.ok(validateQuiz(q).some((e) => e.includes('choix en double')));
});

test('Vrai/Faux : answer doit être booléen', () => {
  const q = validQuiz();
  q.questions[1].answer = 'false';
  assert.ok(validateQuiz(q).some((e) => e.includes('true ou false')));
});

test('Flashcard : front et back requis', () => {
  const q = validQuiz();
  delete q.questions[2].back;
  assert.ok(validateQuiz(q).some((e) => e.includes('"back"')));
});

test('code sans contenu', () => {
  const q = validQuiz();
  q.questions[0].code = { lang: 'html' };
  assert.ok(validateQuiz(q).some((e) => e.includes('"code.content"')));
});

test('question manquante sur un QCM', () => {
  const q = validQuiz();
  delete q.questions[0].question;
  assert.ok(validateQuiz(q).some((e) => e.includes('"question"')));
});

function validIndex() {
  return { subjects: [{ id: 'frontend', title: 'Frontend', quizzes: [{ id: 'demo', file: 'frontend/demo.json' }] }] };
}

test('index valide', () => {
  assert.deepEqual(validateIndex(validIndex()), []);
});

test('index : subjects absent', () => {
  assert.deepEqual(validateIndex({}), ['"subjects" doit être un tableau']);
});

test('index : ids de quiz en double entre matières', () => {
  const index = validIndex();
  index.subjects.push({ id: 'back', title: 'Back', quizzes: [{ id: 'demo', file: 'back/demo.json' }] });
  assert.ok(validateIndex(index).some((e) => e.includes('id "demo" en double')));
});

test('index : chemin de fichier invalide', () => {
  const index = validIndex();
  index.subjects[0].quizzes[0].file = '../secret.json';
  assert.ok(validateIndex(index).some((e) => e.includes('chemin')));
});

test('index : "file" avec ":" ou "\\" refusé', () => {
  for (const file of ['https://x.test/a.json', 'C:/a.json', 'frontend\\a.json']) {
    const index = validIndex();
    index.subjects[0].quizzes[0].file = file;
    assert.ok(validateIndex(index).some((e) => e.includes('chemin')), file);
  }
});
