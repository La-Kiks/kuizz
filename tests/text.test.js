import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeInline, formatPercent, renderCodeBlock } from '../js/render/text.js';

test('texte sans code', () => {
  assert.deepEqual(tokenizeInline('Bonjour'), [{ type: 'text', value: 'Bonjour' }]);
  assert.deepEqual(tokenizeInline(''), []);
});

test('code inline au milieu, au début et à la fin', () => {
  assert.deepEqual(tokenizeInline('La balise `<nav>` sert à `naviguer`'), [
    { type: 'text', value: 'La balise ' },
    { type: 'code', value: '<nav>' },
    { type: 'text', value: ' sert à ' },
    { type: 'code', value: 'naviguer' },
  ]);
  assert.deepEqual(tokenizeInline('`fetch()` renvoie une Promise'), [
    { type: 'code', value: 'fetch()' },
    { type: 'text', value: ' renvoie une Promise' },
  ]);
});

test('backtick isolé laissé tel quel', () => {
  assert.deepEqual(tokenizeInline('a `b'), [{ type: 'text', value: 'a `b' }]);
  assert.deepEqual(tokenizeInline('``'), [{ type: 'text', value: '``' }]);
});

test('formatPercent arrondit et utilise une espace fine insécable', () => {
  assert.equal(formatPercent(0.856), '86 %');
  assert.equal(formatPercent(0), '0 %');
  assert.equal(formatPercent(1), '100 %');
});

// Faux document minimal : juste ce qu'utilise renderCodeBlock.
function fakeDoc() {
  const text = (value) => ({ nodeType: 3, get textContent() { return value; } });
  const element = (tag) => {
    const el = {
      tag, nodeType: 1, children: [], className: '', dataset: {}, attrs: {},
      classList: { add: (c) => { el.className = `${el.className} ${c}`.trim(); } },
      setAttribute: (k, v) => { el.attrs[k] = v; },
      append: (...nodes) => el.children.push(...nodes),
      get textContent() { return el.children.map((c) => c.textContent).join(''); },
      set textContent(v) { el.children = [text(v)]; },
    };
    return el;
  };
  return { createElement: element, createTextNode: text };
}

test('renderCodeBlock : texte identique, une ligne par span, jetons colorés', () => {
  const content = '<p class="a">Bonjour</p>\n// fin\n';
  const pre = renderCodeBlock({ lang: 'html', content }, fakeDoc());
  const code = pre.children[0];
  assert.equal(code.textContent, content);
  const lines = code.children.filter((n) => n.className === 'line');
  assert.equal(lines.length, 2);
  assert.equal(code.children.at(-1).textContent, '\n', 'saut de ligne final conservé');
  const first = lines[0].children;
  assert.equal(first.find((n) => n.className === 'tk-tag').textContent, 'p');
  assert.ok(lines[1].children.every((n) => n.nodeType === 3), 'texte neutre en nœuds texte, pas en spans');
  assert.equal(pre.dataset.lang, 'html');
});
