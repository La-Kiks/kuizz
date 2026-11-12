import { readFile, readdir } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateIndex, validateQuiz } from '../js/quiz-schema.js';

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function validateAll(quizzesDir) {
  let index;
  try {
    index = await readJson(join(quizzesDir, 'index.json'));
  } catch (err) {
    return [`index.json : ${err.message}`];
  }
  const indexErrors = validateIndex(index);
  if (indexErrors.length) return indexErrors.map((e) => `index.json : ${e}`);

  const errors = [];
  const referenced = new Set();
  for (const subject of index.subjects) {
    for (const entry of subject.quizzes) {
      referenced.add(entry.file);
      let quiz;
      try {
        quiz = await readJson(join(quizzesDir, entry.file));
      } catch (err) {
        errors.push(`${entry.file} : ${err.message}`);
        continue;
      }
      for (const e of validateQuiz(quiz)) errors.push(`${entry.file} : ${e}`);
      if (quiz && quiz.id !== entry.id) {
        errors.push(`${entry.file} : id "${quiz.id}" différent de "${entry.id}" dans index.json`);
      }
      if (quiz && quiz.subject !== subject.id) {
        errors.push(`${entry.file} : matière "${quiz.subject}" différente de "${subject.id}" dans index.json`);
      }
    }
  }

  const files = (await readdir(quizzesDir, { recursive: true }))
    .map((p) => p.split(sep).join('/'))
    .filter((p) => p.endsWith('.json') && p !== 'index.json');
  for (const file of files.sort()) {
    if (!referenced.has(file)) errors.push(`${file} : fichier non référencé dans index.json`);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = fileURLToPath(new URL('../quizzes/', import.meta.url));
  const errors = await validateAll(dir);
  if (errors.length) {
    console.error(`✗ ${errors.length} erreur(s) :`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('✓ Tous les quiz sont valides.');
}
