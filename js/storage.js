const KEY = 'kuizz:v1';

function browserStorage() {
  try {
    const storage = globalThis.localStorage;
    const probe = 'kuizz:probe';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function createStorage(backend = browserStorage()) {
  function readAll() {
    if (!backend) return { quizzes: {} };
    try {
      const raw = backend.getItem(KEY);
      if (!raw) return { quizzes: {} };
      const data = JSON.parse(raw);
      if (!isPlainObject(data) || !isPlainObject(data.quizzes)) return { quizzes: {} };
      return data;
    } catch {
      return { quizzes: {} };
    }
  }

  function writeAll(data) {
    if (!backend) return false;
    try {
      backend.setItem(KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  return {
    available: backend !== null,

    getProgress(quizId, validIds) {
      const stored = readAll().quizzes[quizId];
      const p = isPlainObject(stored) ? stored : {};
      const toReview = Array.isArray(p.toReview)
        ? p.toReview.filter((id) => typeof id === 'string' && (!validIds || validIds.includes(id)))
        : [];
      return {
        bestScore: typeof p.bestScore === 'number' ? p.bestScore : null,
        lastPlayed: typeof p.lastPlayed === 'string' ? p.lastPlayed : null,
        toReview,
      };
    },

    saveProgress(quizId, progress) {
      const data = readAll();
      data.quizzes[quizId] = progress;
      return writeAll(data);
    },
  };
}
