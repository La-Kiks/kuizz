import { announce, el } from './dom.js';
import { reviewHead } from './mcq.js';
import { renderCodeBlock, renderInline } from './text.js';

export function renderFlashcard(question, onAnswer) {
  const actions = el('div', { class: 'actions' });
  const feedbackSlot = el('div', { class: 'feedback-slot' });
  const back = el('div', { class: 'flashcard-face flashcard-back', hidden: true, tabindex: '-1' },
    el('p', { class: 'flashcard-label' }, 'Réponse'),
    el('p', { class: 'flashcard-text' }, renderInline(question.back)));

  const view = el('div', { class: 'question question-flashcard' },
    el('div', { class: 'flashcard' },
      el('div', { class: 'flashcard-face flashcard-front' },
        el('p', { class: 'flashcard-label' }, 'Question'),
        el('h2', { class: 'question-text', tabindex: '-1', 'data-autofocus': true }, renderInline(question.front)),
        question.code ? renderCodeBlock(question.code) : null),
      back),
    actions,
    feedbackSlot);

  function grade(knewIt) {
    const { nextButton } = onAnswer(knewIt);
    actions.replaceChildren();
    view.classList.add('is-answered');
    feedbackSlot.append(el('div', { class: 'feedback is-neutral' },
      reviewHead(knewIt ? 'ok' : 'neutral', knewIt ? 'check' : 'dot', knewIt ? 'auto-évaluation : acquis' : 'auto-évaluation : à revoir'),
      el('div', { class: 'feedback-content' },
        el('p', { class: 'feedback-title' }, knewIt ? 'Noté : tu savais.' : 'Noté : à revoir.'),
        nextButton)));
    announce(knewIt ? 'Noté : tu savais.' : 'Noté : carte à revoir.');
    nextButton.focus();
  }

  function reveal() {
    back.hidden = false;
    actions.replaceChildren(
      el('p', { class: 'actions-hint' }, 'Tu savais ?'),
      el('button', { type: 'button', class: 'btn btn-primary', onclick: () => grade(true) }, 'Je savais'),
      el('button', { type: 'button', class: 'btn btn-secondary', onclick: () => grade(false) }, 'À revoir'));
    back.focus();
  }

  actions.append(el('button', { type: 'button', class: 'btn btn-primary', onclick: reveal }, 'Retourner la carte'));
  return view;
}
