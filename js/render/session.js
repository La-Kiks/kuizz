import { el } from './dom.js';
import { answerCurrent, currentQuestion, isFinished, next } from '../quiz-engine.js';
import { quizPath } from '../router.js';
import { renderChoiceQuestion } from './mcq.js';
import { renderFlashcard } from './flashcard.js';

export function renderSession(container, { quiz, session, onFinish, onAnswered }) {
  const total = session.questions.length;
  const label = el('p', { class: 'progress-label' });
  const bar = el('progress', { class: 'progress', max: total, value: 0, 'aria-hidden': 'true' });
  const body = el('div', { class: 'session-body' });

  container.append(el('section', { class: 'session' },
    el('header', { class: 'session-header' },
      el('a', { class: 'back-link', href: quizPath(quiz.id) }, el('span', { 'aria-hidden': 'true' }, '← '), 'Quitter'),
      el('h1', { class: 'session-title' }, session.mode === 'review' ? `${quiz.title} — erreurs à revoir` : quiz.title),
      label,
      bar),
    body));

  function showCurrent() {
    const question = currentQuestion(session);
    const position = session.current + 1;
    const isLast = position === total;
    label.textContent = `Question ${position} sur ${total}`;
    bar.value = session.current;

    const onAnswer = (response) => {
      const correct = answerCurrent(session, response);
      onAnswered?.(session.results[session.results.length - 1]);
      bar.value = position;
      const nextButton = el('button', {
        type: 'button',
        class: 'btn btn-primary next-button',
        onclick: () => {
          nextButton.disabled = true;
          next(session);
          if (isFinished(session)) onFinish();
          else showCurrent();
        },
      }, isLast ? 'Voir les résultats' : 'Question suivante');
      return { correct, nextButton };
    };

    const view = question.type === 'flashcard'
      ? renderFlashcard(question, onAnswer)
      : renderChoiceQuestion(question, onAnswer);
    body.replaceChildren(view);
    view.querySelector('[data-autofocus]')?.focus();
  }

  showCurrent();
}
