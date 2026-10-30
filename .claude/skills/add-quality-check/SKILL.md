---
name: add-quality-check
description: Ajoute un contrôle qualité ou un critère d'analyse de repo, avec test. Use when the user asks to detect a new anti-pattern in CLAUDE.md or to score a new repo practice.
---
# Ajouter un contrôle

1. Écrire d'abord le test dans `src/lib/core/core.test.ts` (il doit échouer)
2. Contrôle sur les règles : `ruleIssues()` dans `quality.ts`. Sur un texte mémoire : `lintMemoryText()` (réutilisé par l'analyse)
3. Critère de repo : ajouter un `crit()` dans `analyzeRepo()` ; garder la somme des `max` proche de 100
4. `pnpm test && pnpm check`
