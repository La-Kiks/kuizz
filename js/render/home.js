import { el } from './dom.js';
import { formatPercent } from './text.js';
import { quizPath } from '../router.js';

function quizCard(entry, loaded, getProgress) {
  if (!loaded || loaded.error) {
    return el('li', { class: 'quiz-card is-unavailable' },
      el('h3', { class: 'quiz-card-title' }, entry.id),
      el('p', { class: 'quiz-card-desc' }, 'Ce quiz est momentanément indisponible.'));
  }
  const { quiz } = loaded;
  const progress = getProgress(quiz);
  const meta = [`${quiz.questions.length} questions`];
  if (progress.bestScore !== null) meta.push(`meilleur score ${formatPercent(progress.bestScore)}`);
  return el('li', { class: 'quiz-card' },
    el('h3', { class: 'quiz-card-title' },
      el('a', { class: 'quiz-card-link', href: quizPath(quiz.id) }, quiz.title)),
    quiz.description ? el('p', { class: 'quiz-card-desc' }, quiz.description) : null,
    el('p', { class: 'quiz-card-meta' }, meta.join(' · ')),
    progress.toReview.length
      ? el('p', { class: 'badge badge-review' }, `${progress.toReview.length} à revoir`)
      : null);
}

export function renderHome(container, { index, quizzes, getProgress }) {
  container.append(el('h1', { class: 'page-title', tabindex: '-1', 'data-autofocus': true }, 'Mes révisions'));
  for (const subject of index.subjects) {
    const headingId = `subject-${subject.id}`;
    container.append(el('section', { class: 'subject', 'aria-labelledby': headingId },
      el('h2', { id: headingId, class: 'subject-title' }, subject.title),
      el('ul', { class: 'quiz-list' },
        subject.quizzes.map((entry) => quizCard(entry, quizzes.get(entry.id), getProgress)))));
  }
}
