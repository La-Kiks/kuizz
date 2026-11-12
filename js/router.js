export function parseRoute(hash) {
  const path = hash.replace(/^#/, '');
  let parts;
  try {
    parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return { name: 'notfound' };
  }
  if (parts.length === 0 && (path === '' || path === '/')) return { name: 'home' };
  if (parts[0] === 'quiz' && parts[1]) {
    const quizId = parts[1];
    if (parts.length === 2) return { name: 'start', quizId };
    if (parts.length === 3 && parts[2] === 'play') return { name: 'session', quizId, mode: 'all' };
    if (parts.length === 3 && parts[2] === 'review') return { name: 'session', quizId, mode: 'review' };
    if (parts.length === 3 && parts[2] === 'results') return { name: 'results', quizId };
  }
  return { name: 'notfound' };
}

export function quizPath(quizId, sub) {
  return `#/quiz/${encodeURIComponent(quizId)}${sub ? `/${sub}` : ''}`;
}
