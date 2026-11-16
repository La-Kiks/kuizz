// Coloration syntaxique sans dépendance.
// highlight(source, lang) renvoie une liste de jetons { type, value } dont la
// concaténation des `value` est strictement égale à `source` (rien n'est
// ajouté ni retiré). `type` vaut null pour le texte neutre, sinon l'un de :
// comment, keyword, string, number, function, type, tag, attr, property, punct.
// Le rendu se fait toujours par textContent : aucun HTML n'est interprété.

const LANGS = {
  html: lexHtml, htm: lexHtml, xml: lexHtml, svg: lexHtml,
  css: lexCss,
  js: (lx) => lexJs(lx, false), javascript: (lx) => lexJs(lx, false), mjs: (lx) => lexJs(lx, false),
  json: (lx) => lexJs(lx, false),
  ts: (lx) => lexTs(lx, false), typescript: (lx) => lexTs(lx, false),
  jsx: (lx) => lexJs(lx, true), tsx: (lx) => lexTs(lx, true),
  bash: lexBash, sh: lexBash, shell: lexBash, console: lexBash,
};

export function highlight(source, lang) {
  const lex = LANGS[(lang || '').toLowerCase()];
  if (!lex || !source) return source ? [{ type: null, value: source }] : [];
  try {
    const lx = new Lexer(source);
    lex(lx);
    if (!lx.done) lx.emit(null, source.slice(lx.i));
    return lx.out;
  } catch {
    return [{ type: null, value: source }];
  }
}

// Répartit les jetons en lignes (les jetons multilignes sont coupés aux \n).
export function toLines(tokens) {
  const lines = [[]];
  for (const { type, value } of tokens) {
    value.split('\n').forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ type, value: part });
    });
  }
  return lines;
}

class Lexer {
  constructor(src) {
    this.src = src;
    this.i = 0;
    this.out = [];
  }
  get done() { return this.i >= this.src.length; }
  peek(n = 0) { return this.src[this.i + n] ?? ''; }
  startsWith(s) { return this.src.startsWith(s, this.i); }
  // `re` doit porter le drapeau y (sticky). Ne renvoie jamais de chaîne vide.
  match(re) {
    re.lastIndex = this.i;
    const m = re.exec(this.src);
    return m && m[0] ? m[0] : null;
  }
  emit(type, value) {
    if (!value) return;
    this.i += value.length;
    this.push(type, value);
  }
  push(type, value) {
    const last = this.out[this.out.length - 1];
    if (last && last.type === type) last.value += value;
    else this.out.push({ type, value });
  }
  // Analyse src[i..end[ avec `lex`, puis reprend après `end`.
  embed(end, lex) {
    if (end <= this.i) return;
    const sub = new Lexer(this.src.slice(this.i, end));
    lex(sub);
    if (!sub.done) sub.emit(null, sub.src.slice(sub.i));
    for (const t of sub.out) this.push(t.type, t.value);
    this.i = end;
  }
}

const WS = /\s+/y;
const BLOCK_COMMENT = /\/\*[\s\S]*?(?:\*\/|$)/y;
const QUOTED = /'(?:[^'\\\n]|\\.)*'?|"(?:[^"\\\n]|\\.)*"?/y;

/* ---------- JavaScript / JSX ---------- */

const JS_KEYWORDS = new Set(('as async await break case catch class const continue debugger default delete do else '
  + 'export extends finally for from function if import in instanceof let new of return static super switch this '
  + 'throw try typeof var void while with yield').split(' '));
// TypeScript : mots-clés et types primitifs en plus de ceux de JavaScript.
const TS_KEYWORDS = new Set(('abstract declare enum implements interface is keyof namespace private protected '
  + 'public readonly satisfies type').split(' '));
const TS_TYPES = new Set(['any', 'boolean', 'never', 'number', 'string', 'unknown', 'void']);
const JS_CONSTANTS = new Set(['true', 'false', 'null', 'undefined', 'NaN', 'Infinity']);
const JS = {
  lineComment: /\/\/[^\n]*/y,
  num: /(?:0[xXbBoO][\da-fA-F_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+)n?/y,
  ident: /[\p{L}_$][\p{L}\p{N}_$]*/uy,
  call: /[ \t]*\(/y,
  op: /=>|\.\.\.|[=!]==?|&&=?|\|\|=?|\?\?=?|\?\.|\+\+|--|[<>]=?|[+\-*/%]=?|[=!&|^~?]/y,
  template: /(?:[^`\\$]|\\[\s\S]|\$(?!\{))+/y,
};
// Après ces jetons, un « < » ouvre une comparaison, pas un élément JSX.
const VALUE_END = new Set(['id', 'num', 'str', ')', ']']);

// stopAtBrace : s'arrête (sans le consommer) sur le « } » qui ferme une
// interpolation ${…} ou une expression JSX {…}.
function lexTs(lx, jsx) {
  lx.ts = true;
  lexJs(lx, jsx);
}

function lexJs(lx, jsx, stopAtBrace = false) {
  let depth = 0;
  let prev = null;
  while (!lx.done) {
    const c = lx.peek();
    let m;
    if ((m = lx.match(WS))) { lx.emit(null, m); continue; }
    if ((m = lx.match(JS.lineComment) || lx.match(BLOCK_COMMENT))) { lx.emit('comment', m); continue; }
    if (c === '{') { depth++; lx.emit(null, c); prev = c; continue; }
    if (c === '}') {
      if (stopAtBrace && depth === 0) return;
      depth--; lx.emit(null, c); prev = c; continue;
    }
    if (c === '`') { lexTemplate(lx, jsx); prev = 'str'; continue; }
    if ((m = lx.match(QUOTED))) { lx.emit('string', m); prev = 'str'; continue; }
    if (jsx && c === '<' && !VALUE_END.has(prev) && /[\p{L}>]/u.test(lx.peek(1))) {
      lexJsxElement(lx); prev = 'jsx'; continue;
    }
    if ((m = lx.match(JS.num))) { lx.emit('number', m); prev = 'num'; continue; }
    if ((m = lx.match(JS.ident))) {
      const member = prev === '.' || prev === '?.';
      lx.emit(classifyJsIdent(lx, m, member), m);
      prev = !member && JS_KEYWORDS.has(m) && m !== 'this' && m !== 'super' ? 'kw' : 'id';
      continue;
    }
    if ((m = lx.match(JS.op))) { lx.emit('punct', m); prev = m; continue; }
    lx.emit(null, c);
    prev = c;
  }
}

function classifyJsIdent(lx, word, member) {
  if (!member && lx.ts && TS_TYPES.has(word)) return 'type';
  if (!member && (JS_KEYWORDS.has(word) || (lx.ts && TS_KEYWORDS.has(word)))) return 'keyword';
  if (!member && JS_CONSTANTS.has(word)) return 'number';
  if (/^[A-Z][A-Z\d]*_[A-Z\d_]*$/.test(word)) return 'number'; // API_URL ; JSON, URL restent des types
  if (/^\p{Lu}/u.test(word)) return 'type';
  const after = lx.i + word.length;
  JS.call.lastIndex = after;
  if (JS.call.test(lx.src)) return 'function';
  return null;
}

function lexTemplate(lx, jsx) {
  lx.emit('string', '`');
  while (!lx.done) {
    let m;
    if ((m = lx.match(JS.template))) { lx.emit('string', m); continue; }
    if (lx.startsWith('${')) {
      lx.emit('punct', '${');
      lexJs(lx, jsx, true);
      if (lx.peek() === '}') lx.emit('punct', '}');
      continue;
    }
    lx.emit('string', lx.peek()); // le « ` » fermant
    return;
  }
}

function lexJsxExpression(lx) {
  lx.emit('punct', '{');
  lexJs(lx, true, true);
  if (lx.peek() === '}') lx.emit('punct', '}');
}

// Lit une balise JSX ; renvoie 'open', 'close' ou 'self'.
function lexJsxTag(lx) {
  const closing = lx.startsWith('</');
  lx.emit('punct', closing ? '</' : '<');
  let m = lx.match(/[\p{L}_$][\p{L}\p{N}_$.:-]*/uy);
  if (m) lx.emit(/^\p{Lu}/u.test(m) ? 'type' : 'tag', m);
  while (!lx.done) {
    if ((m = lx.match(WS))) { lx.emit(null, m); continue; }
    if (lx.startsWith('/>')) { lx.emit('punct', '/>'); return 'self'; }
    if (lx.peek() === '>') { lx.emit('punct', '>'); return closing ? 'close' : 'open'; }
    if (lx.peek() === '{') { lexJsxExpression(lx); continue; }
    if ((m = lx.match(/[\p{L}_$][\p{L}\p{N}_$:-]*/uy))) { lx.emit('attr', m); continue; }
    if (lx.peek() === '=') { lx.emit('punct', '='); continue; }
    if ((m = lx.match(QUOTED))) { lx.emit('string', m); continue; }
    lx.emit(null, lx.peek());
  }
  return 'self';
}

function lexJsxElement(lx) {
  let depth = 0;
  while (!lx.done) {
    const kind = lexJsxTag(lx);
    if (kind === 'open') depth++;
    else if (kind === 'close') depth--;
    if (depth <= 0) return;
    // Enfants : texte brut et expressions {…} jusqu'à la balise suivante.
    while (!lx.done && lx.peek() !== '<') {
      const m = lx.match(/[^<{]+/y);
      if (m) lx.emit(null, m);
      else lexJsxExpression(lx);
    }
  }
}

/* ---------- CSS ---------- */

const CSS = {
  num: /-?(?:\d+\.?\d*|\.\d+)(?:%|[a-zA-Z]+)?/y,
  hex: /#[\da-fA-F]{3,8}(?![\w-])/y,
  customProp: /--[\w-]+/y,
  important: /!\s*important/y,
  fn: /-?[a-zA-Z][\w-]*(?=\()/y,
  feature: /-?[a-zA-Z][\w-]*(?=\s*:)/y,
  logic: /(?:and|not|only|or)(?![\w-])/y,
  ident: /-?[a-zA-Z_][\w-]*/y,
  property: /--[\w-]+|-?[a-zA-Z][\w-]*/y,
  atRule: /@[\w-]+/y,
  selClass: /[.#][\p{L}_-][\p{L}\p{N}_-]*/uy,
  selPseudo: /::?[\w-]+/y,
  selNum: /\d+(?:\.\d+)?%?/y,
  selTag: /[\p{L}_*][\p{L}\p{N}_-]*/uy,
};

function lexCss(lx) {
  while (!lx.done) {
    let m;
    if ((m = lx.match(WS))) { lx.emit(null, m); continue; }
    if ((m = lx.match(BLOCK_COMMENT))) { lx.emit('comment', m); continue; }
    const c = lx.peek();
    if (c === '{' || c === '}' || c === ';') { lx.emit(null, c); continue; }
    const end = nextCssBoundary(lx.src, lx.i);
    if (c === '@') {
      lx.emit('keyword', lx.match(CSS.atRule) || '@');
      lexCssValue(lx, end);
    } else if (lx.src[end] === '{') {
      lexCssSelector(lx, end);
    } else {
      lx.emit('property', lx.match(CSS.property));
      lexCssValue(lx, end);
    }
    if (lx.i < end) lx.emit(null, lx.src.slice(lx.i, end));
  }
}

// Premier « { », « ; » ou « } » hors chaînes, commentaires et parenthèses.
function nextCssBoundary(src, from) {
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'") {
      const close = src.indexOf(c, i + 1);
      if (close < 0) return src.length;
      i = close;
    } else if (c === '/' && src[i + 1] === '*') {
      const close = src.indexOf('*/', i + 2);
      if (close < 0) return src.length;
      i = close + 1;
    } else if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (depth === 0 && (c === '{' || c === '}' || c === ';')) return i;
  }
  return src.length;
}

function lexCssSelector(lx, end) {
  while (lx.i < end) {
    let m;
    if ((m = lx.match(WS))) lx.emit(null, m);
    else if ((m = lx.match(BLOCK_COMMENT))) lx.emit('comment', m);
    else if ((m = lx.match(CSS.selClass))) lx.emit('type', m);
    else if ((m = lx.match(CSS.selPseudo))) lx.emit('keyword', m);
    else if ((m = lx.match(QUOTED))) lx.emit('string', m);
    else if ((m = lx.match(CSS.selNum))) lx.emit('number', m);
    else if (lx.peek() === '[') {
      lx.emit(null, '[');
      if ((m = lx.match(/[\w-]+/y))) lx.emit('attr', m);
    } else if ((m = lx.match(CSS.selTag))) lx.emit('tag', m);
    else lx.emit(null, lx.peek());
  }
}

// Valeur d'une déclaration ou prélude d'une règle @ (media queries…).
function lexCssValue(lx, end) {
  while (lx.i < end) {
    let m;
    if ((m = lx.match(WS))) lx.emit(null, m);
    else if ((m = lx.match(BLOCK_COMMENT))) lx.emit('comment', m);
    else if ((m = lx.match(QUOTED))) lx.emit('string', m);
    else if ((m = lx.match(CSS.hex))) lx.emit('number', m);
    else if ((m = lx.match(CSS.num))) lx.emit('number', m);
    else if ((m = lx.match(CSS.customProp))) lx.emit('property', m);
    else if ((m = lx.match(CSS.important))) lx.emit('keyword', m);
    else if ((m = lx.match(CSS.fn))) lx.emit('function', m);
    else if ((m = lx.match(CSS.feature))) lx.emit('property', m);
    else if ((m = lx.match(CSS.logic))) lx.emit('keyword', m);
    else if ((m = lx.match(CSS.ident))) lx.emit(null, m);
    else lx.emit(null, lx.peek());
  }
}

/* ---------- HTML ---------- */

const HTML = {
  comment: /<!--[\s\S]*?(?:-->|$)/y,
  open: /<\/?(?=[A-Za-z])|<!(?=[A-Za-z])/y,
  name: /[A-Za-z][\w:-]*/y,
  attr: /[^\s"'<>/=]+/y,
  unquoted: /[^\s"'=<>`]+/y,
  quoted: /"[^"]*"?|'[^']*'?/y,
  text: /[^<&]+/y,
  entity: /&(?:#\d+|#x[\da-fA-F]+|\w+);/y,
};

function lexHtml(lx) {
  while (!lx.done) {
    let m;
    if ((m = lx.match(HTML.comment))) { lx.emit('comment', m); continue; }
    if ((m = lx.match(HTML.open))) { lexHtmlTag(lx, m); continue; }
    if ((m = lx.match(HTML.text))) { lx.emit(null, m); continue; }
    if ((m = lx.match(HTML.entity))) { lx.emit('number', m); continue; }
    lx.emit(null, lx.peek());
  }
}

function lexHtmlTag(lx, opener) {
  const closing = opener === '</';
  lx.emit('punct', opener);
  const name = lx.match(HTML.name) || '';
  lx.emit(opener === '<!' ? 'keyword' : 'tag', name);
  let afterEquals = false;
  while (!lx.done) {
    let m;
    if ((m = lx.match(WS))) { lx.emit(null, m); continue; }
    if (lx.startsWith('/>')) { lx.emit('punct', '/>'); return; }
    if (lx.peek() === '>') { lx.emit('punct', '>'); break; }
    if (lx.peek() === '=') { lx.emit('punct', '='); afterEquals = true; continue; }
    if ((m = lx.match(HTML.quoted))) { lx.emit('string', m); afterEquals = false; continue; }
    if (afterEquals && (m = lx.match(HTML.unquoted))) { lx.emit('string', m); afterEquals = false; continue; }
    if ((m = lx.match(HTML.attr))) { lx.emit('attr', m); continue; }
    lx.emit(null, lx.peek());
  }
  const tag = name.toLowerCase();
  if (closing || (tag !== 'script' && tag !== 'style')) return;
  const close = lx.src.toLowerCase().indexOf(`</${tag}`, lx.i);
  const end = close < 0 ? lx.src.length : close;
  lx.embed(end, tag === 'script' ? (sub) => lexJs(sub, false) : lexCss);
}

/* ---------- Bash ---------- */

const BASH_KEYWORDS = new Set(('if then else elif fi for while until do done case esac in function '
  + 'select time export local return').split(' '));
const BASH = {
  blank: /[ \t]+/y,
  comment: /#[^\n]*/y,
  string: /"(?:[^"\\]|\\[\s\S])*"?|'[^']*'?/y,
  variable: /\$\{[^}\n]*\}?|\$[\w@#?*!$-]/y,
  op: /&&|\|\||[|;&<>]+/y,
  flag: /--?[\w-]+/y,
  word: /[^\s"'$|;&<>]+/y,
};

function lexBash(lx) {
  let commandPos = true;
  while (!lx.done) {
    const c = lx.peek();
    let m;
    const wordStart = lx.i === 0 || /\s/.test(lx.src[lx.i - 1]);
    if (c === '\n') { lx.emit(null, c); commandPos = true; continue; }
    if ((m = lx.match(BASH.blank))) { lx.emit(null, m); continue; }
    if (c === '#' && wordStart) { lx.emit('comment', lx.match(BASH.comment)); continue; }
    if ((m = lx.match(BASH.string))) { lx.emit('string', m); commandPos = false; continue; }
    if ((m = lx.match(BASH.variable))) { lx.emit('property', m); commandPos = false; continue; }
    if ((m = lx.match(BASH.op))) { lx.emit('punct', m); commandPos = !/^[<>]+$/.test(m); continue; }
    if (wordStart && !commandPos && (m = lx.match(BASH.flag))) { lx.emit('attr', m); continue; }
    if ((m = lx.match(BASH.word))) {
      if (BASH_KEYWORDS.has(m)) lx.emit('keyword', m);
      else if (commandPos) { lx.emit('function', m); commandPos = false; }
      else lx.emit(null, m);
      continue;
    }
    lx.emit(null, c);
  }
}
