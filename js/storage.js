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

function memoryBackend() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function createStorage(backend = browserStorage()) {
  const available = backend !== null;
  backend ??= memoryBackend();

  function readAll() {
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
    try {
      backend.setItem(KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  return {
    available,

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
      const prev = data.quizzes[quizId];
      data.quizzes[quizId] = { ...(isPlainObject(prev) ? prev : {}), ...progress };
      return writeAll(data);
    },

    getSession(quizId) {
      const stored = readAll().quizzes[quizId];
      return isPlainObject(stored) && isPlainObject(stored.session) ? stored.session : null;
    },

    saveSession(quizId, snapshot) {
      const data = readAll();
      const prev = data.quizzes[quizId];
      data.quizzes[quizId] = { ...(isPlainObject(prev) ? prev : {}), session: snapshot };
      return writeAll(data);
    },

    clearSession(quizId) {
      const data = readAll();
      const prev = data.quizzes[quizId];
      if (!isPlainObject(prev) || !('session' in prev)) return true;
      const { session, ...rest } = prev;
      data.quizzes[quizId] = rest;
      return writeAll(data);
    },
  };
}
