import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { highlight, toLines } from '../js/render/highlight.js';

const typeOf = (tokens, value) => tokens.find((t) => t.value === value)?.type;
const isPlain = (tokens, word) => !tokens.some((t) => t.type && t.value.includes(word))
  && tokens.some((t) => !t.type && t.value.includes(word));
const join = (tokens) => tokens.map((t) => t.value).join('');

function allSnippets() {
  const dir = new URL('../quizzes/frontend/', import.meta.url);
  const snippets = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.code?.content) snippets.push(node.code);
    Object.values(node).forEach(walk);
  };
  for (const file of readdirSync(dir)) walk(JSON.parse(readFileSync(new URL(file, dir), 'utf8')));
  return snippets;
}

test('tous les extraits des quiz sont restitués à l\'identique', () => {
  const snippets = allSnippets();
  assert.ok(snippets.length > 100);
  for (const { content, lang } of snippets) {
    const tokens = highlight(content, lang);
    assert.equal(join(tokens), content, `${lang} : ${content.slice(0, 40)}`);
    assert.ok(tokens.some((t) => t.type), `${lang} sans aucun jeton coloré`);
  }
});

test('langage inconnu ou absent : texte neutre', () => {
  assert.deepEqual(highlight('a < b', 'cobol'), [{ type: null, value: 'a < b' }]);
  assert.deepEqual(highlight('x', undefined), [{ type: null, value: 'x' }]);
  assert.deepEqual(highlight('', 'js'), []);
});

test('html : balises, attributs, valeurs, commentaires, entités', () => {
  const t = highlight('<!-- nav -->\n<a href="/" class=lien>A &amp; B</a>', 'html');
  assert.equal(typeOf(t, '<!-- nav -->'), 'comment');
  assert.equal(typeOf(t, 'a'), 'tag');
  assert.equal(typeOf(t, 'href'), 'attr');
  assert.equal(typeOf(t, '"/"'), 'string');
  assert.equal(typeOf(t, 'lien'), 'string');
  assert.equal(typeOf(t, '&amp;'), 'number');
  assert.equal(typeOf(t, '</'), 'punct');
});

test('html : <script> et <style> sont colorés dans leur langage', () => {
  const t = highlight('<script>\n  const x = fetch(\'/api\');\n</script>\n<style>p { color: red; }</style>', 'html');
  assert.equal(typeOf(t, 'const'), 'keyword');
  assert.equal(typeOf(t, 'fetch'), 'function');
  assert.equal(typeOf(t, "'/api'"), 'string');
  assert.equal(typeOf(t, 'color'), 'property');
  assert.equal(t.filter((x) => x.type === 'tag').map((x) => x.value).join(','), 'script,script,style,p,style');
});

test('css : sélecteurs, propriétés, valeurs, règles @', () => {
  const t = highlight(':root { --bg: #fff; }\n@media (min-width: 992px) {\n  .card:hover > h3 { margin: 0 auto !important; width: calc(100% - 2rem); }\n}', 'css');
  assert.equal(typeOf(t, ':root'), 'keyword');
  assert.equal(typeOf(t, '--bg'), 'property');
  assert.equal(typeOf(t, '#fff'), 'number');
  assert.equal(typeOf(t, '@media'), 'keyword');
  assert.equal(typeOf(t, 'min-width'), 'property');
  assert.equal(typeOf(t, '992px'), 'number');
  assert.equal(typeOf(t, '.card'), 'type');
  assert.equal(typeOf(t, ':hover'), 'keyword');
  assert.equal(typeOf(t, 'h3'), 'tag');
  assert.equal(typeOf(t, 'margin'), 'property');
  assert.ok(isPlain(t, 'auto'));
  assert.equal(typeOf(t, '!important'), 'keyword');
  assert.equal(typeOf(t, 'calc'), 'function');
  assert.equal(typeOf(t, '100%'), 'number');
});

test('js : mots-clés, fonctions, classes, constantes, gabarits, commentaires', () => {
  const t = highlight('// note\nconst r = await fetch(`${API_URL}/x`);\nif (!r.ok) throw new Error(r.status);\nlet n = 3 < 4 && true;', 'js');
  assert.equal(typeOf(t, '// note'), 'comment');
  assert.equal(typeOf(t, 'const'), 'keyword');
  assert.equal(typeOf(t, 'fetch'), 'function');
  assert.equal(typeOf(t, 'API_URL'), 'number');
  assert.equal(typeOf(t, '/x`'), 'string');
  assert.equal(typeOf(t, 'Error'), 'type');
  assert.ok(isPlain(t, 'ok'));
  assert.equal(typeOf(t, '3'), 'number');
  assert.equal(typeOf(t, 'true'), 'number');
  assert.equal(typeOf(t, '<'), 'punct');
});

test('jsx : éléments, composants, props, enfants texte et expressions', () => {
  const src = "return <ul className=\"liste\">{items.map((p) => <Item key={p.id} />)}<li>L'été</li></ul>;";
  const t = highlight(src, 'jsx');
  assert.equal(join(t), src);
  assert.equal(typeOf(t, 'ul'), 'tag');
  assert.equal(typeOf(t, 'className'), 'attr');
  assert.equal(typeOf(t, 'Item'), 'type');
  assert.equal(typeOf(t, 'key'), 'attr');
  assert.equal(typeOf(t, 'map'), 'function');
  assert.ok(isPlain(t, "L'été"), 'l\'apostrophe du texte n\'ouvre pas de chaîne');
  assert.ok(!t.some((x) => x.type === 'string' && x.value.includes('été')));
});

test('jsx : éléments frères au premier niveau', () => {
  const t = highlight('return (\n    <h1>Kuizz</h1>\n    <p>Révise le web</p>\n  );', 'jsx');
  assert.equal(t.filter((x) => x.type === 'tag').map((x) => x.value).join(','), 'h1,h1,p,p');
  assert.ok(isPlain(t, 'Révise le web'));
  const u = highlight('<label for="email">E-mail</label>\n<input id="email" type="email" />', 'jsx');
  assert.equal(typeOf(u, 'input'), 'tag');
  assert.equal(typeOf(u, 'type'), 'attr');
});

test('js : JSON est une classe, API_URL une constante', () => {
  const t = highlight('JSON.parse(API_URL)', 'js');
  assert.equal(typeOf(t, 'JSON'), 'type');
  assert.equal(typeOf(t, 'API_URL'), 'number');
});

test('jsx : une comparaison n\'ouvre pas d\'élément', () => {
  const t = highlight('if (count < limit) setCount(count + 1);', 'jsx');
  assert.ok(isPlain(t, 'limit'));
  assert.equal(typeOf(t, 'setCount'), 'function');
});

test('bash : commandes, options, chaînes, variables, commentaires', () => {
  const t = highlight('# installer\nnpm create vite@latest app -- --template react\ncd app && echo "$HOME"', 'bash');
  assert.equal(typeOf(t, '# installer'), 'comment');
  assert.equal(typeOf(t, 'npm'), 'function');
  assert.equal(typeOf(t, '--template'), 'attr');
  assert.equal(typeOf(t, 'cd'), 'function');
  assert.equal(typeOf(t, '&&'), 'punct');
  assert.equal(typeOf(t, 'echo'), 'function');
  assert.equal(typeOf(t, '"$HOME"'), 'string');
});

test('toLines coupe les jetons multilignes', () => {
  const lines = toLines([{ type: 'comment', value: '/* a\nb */' }, { type: null, value: '\nx\n' }]);
  assert.deepEqual(lines, [
    [{ type: 'comment', value: '/* a' }],
    [{ type: 'comment', value: 'b */' }],
    [{ type: null, value: 'x' }],
    [],
  ]);
});

test('ts : mots-clés et types primitifs TypeScript', () => {
  const t = highlight('interface Film {\n  readonly id: number;\n}\nlet titre: string = film.type;', 'ts');
  assert.equal(typeOf(t, 'interface'), 'keyword');
  assert.equal(typeOf(t, 'readonly'), 'keyword');
  assert.equal(typeOf(t, 'Film'), 'type');
  assert.equal(typeOf(t, 'number'), 'type');
  assert.equal(typeOf(t, 'string'), 'type');
  assert.ok(isPlain(t, 'type'), 'type en position de membre reste neutre');
  assert.ok(isPlain(highlight('const interface1 = string;', 'js'), 'string'), 'en js, string reste neutre');
});
