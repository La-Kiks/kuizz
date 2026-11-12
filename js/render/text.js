const INLINE_CODE = /`([^`]+)`/g;

export function tokenizeInline(text) {
  const tokens = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_CODE)) {
    if (match.index > last) tokens.push({ type: 'text', value: text.slice(last, match.index) });
    tokens.push({ type: 'code', value: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) });
  return tokens;
}

export function renderInline(text, doc = document) {
  const fragment = doc.createDocumentFragment();
  for (const token of tokenizeInline(text)) {
    if (token.type === 'code') {
      const code = doc.createElement('code');
      code.className = 'inline';
      code.textContent = token.value;
      fragment.append(code);
    } else {
      fragment.append(doc.createTextNode(token.value));
    }
  }
  return fragment;
}

export function renderCodeBlock(code, doc = document) {
  const pre = doc.createElement('pre');
  pre.className = 'code-block';
  pre.tabIndex = 0;
  pre.setAttribute('role', 'region');
  pre.setAttribute('aria-label', code.lang ? `Extrait de code ${code.lang.toUpperCase()}` : 'Extrait de code');
  if (code.lang) pre.dataset.lang = code.lang;
  // Une ligne = un <span class="line"> (numéro en CSS, hors du texte copié et lu) ;
  // le textContent de <code> reste strictement égal au contenu source.
  const inner = doc.createElement('code');
  const lines = code.content.split('\n');
  const trailing = lines.length > 1 && lines[lines.length - 1] === '';
  if (trailing) lines.pop();
  lines.forEach((line, i) => {
    if (i > 0) inner.append(doc.createTextNode('\n'));
    const span = doc.createElement('span');
    span.className = 'line';
    span.textContent = line;
    inner.append(span);
  });
  if (trailing) inner.append(doc.createTextNode('\n'));
  if (lines.length >= 100) pre.classList.add('is-long');
  pre.append(inner);
  return pre;
}

export function formatPercent(ratio) {
  return `${Math.round(ratio * 100)} %`;
}
