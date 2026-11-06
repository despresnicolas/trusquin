# SAURON

Générateur Svelte qui transforme des règles (quoi + à quoi ça s'applique) en fichiers Claude Code placés au bon endroit, avec contrôle qualité et analyse de repo.

**Stack :** Wails 3 (Go 1.26, application de bureau), SvelteKit 3 (adapter-static, SPA), Svelte 5 (runes), TypeScript strict, SQLite (modernc.org/sqlite, sans cgo), Vitest, pnpm

## Commandes

- Installer : `pnpm install` (jamais `npm` ni `yarn`) ; CLI Wails : `go install github.com/wailsapp/wails/v3/cmd/wails3@latest`
- Dev : `wails3 dev` (application de bureau, rechargement Go + front)
- Build : `wails3 build` (binaire `bin/sauron`) ; empaqueter : `wails3 package`
- Bindings après un changement de signature Go : `wails3 generate bindings -clean=true -ts -i -d src/lib/bindings`
- Tests : `pnpm test` (Vitest puis `go test ./...`) ; Go seul : `pnpm test:go`
- Un seul test : `pnpm exec vitest run src/lib/core/core.test.ts -t "nom"` ; Go : `go test -run TestNom ./...`
- Types Svelte + TS : `pnpm check`
- Lint : `pnpm lint` ; format : `pnpm format` (vérif : `pnpm format:check`) ; Go : `gofmt -l .`
- Avant de rendre la main : `pnpm check && pnpm lint && pnpm test`

## Architecture

- `src/lib/core/` : logique pure sans DOM ni Node (placement, qualité, analyse), exécutée dans la fenêtre
- `src/lib/core/placement.ts` : règles → fichiers (emplacement + contenu)
- `src/lib/core/quality.ts` : contrôle qualité de l'export
- `src/lib/core/analyze.ts` : notation d'un repo existant + import des règles
- `main.go`, `repo.go`, `history.go` : services Go exposés au front (`RepoService` lit le disque, `HistoryService` gère SQLite)
- `src/lib/bindings/` : bindings TS générés par wails3 (versionnés, ne pas éditer)
- `src/lib/history.ts` : types et client des services Go ; seul point d'entrée du front vers le Go
- `src/lib/state.svelte.ts` : état partagé (`store.project`, `store.files`, `store.quality`), persisté en localStorage
- `src/routes/` : une route par onglet (`/` = accueil, `/analyze` = analyse de dépôt), `ssr = false` (SPA) ; `src/lib/components/` : contenu des onglets
- `build/` : configuration Wails (icônes, Info.plist, Taskfiles par plateforme) ; `dist/` : front compilé, embarqué par `main.go`
- Pourquoi : le Go ne fait que l'accès disque et la base ; toute la logique métier reste dans `core/`, testée par Vitest

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
