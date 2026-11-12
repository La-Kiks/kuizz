const TYPES = ['mcq', 'truefalse', 'flashcard'];

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateQuestion(q, where, errors) {
  if (!isPlainObject(q)) {
    errors.push(`${where} : doit être un objet`);
    return;
  }
  if (!TYPES.includes(q.type)) {
    errors.push(`${where} : type "${q.type}" inconnu`);
    return;
  }
  if (q.code !== undefined) {
    if (!isPlainObject(q.code) || !isNonEmptyString(q.code.content)) {
      errors.push(`${where} : "code.content" manquant`);
    } else if (q.code.lang !== undefined && typeof q.code.lang !== 'string') {
      errors.push(`${where} : "code.lang" doit être une chaîne`);
    }
  }
  if (q.type === 'flashcard') {
    if (!isNonEmptyString(q.front)) errors.push(`${where} : "front" manquant`);
    if (!isNonEmptyString(q.back)) errors.push(`${where} : "back" manquant`);
    return;
  }
  if (!isNonEmptyString(q.question)) errors.push(`${where} : "question" manquante`);
  if (q.explanation !== undefined && typeof q.explanation !== 'string') {
    errors.push(`${where} : "explanation" doit être une chaîne`);
  }
  if (q.type === 'truefalse' && typeof q.answer !== 'boolean') {
    errors.push(`${where} : "answer" doit être true ou false`);
  }
  if (q.type === 'mcq') {
    const choicesOk = Array.isArray(q.choices)
      && q.choices.length >= 2 && q.choices.length <= 6
      && q.choices.every(isNonEmptyString);
    if (!choicesOk) {
      errors.push(`${where} : "choices" doit contenir 2 à 6 textes non vides`);
      return;
    }
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) {
      errors.push(`${where} : "answer" hors limites`);
    }
    if (new Set(q.choices).size !== q.choices.length) {
      errors.push(`${where} : choix en double`);
    }
  }
}

export function validateQuiz(quiz) {
  if (!isPlainObject(quiz)) return ['le quiz doit être un objet'];
  const errors = [];
  for (const field of ['id', 'title', 'subject']) {
    if (!isNonEmptyString(quiz[field])) errors.push(`champ "${field}" manquant ou vide`);
  }
  if (quiz.description !== undefined && typeof quiz.description !== 'string') {
    errors.push('"description" doit être une chaîne');
  }
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    errors.push('"questions" doit être un tableau non vide');
    return errors;
  }
  const seen = new Set();
  quiz.questions.forEach((q, i) => {
    const where = `question #${i + 1}${isPlainObject(q) && q.id ? ` (${q.id})` : ''}`;
    if (isPlainObject(q)) {
      if (!isNonEmptyString(q.id)) errors.push(`${where} : "id" manquant`);
      else if (seen.has(q.id)) errors.push(`${where} : id "${q.id}" en double`);
      else seen.add(q.id);
    }
    validateQuestion(q, where, errors);
  });
  return errors;
}

export function validateIndex(index) {
  if (!isPlainObject(index) || !Array.isArray(index.subjects)) return ['"subjects" doit être un tableau'];
  const errors = [];
  const subjectIds = new Set();
  const quizIds = new Set();
  index.subjects.forEach((s, i) => {
    const where = `matière #${i + 1}`;
    if (!isPlainObject(s) || !isNonEmptyString(s.id) || !isNonEmptyString(s.title)) {
      errors.push(`${where} : "id" et "title" requis`);
      return;
    }
    if (subjectIds.has(s.id)) errors.push(`${where} : id "${s.id}" en double`);
    subjectIds.add(s.id);
    if (!Array.isArray(s.quizzes)) {
      errors.push(`${where} : "quizzes" doit être un tableau`);
      return;
    }
    s.quizzes.forEach((q, j) => {
      const w = `${where}, quiz #${j + 1}`;
      if (!isPlainObject(q) || !isNonEmptyString(q.id) || !isNonEmptyString(q.file)) {
        errors.push(`${w} : "id" et "file" requis`);
        return;
      }
      if (quizIds.has(q.id)) errors.push(`${w} : id "${q.id}" en double`);
      quizIds.add(q.id);
      if (q.file.startsWith('/') || q.file.includes('..') || !q.file.endsWith('.json')) {
        errors.push(`${w} : chemin "${q.file}" invalide`);
      }
    });
  });
  return errors;
}
