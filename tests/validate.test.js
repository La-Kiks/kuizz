import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { validateAll } from '../tools/validate.js';

async function makeDir(files) {
  const dir = await mkdtemp(join(tmpdir(), 'kuizz-'));
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return dir;
}

const index = { subjects: [{ id: 'frontend', title: 'Frontend', quizzes: [{ id: 'demo', file: 'frontend/demo.json' }] }] };
const quiz = { id: 'demo', title: 'Démo', subject: 'frontend', questions: [{ id: 'q1', type: 'truefalse', question: 'A ?', answer: true }] };

test('dossier valide', async () => {
  const dir = await makeDir({ 'index.json': index, 'frontend/demo.json': quiz });
  assert.deepEqual(await validateAll(dir), []);
});

test('index.json absent', async () => {
  const dir = await makeDir({});
  const errors = await validateAll(dir);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^index\.json/);
});

test('fichier référencé absent', async () => {
  const dir = await makeDir({ 'index.json': index });
  assert.match((await validateAll(dir))[0], /^frontend\/demo\.json/);
});

test('JSON mal formé', async () => {
  const dir = await makeDir({ 'index.json': index, 'frontend/demo.json': '{ oups' });
  assert.match((await validateAll(dir))[0], /^frontend\/demo\.json/);
});

test('id ou matière incohérents avec index.json', async () => {
  const dir = await makeDir({ 'index.json': index, 'frontend/demo.json': { ...quiz, id: 'autre', subject: 'back' } });
  const errors = await validateAll(dir);
  assert.ok(errors.some((e) => e.includes('"autre"')));
  assert.ok(errors.some((e) => e.includes('"back"')));
});

test('erreurs de schéma préfixées par le fichier', async () => {
  const dir = await makeDir({ 'index.json': index, 'frontend/demo.json': { ...quiz, questions: [] } });
  assert.ok((await validateAll(dir)).some((e) => e.startsWith('frontend/demo.json : "questions"')));
});

test('fichier de quiz orphelin', async () => {
  const dir = await makeDir({ 'index.json': index, 'frontend/demo.json': quiz, 'frontend/oubli.json': quiz });
  assert.deepEqual(await validateAll(dir), ['frontend/oubli.json : fichier non référencé dans index.json']);
});
