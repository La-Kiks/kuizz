import { validateIndex, validateQuiz } from './quiz-schema.js';

const BASE = new URL('../quizzes/', import.meta.url);

export class LoadError extends Error {}

async function fetchJson(url) {
  let response;
  try {
    response = await fetch(url, { cache: 'no-cache' });
  } catch {
    throw new LoadError('Impossible de charger les quiz : vérifie ta connexion.');
  }
  if (!response.ok) {
    throw new LoadError(response.status === 404 ? 'Fichier de quiz introuvable.' : `Erreur du serveur (${response.status}).`);
  }
  try {
    return await response.json();
  } catch {
    throw new LoadError('Le fichier de quiz est mal formé.');
  }
}

let indexPromise = null;
const quizCache = new Map();

export function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetchJson(new URL('index.json', BASE)).then((index) => {
      const errors = validateIndex(index);
      if (errors.length) throw new LoadError(`La liste des quiz est invalide : ${errors[0]}`);
      return index;
    });
    indexPromise.catch(() => { indexPromise = null; });
  }
  return indexPromise;
}

export async function findQuizEntry(quizId) {
  const index = await loadIndex();
  for (const subject of index.subjects) {
    const entry = subject.quizzes.find((q) => q.id === quizId);
    if (entry) return { subject, entry };
  }
  return null;
}

export function loadQuiz(entry) {
  if (!quizCache.has(entry.id)) {
    const promise = fetchJson(new URL(entry.file, BASE)).then((quiz) => {
      const errors = validateQuiz(quiz);
      if (errors.length) throw new LoadError(`Ce quiz est invalide : ${errors[0]}`);
      return quiz;
    });
    promise.catch(() => quizCache.delete(entry.id));
    quizCache.set(entry.id, promise);
  }
  return quizCache.get(entry.id);
}
