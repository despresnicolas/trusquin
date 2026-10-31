# SAURON

Générateur Svelte qui transforme des règles (quoi + à quoi ça s'applique) en fichiers Claude Code placés au bon endroit, avec contrôle qualité et analyse de repo.

**Stack :** SvelteKit 3 (adapter-node, pages SPA + routes /api), Svelte 5 (runes), TypeScript strict, PostgreSQL (driver postgres), Vitest, tsx pour la CLI, pnpm, Docker

## Commandes

- Installer : `pnpm install` (jamais `npm` ni `yarn`)
- Dev : `pnpm dev` (http://localhost:5173)
- Build : `pnpm build` (serveur Node dans `build/`, lancé par `node build`)
- Tests : `pnpm test`
- Un seul test : `pnpm exec vitest run src/lib/core/core.test.ts -t "nom"`
- Types Svelte + TS : `pnpm check`
- Lint : `pnpm lint` ; format : `pnpm format` (vérif : `pnpm format:check`)
- CLI : `pnpm sauron analyze <dossier>` / `pnpm sauron check sauron.json` / `pnpm sauron generate sauron.json <dossier>`
- Base locale : `cp .env.example .env && docker compose up -d db`
- Docker : `docker compose up --build web` (http://localhost:8080) ; hot reload : `docker compose up --build dev` (http://localhost:5173) ; CLI : `REPO=<dossier> docker compose run --rm cli analyze .`
- Avant de rendre la main : `pnpm check && pnpm lint && pnpm test`

## Architecture

- `src/lib/core/` : logique pure sans DOM ni Node, partagée par l'UI et la CLI
- `src/lib/core/placement.ts` : règles → fichiers (emplacement + contenu)
- `src/lib/core/quality.ts` : contrôle qualité de l'export
- `src/lib/core/analyze.ts` : notation d'un repo existant + import des règles
- `src/lib/server/` : Node seulement (lecture disque `repo.ts`, PostgreSQL `db.ts`), utilisé par `src/routes/api/` et la CLI
- `src/lib/history.ts` : types et client de l'API d'historique des analyses
- `src/lib/state.svelte.ts` : état partagé (`store.project`, `store.files`, `store.quality`), persisté en localStorage
- `src/routes/` : une route par onglet (`/` = analyse de dépôt), `ssr = false` (SPA) ; `src/routes/api/` : API JSON (documentée dans `bruno/`) ; `src/lib/components/` : contenu des onglets
- `cli/sauron.ts` : CLI Node (appelle `core/` et `server/`, enregistre `analyze` en base si `DATABASE_URL`)
- `Dockerfile` : cibles `web` (serveur Node SvelteKit) et `cli` (tsx, repo monté sur `/repo`) ; `compose.yaml` ajoute `db` (PostgreSQL)
- Pourquoi : le même code sert au navigateur et au terminal

## Git & workflow

- Ne jamais lancer `git commit` ni `git push` : proposer un message Conventional Commits

## Automatisations

Ces contrôles tournent via des hooks (`.claude/settings.json`) : ne pas les refaire à la main.

- Prettier après chaque édition (PostToolUse · Edit|Write|MultiEdit)

## Agent skills

### Issue tracker

Tickets dans les GitHub Issues de `despresnicolas/sauron` (CLI `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Les cinq labels par défaut (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context : `CONTEXT.md` et `docs/adr/` à la racine. See `docs/agents/domain.md`.
