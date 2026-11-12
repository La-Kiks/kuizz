import { el } from './dom.js';
import { formatPercent } from './text.js';
import { quizPath } from '../router.js';

export function renderQuizStart(container, { quiz, subject, progress, storageAvailable, resume }) {
  const toReview = progress.toReview.length;
  const stats = [`${quiz.questions.length} questions`];
  if (progress.bestScore !== null) stats.push(`meilleur score ${formatPercent(progress.bestScore)}`);
  if (toReview) stats.push(`${toReview} à revoir`);

  container.append(el('section', { class: 'quiz-start' },
    el('a', { class: 'back-link', href: '#/' }, el('span', { 'aria-hidden': 'true' }, '← '), 'Toutes les révisions'),
    el('p', { class: 'eyebrow' }, subject.title),
    el('h1', { class: 'page-title', tabindex: '-1', 'data-autofocus': true }, quiz.title),
    quiz.description ? el('p', { class: 'lead' }, quiz.description) : null,
    el('p', { class: 'quiz-stats' }, stats.join(' · ')),
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
