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

export function renderChoiceQuestion(question, onAnswer) {
  const options = question.type === 'mcq'
    ? question.displayChoices.map((c) => ({ label: c.text, value: c.index }))
    : [{ label: 'Vrai', value: true }, { label: 'Faux', value: false }];
  const feedbackSlot = el('div', { class: 'feedback-slot' });
  const buttons = options.map((option) => el('button', {
    type: 'button',
    class: 'choice',
    onclick: () => choose(option),
  }, el('span', { class: 'choice-label' }, renderInline(option.label))));

  const view = el('div', { class: `question question-${question.type}` },
    el('h2', { class: 'question-text', tabindex: '-1', 'data-autofocus': true }, renderInline(question.question)),
    question.code ? renderCodeBlock(question.code) : null,
    el('div', { class: 'choices', role: 'group', 'aria-label': 'Réponses possibles' }, buttons),
    feedbackSlot);

  function choose(option) {
    const { correct, nextButton } = onAnswer(option.value);
    const right = options.find((o) => o.value === question.answer);
    options.forEach((o, i) => {
      buttons[i].disabled = true;
      if (o === right) {
        buttons[i].classList.add('is-correct');
        buttons[i].append(mark('✓', 'bonne réponse'));
      } else if (o === option) {
        buttons[i].classList.add('is-wrong');
        buttons[i].append(mark('✗', 'ta réponse'));
      }
    });
    feedbackSlot.append(el('div', { class: `feedback ${correct ? 'is-ok' : 'is-ko'}` },
      el('p', { class: 'feedback-title' }, correct ? 'Bonne réponse !' : 'Raté'),
      correct ? null : el('p', { class: 'feedback-answer' }, 'La bonne réponse : ', renderInline(right.label)),
      question.explanation ? el('p', { class: 'feedback-explanation' }, renderInline(question.explanation)) : null,
      nextButton));
    announce(correct
      ? 'Bonne réponse.'
      : `Raté. La bonne réponse était : ${plain(right.label)}.`);
    nextButton.focus();
  }

  return view;
}
