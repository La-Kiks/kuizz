# Kuizz

Quiz de révision (QCM, vrai/faux, flashcards). Site statique, sans compte : la progression est
enregistrée dans le navigateur de chacun.

## Lancer en local

```bash
npm run serve        # http://localhost:8080/
```

Les modules ES ne fonctionnent pas en ouvrant `index.html` directement (`file://`) : il faut un serveur.

## Vérifier

```bash
npm test             # tests unitaires
npm run validate     # validation de tous les fichiers de quiz
```

## Ajouter un quiz

1. Créer `quizzes/<matiere>/<theme>.json` (voir un quiz existant pour le format).
2. L'ajouter dans `quizzes/index.json`.
3. `npm run validate`, puis commit et push : GitHub Pages publie en ~1 minute.

Le format est validé par `js/quiz-schema.js` : types `mcq` (`choices`, `answer` = index),
`truefalse` (`answer` booléen), `flashcard` (`front`, `back`) ; `code` et `explanation` optionnels.
