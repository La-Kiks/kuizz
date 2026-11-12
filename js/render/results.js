import { el, icon } from './dom.js';
import { formatPercent, renderCodeBlock, renderInline } from './text.js';
import { correctAnswerText, missedQuestions, score } from '../quiz-engine.js';
import { quizPath } from '../router.js';

function scoreMessage(ratio) {
  if (ratio === 1) return 'Sans faute !';
  if (ratio >= 0.8) return 'Très bien, il reste quelques détails.';
  if (ratio >= 0.5) return 'Pas mal : revois tes erreurs pour consolider.';
  return 'Il y a du travail : commence par revoir tes erreurs.';
}

function missedSection(missed) {
  return el('section', { class: 'missed', 'aria-labelledby': 'missed-title' },
    el('h2', { id: 'missed-title' }, `À retravailler (${missed.length})`),
    el('ol', { class: 'missed-list' }, missed.map((q) => el('li', { class: 'missed-item' },
      el('p', { class: 'missed-question' },
        el('span', { class: 'missed-mark', 'aria-hidden': 'true' }, icon('cross')),
        el('span', {}, renderInline(q.type === 'flashcard' ? q.front : q.question))),
      el('div', { class: 'missed-body' },
        q.code ? renderCodeBlock(q.code) : null,
        el('p', { class: 'missed-answer' },
          el('span', { class: 'diff-sign', 'aria-hidden': 'true' }, '+'),
          el('span', {}, el('strong', {}, 'Réponse : '), renderInline(correctAnswerText(q)))),
        q.explanation ? el('p', { class: 'missed-explanation' }, renderInline(q.explanation)) : null)))));
}

export function renderResults(container, { quiz, session, progress }) {
  const s = score(session);
  const missed = missedQuestions(session);
  const toReview = progress.toReview.length;
  const failed = s.total - s.correct;

  container.append(el('section', { class: 'results' },
    el('a', { class: 'back-link', href: quizPath(quiz.id) }, el('span', { 'aria-hidden': 'true' }, '←'), quiz.title),
    el('h1', { class: 'page-title', tabindex: '-1', 'data-autofocus': true },
      session.mode === 'review' ? 'Révision terminée' : 'Quiz terminé'),
    el('div', { class: `run-summary ${failed ? 'has-failures' : 'is-green'}` },
      el('p', { class: 'score' },
        el('span', { class: 'score-value' }, `${s.correct} / ${s.total}`),
        ' ',
        el('span', { class: 'score-percent' }, `(${formatPercent(s.ratio)})`)),
      el('p', { class: 'run-checks' },
        el('span', { class: 'run-ok' }, icon('check'), `${s.correct} réussi${s.correct > 1 ? 's' : ''}`),
        el('span', { class: 'run-sep', 'aria-hidden': 'true' }, ' · '),
        el('span', { class: 'run-ko' }, icon('cross'), `${failed} échoué${failed > 1 ? 's' : ''}`)),
      el('p', { class: 'score-message' }, scoreMessage(s.ratio)),
      session.mode === 'all' && progress.bestScore !== null
        ? el('p', { class: 'quiz-stats' }, `Meilleur score : ${formatPercent(progress.bestScore)}`)
        : null),
    el('div', { class: 'actions' },
      toReview ? el('a', { class: 'btn btn-primary', href: quizPath(quiz.id, 'review') }, `Revoir mes erreurs (${toReview})`) : null,
      el('a', { class: toReview ? 'btn btn-secondary' : 'btn btn-primary', href: quizPath(quiz.id, 'play') }, 'Recommencer le quiz'),
      el('a', { class: 'btn btn-ghost', href: '#/' }, 'Accueil')),
    missed.length
      ? missedSection(missed)
      : el('p', { class: 'all-good' }, icon('check'), 'Aucune erreur sur cette session, bravo !')));
}
