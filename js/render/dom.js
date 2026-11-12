export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : String(child));
  }
  return node;
}

export function announce(message) {
  const region = document.getElementById('announcer');
  if (!region) return;
  region.textContent = '';
  setTimeout(() => { region.textContent = message; }, 50);
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_PATHS = {
  check: 'M3.25 8.5l3 3 6.5-7',
  cross: 'M4.25 4.25l7.5 7.5M11.75 4.25l-7.5 7.5',
};

/**
 * Marque de statut dessinée : 'check' / 'cross' en SVG (même trait, currentColor),
 * 'dot' / 'ring' en points CSS. Toujours décorative : le texte porte le sens.
 */
export function icon(name) {
  if (name === 'dot' || name === 'ring') return el('span', { class: `status-${name}`, 'aria-hidden': 'true' });
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', `icon icon-${name}`);
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', ICON_PATHS[name]);
  svg.append(path);
  return svg;
}

/** Pastille d'état façon check : la marque est décorative, le texte porte le sens. */
export function pill(kind, mark, text) {
  return el('span', { class: `badge badge-${kind}` },
    el('span', { class: 'badge-glyph', 'aria-hidden': 'true' }, mark ? icon(mark) : '#'),
    text);
}
