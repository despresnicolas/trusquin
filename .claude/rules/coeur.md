---
paths:
  - "src/lib/core/**/*.ts"
---
## Conventions

- Aucun import de `svelte`, `node:*` ni du DOM dans `core/`
- Tout nouveau contrôle qualité ou critère d'analyse arrive avec un test dans `core.test.ts`
- Messages et corrections affichés à l'utilisateur en français ; identifiants (`code`) en kebab-case anglais
