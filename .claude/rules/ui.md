---
paths:
  - "src/**/*.svelte"
  - "src/routes/**"
---
## Conventions

- Svelte 5 runes (`$state`, `$derived`, `$props`), pas de stores `writable`
- Imports internes via `#lib/...` (SvelteKit 3 : `$lib` n'existe plus) ; fichiers `.svelte.ts` importés avec leur extension
- Routes minces : la logique va dans `src/lib/components/` ou `src/lib/core/`
- Couleurs via les variables de `src/app.css`, jamais en dur
