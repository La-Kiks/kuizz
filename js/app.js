import { parseRoute } from './router.js';
import { LoadError, findQuizEntry, loadIndex, loadQuiz } from './quiz-loader.js';
import { createStorage } from './storage.js';
import { renderHome } from './render/home.js';
import { renderQuizStart } from './render/quiz-start.js';
import { renderMessage } from './render/message.js';

const app = document.getElementById('app');
const storage = createStorage();
let routeToken = 0;

function show(title, render) {
  document.title = `${title} · Kuizz`;
  app.replaceChildren();
  render(app);
  window.scrollTo(0, 0);
  (app.querySelector('[data-autofocus]') ?? app).focus();
}

function progressOf(quiz) {
  return storage.getProgress(quiz.id, quiz.questions.map((q) => q.id));
}

async function showHome(isCurrent) {
  const index = await loadIndex();
  const entries = index.subjects.flatMap((s) => s.quizzes);
  const settled = await Promise.allSettled(entries.map((entry) => loadQuiz(entry)));
  if (!isCurrent()) return;
  const quizzes = new Map(entries.map((entry, i) => [
    entry.id,
    settled[i].status === 'fulfilled' ? { quiz: settled[i].value } : { error: settled[i].reason },
  ]));
  show('Mes révisions', (c) => renderHome(c, { index, quizzes, getProgress: progressOf }));
}

async function showQuizRoute(route, isCurrent) {
  const found = await findQuizEntry(route.quizId);
  if (!isCurrent()) return;
  if (!found) {
    show('Quiz introuvable', (c) => renderMessage(c, {
      title: 'Quiz introuvable',
      text: 'Ce quiz n\'existe pas ou a été retiré.',
    }));
    return;
  }
  const quiz = await loadQuiz(found.entry);
  if (!isCurrent()) return;
  const progress = progressOf(quiz);

  if (route.name === 'start') {
    show(quiz.title, (c) => renderQuizStart(c, {
      quiz, subject: found.subject, progress, storageAvailable: storage.available,
    }));
  }
}

async function handleRoute() {
  const token = ++routeToken;
  const isCurrent = () => token === routeToken;
  const route = parseRoute(location.hash);
  try {
    if (route.name === 'home') await showHome(isCurrent);
    else if (route.name === 'notfound') {
      show('Page introuvable', (c) => renderMessage(c, {
        title: 'Page introuvable',
        text: 'Cette adresse ne correspond à aucune page de Kuizz.',
      }));
    } else await showQuizRoute(route, isCurrent);
  } catch (err) {
    if (!isCurrent()) return;
    console.error(err);
    show('Erreur', (c) => renderMessage(c, {
      title: 'Le chargement a échoué',
      text: err instanceof LoadError ? err.message : 'Une erreur inattendue est survenue.',
    }));
  }
}

document.querySelector('.skip-link').addEventListener('click', (event) => {
  event.preventDefault();
  app.focus();
});
window.addEventListener('hashchange', handleRoute);
handleRoute();
