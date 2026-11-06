# SAURON — Standards for Agents: Unified Rules, Oversight & Nesting

Application de bureau (Wails 3 : Go + SvelteKit) qui génère la configuration Claude Code. On écrit des règles en disant **quoi** et **à quoi elles s'appliquent** ; le générateur place chaque fichier au bon endroit, contrôle la qualité de ce qui sera envoyé à Claude, et note les repos existants.

Sources : [laconsole.dev — fichier CLAUDE.md](https://laconsole.dev/blog/fichier-claude-md), [dev.to — The perfect CLAUDE.md](https://dev.to/jangwook_kim_e31e7291ad98/the-perfect-claudemd-how-to-set-up-your-project-for-agentic-coding-d14), guide Medium « The Complete Guide to CLAUDE.md ».

## Démarrer

Prérequis : Go 1.26+, pnpm, et la CLI Wails 3 (`go install github.com/wailsapp/wails/v3/cmd/wails3@latest`, puis `wails3 doctor`).

```bash
pnpm install
wails3 dev         # application de bureau, rechargement du Go et du front
wails3 build       # binaire dans bin/sauron (front compilé dans dist/ et embarqué)
wails3 package     # application empaquetée (.app, installeur…)
pnpm test          # tests du cœur (Vitest) puis des services Go
pnpm check         # types Svelte + TS
```

## Onglets

| Route                           | Rôle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Accueil** `/`                 | Ce qui fait une bonne règle, boucle de travail, arborescence générée.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Analyse de dépôt** `/analyze` | Chemin d'un dossier local : note A–E, critères, import des règles, historique en base.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Générateur** `/generator`     | Assistant à la conception des fichiers Claude Code. Barre projet (score, Nouveau projet, Importer .md/.json, Enregistrer dans l'historique, Exporter le zip ; les erreurs bloquent l'export). Onglets **Guide** (par défaut : arbre de décision qui mène à l'élément Claude Code, son emplacement et ses modèles), **Projet** (`?view=project` : nom, description, stack, permissions), **Règles** (`?view=rules` ou `?rule=<id>` : règles / skills / commandes / agents / hooks, destination en direct), **Aperçu & export** (`?view=export` : fichiers groupés par mode de chargement, qualité de l'export) et **Historique** (`?view=history` : projets enregistrés). |

## Où va chaque règle

| Portée / type      | Fichier généré                               | Chargement                       |
| ------------------ | -------------------------------------------- | -------------------------------- |
| Projet             | `CLAUDE.md` (ou `AGENTS.md` + `@AGENTS.md`)  | toujours                         |
| Thème              | `.claude/rules/<catégorie>.md`               | toujours                         |
| Chemins            | `.claude/rules/<nom>.md` + `paths:`          | quand Claude touche ces fichiers |
| Dossier            | `<dossier>/CLAUDE.md`                        | quand Claude travaille dedans    |
| Perso projet       | `CLAUDE.local.md` (gitignoré)                | personnel                        |
| Perso global       | `~/.claude/CLAUDE.md` (`_home/` dans le zip) | personnel                        |
| Skill              | `.claude/skills/<nom>/SKILL.md`              | à la demande                     |
| Slash command      | `.claude/commands/<nom>.md`                  | à la demande                     |
| Sous-agent         | `.claude/agents/<nom>.md`                    | à la demande                     |
| Hook / permissions | `.claude/settings.json`                      | exécuté par le harness           |

## Contrôle qualité

Barème : erreur −15, avertissement −5, suggestion −1.

- Erreurs : aucune règle active (score 0), secret probable, portée sans cible, nom de skill/agent invalide, skill sans description, hook sans commande, collision de fichiers.
- Avertissements : racine > 100 lignes (erreur > 200), formulations vagues, doublons, contradictions (`X` demandé et interdit), plusieurs gestionnaires de paquets, commandes sans backticks, budget de ~150 instructions toujours chargées dépassé, plus de 3 règles critiques.
- Suggestions : style qu'un linter devrait gérer, règle longue à passer en skill, gros bloc de code copié, interdiction sans alternative (« Ne jamais… » → dire quoi faire), pas de hook, pas de `deny`.

Une règle projet marquée **Critique** est placée en tête du `CLAUDE.md` et rappelée dans une section « Rappels » en fin de fichier (biais de primauté et de récence).

## Analyse de dépôt

Note sur 100 (A ≥ 85, B ≥ 70, C ≥ 55, D ≥ 40, E). Les critères non applicables sont exclus du calcul.

- **Préparation Claude** : mémoire racine, concision, commandes exactes, architecture, secrets, règles vagues, imports `@` valides, fichiers exemplaires cités (few-shot), règles modulaires, en monorepo (workspace pnpm ou `workspaces` npm/yarn) mémoire par paquet et commandes ciblées, permissions, hooks, skills/commandes, agents, fichiers perso gitignorés.
- **Bonnes pratiques** : README, tests, linter, formatter, typage, CI, lockfile, `.gitignore` / `.env.example`.

Le service Go `RepoService` lit le dossier choisi dans l'interface ; l'analyse elle-même est faite par le cœur TypeScript, dans la fenêtre. Chaque analyse est enregistrée par `HistoryService` dans une base SQLite locale : historique par dépôt, évolution du score, ré-analyse en un clic. Les projets du générateur y sont aussi versionnés.

La base est dans le dossier de configuration de l'utilisateur (`~/Library/Application Support/sauron/sauron.db` sur macOS, `~/.config/sauron/sauron.db` sur Linux, `%AppData%\sauron\sauron.db` sur Windows) ; `SAURON_DB` en donne un autre chemin.

## Structure

```
main.go              application Wails : fenêtre, services, front embarqué (dist/)
repo.go              RepoService : lecture d'un dossier local (Snapshot, Dirs)
history.go           HistoryService : historique des analyses et des projets (SQLite)
build/               configuration de build Wails (icônes, Info.plist, Taskfiles par plateforme)
src/routes/          une route par onglet (SPA, ssr = false), / = accueil
src/lib/components/  contenu des onglets
src/lib/core/        logique pure (placement, quality, analyze, presets)
src/lib/bindings/    bindings TypeScript des services Go (générés par wails3, versionnés)
src/lib/history.ts   types + client des services Go
src/lib/state.svelte.ts  état partagé, persisté en localStorage
```
