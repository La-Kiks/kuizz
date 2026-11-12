import { el, icon, pill } from './dom.js';
import { formatPercent } from './text.js';
import { quizPath } from '../router.js';

/** État d'un quiz vu comme un check : sert à la gouttière et au cumul du module. */
function quizState(loaded, getProgress, isResumable) {
  if (!loaded || loaded.error) return { kind: 'unavailable', started: false, toReview: 0 };
  const { quiz } = loaded;
  const progress = getProgress(quiz);
  const resumable = isResumable(quiz);
  const toReview = progress.toReview.length;
  const started = resumable || toReview > 0 || progress.bestScore !== null;
  let kind = 'idle';
  if (toReview) kind = 'review';
  else if (resumable) kind = 'progress';
  else if (started) kind = 'ok';
  return { kind, started, toReview, resumable, progress, quiz };
}

const GUTTER_MARK = { review: 'cross', progress: 'dot', ok: 'check', idle: 'ring', unavailable: 'cross' };

function gutter(kind) {
  return el('span', { class: `quiz-card-gutter is-${kind}`, 'aria-hidden': 'true' }, icon(GUTTER_MARK[kind]));
}

function quizCard(entry, state) {
  if (state.kind === 'unavailable') {
    return el('li', { class: 'quiz-card is-unavailable' },
      gutter('unavailable'),
      el('div', { class: 'quiz-card-main' },
        el('h3', { class: 'quiz-card-title' }, entry.id),
        el('p', { class: 'quiz-card-desc' }, 'Ce quiz est momentanément indisponible.')));
  }
  const { quiz, progress, toReview, resumable, kind } = state;
  const meta = [el('span', { class: 'quiz-card-count' }, `${quiz.questions.length} questions`)];
  if (resumable) meta.push(pill('progress', 'dot', 'En cours'));
  if (toReview) meta.push(pill('review', 'cross', `${toReview} à revoir`));
  if (progress.bestScore !== null) meta.push(pill('ok', 'check', `meilleur ${formatPercent(progress.bestScore)}`));
  if (kind === 'idle') meta.push(el('span', { class: 'quiz-card-idle' }, 'pas encore lancé'));
  return el('li', { class: `quiz-card is-${kind}` },
    gutter(kind),
    el('div', { class: 'quiz-card-main' },
      el('h3', { class: 'quiz-card-title' },
        el('a', { class: 'quiz-card-link', href: quizPath(quiz.id) }, quiz.title)),
      quiz.description ? el('p', { class: 'quiz-card-desc' }, quiz.description) : null,
      el('p', { class: 'quiz-card-meta' }, meta)));
}

function rollup(states) {
  const started = states.filter((s) => s.started).length;
  const toReview = states.reduce((n, s) => n + s.toReview, 0);
  return el('p', { class: 'subject-count' },
    el('span', {}, `${started}/${states.length} lancé${started > 1 ? 's' : ''}`),
    toReview
      ? [el('span', { class: 'rollup-sep', 'aria-hidden': 'true' }, ' · '),
        el('span', { class: 'rollup-review' }, icon('cross'), `${toReview} à revoir`)]
      : null);
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
    const states = subject.quizzes.map((entry) => quizState(quizzes.get(entry.id), getProgress, isResumable));
    container.append(el('section', { class: 'subject', 'aria-labelledby': headingId },
      el('div', { class: 'subject-head' },
        el('h2', { id: headingId, class: 'subject-title' },
          el('span', { class: 'subject-slug', 'aria-hidden': 'true' }, `${subject.id}/`),
          el('span', { class: 'subject-name' }, subject.title)),
        rollup(states)),
      el('ul', { class: 'quiz-list' },
        subject.quizzes.map((entry, i) => quizCard(entry, states[i])))));
  }
}
