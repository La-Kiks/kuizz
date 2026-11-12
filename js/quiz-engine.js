export function shuffle(array, random = Math.random) {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createSession(quiz, { mode = 'all', toReview = [], random = Math.random } = {}) {
  const pool = mode === 'review'
    ? quiz.questions.filter((q) => toReview.includes(q.id))
    : quiz.questions;
  const questions = shuffle(pool, random).map((q) => (q.type === 'mcq'
    ? { ...q, displayChoices: shuffle(q.choices.map((text, index) => ({ text, index })), random) }
    : q));
  return { quizId: quiz.id, mode, questions, current: 0, results: [] };
}

export function currentQuestion(session) {
  return session.questions[session.current] ?? null;
}

export function isFinished(session) {
  return session.current >= session.questions.length;
}

function isCorrect(question, response) {
  if (question.type === 'flashcard') return response === true;
  return response === question.answer;
}

export function answerCurrent(session, response) {
  const question = currentQuestion(session);
  if (!question) throw new Error('Session terminée');
  if (session.results.length > session.current) throw new Error('Question déjà répondue');
  const correct = isCorrect(question, response);
  session.results.push({ id: question.id, response, correct });
  return correct;
}

export function next(session) {
  if (session.results.length <= session.current) throw new Error('Question pas encore répondue');
  session.current += 1;
}

export function score(session) {
  const total = session.questions.length;
  const correct = session.results.filter((r) => r.correct).length;
  return { correct, total, ratio: total ? correct / total : 0 };
}

export function missedQuestions(session) {
  return session.results
    .filter((r) => !r.correct)
    .map((r) => session.questions.find((q) => q.id === r.id));
}

export function updateToReview(toReview, results) {
  const set = new Set(toReview);
  for (const r of results) {
    if (r.correct) set.delete(r.id);
    else set.add(r.id);
  }
  return [...set];
}

export function nextProgress(prev, session, now = new Date()) {
  const { ratio } = score(session);
  const bestScore = session.mode === 'all'
    ? Math.max(prev.bestScore ?? 0, ratio)
    : prev.bestScore ?? null;
  return {
    bestScore,
    lastPlayed: now.toISOString(),
    toReview: updateToReview(prev.toReview, session.results),
  };
}

export function correctAnswerText(question) {
  if (question.type === 'mcq') return question.choices[question.answer];
  if (question.type === 'truefalse') return question.answer ? 'Vrai' : 'Faux';
  return question.back;
}
