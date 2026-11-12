import { el, pill } from './dom.js';
import { formatPercent } from './text.js';
import { quizPath } from '../router.js';

function statusPills(progress, resumable) {
  const pills = [];
  if (resumable) pills.push(pill('progress', '●', 'En cours'));
  if (progress.toReview.length) pills.push(pill('review', '✗', `${progress.toReview.length} à revoir`));
  else if (progress.bestScore !== null) pills.push(pill('ok', '✓', 'À jour'));
  if (!pills.length) pills.push(pill('idle', '○', 'Pas encore lancé'));
  return pills;
}

function quizCard(entry, loaded, getProgress, isResumable) {
  if (!loaded || loaded.error) {
    return el('li', { class: 'quiz-card is-unavailable' },
      el('div', { class: 'quiz-card-main' },
        el('h3', { class: 'quiz-card-title' }, entry.id),
        el('p', { class: 'quiz-card-desc' }, 'Ce quiz est momentanément indisponible.')),
      el('p', { class: 'quiz-card-status' }, pill('review', '!', 'Indisponible')));
  }
  const { quiz } = loaded;
  const progress = getProgress(quiz);
  const meta = [`${quiz.questions.length} questions`];
  if (progress.bestScore !== null) meta.push(`meilleur ${formatPercent(progress.bestScore)}`);
  return el('li', { class: 'quiz-card' },
    el('div', { class: 'quiz-card-main' },
      el('h3', { class: 'quiz-card-title' },
        el('a', { class: 'quiz-card-link', href: quizPath(quiz.id) }, quiz.title)),
      quiz.description ? el('p', { class: 'quiz-card-desc' }, quiz.description) : null,
      el('p', { class: 'quiz-card-meta' }, meta.join(' · '))),
    el('p', { class: 'quiz-card-status' }, statusPills(progress, isResumable(quiz))));
}

export function renderHome(container, { index, quizzes, getProgress, isResumable }) {
  const quizCount = index.subjects.reduce((n, s) => n + s.quizzes.length, 0);
  const questionCount = [...quizzes.values()].reduce((n, l) => n + (l.quiz ? l.quiz.questions.length : 0), 0);
  container.append(
    el('div', { class: 'page-head' },
      el('h1', { class: 'page-title', tabindex: '-1', 'data-autofocus': true }, 'Mes révisions'),
      el('p', { class: 'page-sub' },
        `${index.subjects.length} modules · ${quizCount} quiz · ${questionCount} questions`)));
  for (const subject of index.subjects) {
    const headingId = `subject-${subject.id}`;
    container.append(el('section', { class: 'subject', 'aria-labelledby': headingId },
      el('div', { class: 'subject-head' },
        el('h2', { id: headingId, class: 'subject-title' },
          el('span', { class: 'subject-slug', 'aria-hidden': 'true' }, `${subject.id}/`),
          el('span', { class: 'subject-name' }, subject.title)),
        el('p', { class: 'subject-count' }, `${subject.quizzes.length} quiz`)),
      el('ul', { class: 'quiz-list' },
        subject.quizzes.map((entry) => quizCard(entry, quizzes.get(entry.id), getProgress, isResumable)))));
  }
}
