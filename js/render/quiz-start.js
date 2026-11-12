import { el, pill } from './dom.js';
import { formatPercent } from './text.js';
import { quizPath } from '../router.js';

const TYPE_LABELS = { mcq: 'QCM', truefalse: 'Vrai/Faux', flashcard: 'flashcards' };

function typeBreakdown(questions) {
  const counts = new Map();
  for (const q of questions) counts.set(q.type, (counts.get(q.type) ?? 0) + 1);
  return ['mcq', 'truefalse', 'flashcard']
    .filter((t) => counts.has(t))
    .map((t) => `${counts.get(t)} ${TYPE_LABELS[t]}`)
    .join(' · ');
}

export function renderQuizStart(container, { quiz, subject, progress, storageAvailable, resume }) {
  const toReview = progress.toReview.length;
  const stats = [el('li', {}, pill('count', '#', `${quiz.questions.length} questions`))];
  if (progress.bestScore !== null) stats.push(el('li', {}, pill('ok', '✓', `meilleur score ${formatPercent(progress.bestScore)}`)));
  if (toReview) stats.push(el('li', {}, pill('review', '✗', `${toReview} à revoir`)));
  if (resume) stats.push(el('li', {}, pill('progress', '●', 'En cours')));

  container.append(el('section', { class: 'quiz-start' },
    el('a', { class: 'back-link', href: '#/' }, el('span', { 'aria-hidden': 'true' }, '← '), 'Toutes les révisions'),
    el('p', { class: 'eyebrow' },
      el('span', { class: 'eyebrow-slug', 'aria-hidden': 'true' }, `${subject.id}/`),
      el('span', {}, subject.title)),
    el('h1', { class: 'page-title', tabindex: '-1', 'data-autofocus': true }, quiz.title),
    quiz.description ? el('p', { class: 'lead' }, quiz.description) : null,
    el('ul', { class: 'quiz-stats', 'aria-label': 'État du quiz' }, stats),
    el('p', { class: 'quiz-composition' }, typeBreakdown(quiz.questions)),
    el('div', { class: 'actions' },
      resume
        ? el('a', { class: 'btn btn-primary', href: quizPath(quiz.id, 'resume') },
          resume.mode === 'review' ? 'Reprendre la révision' : 'Reprendre le quiz',
          el('span', { class: 'btn-hint' }, `question ${resume.position} sur ${resume.total}`))
        : null,
      el('a', { class: `btn ${resume ? 'btn-secondary' : 'btn-primary'}`, href: quizPath(quiz.id, 'play') },
        resume ? 'Recommencer le quiz' : 'Commencer le quiz'),
      toReview
        ? el('a', { class: 'btn btn-secondary', href: quizPath(quiz.id, 'review') }, `Revoir mes erreurs (${toReview})`)
        : el('button', { class: 'btn btn-secondary', type: 'button', disabled: true }, 'Aucune erreur à revoir')),
    storageAvailable
      ? null
      : el('p', { class: 'notice' }, 'Ton navigateur bloque la sauvegarde : ta progression ne sera pas conservée.')));
}
