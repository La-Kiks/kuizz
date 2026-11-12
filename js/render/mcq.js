import { announce, el } from './dom.js';
import { renderCodeBlock, renderInline } from './text.js';

function mark(symbol, text) {
  return el('span', { class: 'choice-mark' },
    el('span', { 'aria-hidden': 'true' }, symbol),
    el('span', { class: 'sr-only' }, ` (${text})`));
}

function plain(text) {
  return text.replaceAll('`', '');
}

/** Ligne de diff du commentaire de revue : gouttière +/− décorative, libellé explicite. */
function diffLine(kind, label, text) {
  return el('span', { class: `diff-line diff-${kind}` },
    el('span', { class: 'diff-sign', 'aria-hidden': 'true' }, kind === 'add' ? '+' : '−'),
    el('span', { class: 'diff-body' }, el('span', { class: 'diff-label' }, label), ' ', renderInline(text)));
}

/** Nœud sur le rail + en-tête du commentaire de revue (statut du check, en monospace). */
export function reviewHead(status, glyph, text) {
  return [
    el('span', { class: `review-node review-node-${status}`, 'aria-hidden': 'true' }, glyph),
    el('p', { class: 'feedback-head' },
      el('span', { class: 'feedback-who' }, 'Revue'),
      el('span', { class: 'feedback-status' }, text)),
  ];
}

export function renderChoiceQuestion(question, onAnswer) {
  const options = question.type === 'mcq'
    ? question.displayChoices.map((c) => ({ label: c.text, value: c.index }))
    : [{ label: 'Vrai', value: true }, { label: 'Faux', value: false }];
  const feedbackSlot = el('div', { class: 'feedback-slot' });
  const gutters = options.map((_, i) => el('span', { class: 'choice-gutter', 'aria-hidden': 'true' }, String(i + 1)));
  const buttons = options.map((option, i) => el('button', {
    type: 'button',
    class: 'choice',
    onclick: () => choose(option),
  }, gutters[i], el('span', { class: 'choice-label' }, renderInline(option.label))));

  const view = el('div', { class: `question question-${question.type}` },
    el('h2', { class: 'question-text', tabindex: '-1', 'data-autofocus': true }, renderInline(question.question)),
    question.code ? renderCodeBlock(question.code) : null,
    el('div', { class: 'choices', role: 'group', 'aria-label': 'Réponses possibles' }, buttons),
    feedbackSlot);

  function choose(option) {
    const { correct, nextButton } = onAnswer(option.value);
    const right = options.find((o) => o.value === question.answer);
    view.classList.add('is-answered');
    options.forEach((o, i) => {
      buttons[i].disabled = true;
      if (o === right) {
        buttons[i].classList.add('is-correct');
        gutters[i].textContent = '+';
        buttons[i].append(mark('✓', 'bonne réponse'));
      } else if (o === option) {
        buttons[i].classList.add('is-wrong');
        gutters[i].textContent = '−';
        buttons[i].append(mark('✗', 'ta réponse'));
      }
    });
    feedbackSlot.append(el('div', { class: `feedback ${correct ? 'is-ok' : 'is-ko'}` },
      reviewHead(correct ? 'ok' : 'ko', correct ? '✓' : '✗', correct ? 'check réussi' : 'check échoué'),
      el('div', { class: 'feedback-content' },
        el('p', { class: 'feedback-title' }, correct ? 'Bonne réponse !' : 'Raté'),
        correct ? null : el('p', { class: 'feedback-answer' },
          diffLine('del', 'Ta réponse :', option.label),
          diffLine('add', 'La bonne réponse :', right.label)),
        question.explanation ? el('p', { class: 'feedback-explanation' }, renderInline(question.explanation)) : null,
        nextButton)));
    announce(correct
      ? 'Bonne réponse.'
      : `Raté. La bonne réponse était : ${plain(right.label)}.`);
    nextButton.focus();
  }

  return view;
}
