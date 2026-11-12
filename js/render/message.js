import { el } from './dom.js';

export function renderMessage(container, { title, text }) {
  container.append(el('section', { class: 'message' },
    el('h1', { class: 'page-title', tabindex: '-1', 'data-autofocus': true }, title),
    el('p', {}, text),
    el('a', { class: 'btn btn-secondary', href: '#/' }, 'Retour à l\'accueil')));
}
