import { el, icon, pill } from './dom.js';
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

/** Bande d'en-tête de la boîte de fusion : l'état du quiz en une ligne mono. */
function mergeHead(progress, resume) {
  let mark = 'ring';
  let text = 'prêt à lancer';
  if (resume) {
    mark = 'dot';
    text = 'reprise possible';
  } else if (progress.toReview.length) {
    mark = 'cross';
    text = `${progress.toReview.length} check${progress.toReview.length > 1 ? 's' : ''} à relancer`;
  } else if (progress.bestScore !== null) {
    mark = 'check';
    text = `tous les checks passent · meilleur ${formatPercent(progress.bestScore)}`;
  }
  return el('p', { class: `merge-head is-${mark}` }, icon(mark), el('span', {}, text));
}

export function renderQuizStart(container, { quiz, subject, progress, storageAvailable, resume }) {
  const toReview = progress.toReview.length;
  const stats = [el('li', {}, pill('count', null, `${quiz.questions.length} questions`))];
  if (progress.bestScore !== null) stats.push(el('li', {}, pill('ok', 'check', `meilleur score ${formatPercent(progress.bestScore)}`)));
  if (toReview) stats.push(el('li', {}, pill('review', 'cross', `${toReview} à revoir`)));

  container.append(el('section', { class: 'quiz-start' },
    el('a', { class: 'back-link', href: '#/' },
      el('span', { 'aria-hidden': 'true' }, '←'),
      el('span', {}, 'Mes révisions'),
      el('span', { class: 'crumb-sep', 'aria-hidden': 'true' }, '/'),
      el('span', { class: 'crumb-path' }, `${subject.id}/`)),
    el('h1', { class: 'page-title', tabindex: '-1', 'data-autofocus': true }, quiz.title),
    quiz.description ? el('p', { class: 'lead' }, quiz.description) : null,
    el('ul', { class: 'quiz-stats', 'aria-label': 'État du quiz' }, stats),
    el('p', { class: 'quiz-composition' }, typeBreakdown(quiz.questions)),
    el('div', { class: 'merge-box' },
      mergeHead(progress, resume),
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
          : el('button', { class: 'btn btn-secondary', type: 'button', disabled: true }, 'Aucune erreur à revoir'))),
    storageAvailable
      ? null
      : el('p', { class: 'notice' }, 'Ton navigateur bloque la sauvegarde : ta progression ne sera pas conservée.')));
}
