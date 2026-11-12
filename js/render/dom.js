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

/** Pastille d'état façon check : le glyphe est décoratif, le texte porte le sens. */
export function pill(kind, glyph, text) {
  return el('span', { class: `badge badge-${kind}` },
    el('span', { class: 'badge-glyph', 'aria-hidden': 'true' }, glyph),
    text);
}
