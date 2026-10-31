# SAURON — Standards for Agents: Unified Rules, Oversight & Nesting

Générateur SvelteKit de configuration Claude Code. On écrit des règles en disant **quoi** et **à quoi elles s'appliquent** ; le générateur place chaque fichier au bon endroit, contrôle la qualité de ce qui sera envoyé à Claude, et note les repos existants.

Sources : [laconsole.dev — fichier CLAUDE.md](https://laconsole.dev/blog/fichier-claude-md), [dev.to — The perfect CLAUDE.md](https://dev.to/jangwook_kim_e31e7291ad98/the-perfect-claudemd-how-to-set-up-your-project-for-agentic-coding-d14), guide Medium « The Complete Guide to CLAUDE.md ».

## Démarrer

```bash
pnpm install
pnpm dev           # interface sur http://localhost:5173
pnpm test          # tests du cœur
pnpm check         # types Svelte + TS
pnpm build         # serveur Node dans build/ (node build)
```

## Onglets

| Route                    | Rôle                                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Analyse de dépôt** `/` | Chemin d'un dossier local : note A–E, critères, import des règles, historique en base.                                                               |
| **Règles** `/rules`      | Projet, permissions, règles / skills / commandes / agents / hooks. Destination en direct.                                                            |
| **Aperçu** `/preview`    | Arborescence groupée par mode de chargement, contenu de chaque fichier, qualité de l'export (score /100, les erreurs bloquent l'export), export zip. |
| **Patterns** `/patterns` | Situation → élément Claude Code et emplacement, avec les modèles à ajouter au projet ; arborescence de référence.                                    |

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

- Erreurs : secret probable, portée sans cible, nom de skill/agent invalide, skill sans description, hook sans commande, collision de fichiers.
- Avertissements : racine > 100 lignes (erreur > 200), formulations vagues, doublons, contradictions (`X` demandé et interdit), plusieurs gestionnaires de paquets, commandes sans backticks, budget de ~150 instructions toujours chargées dépassé.
- Suggestions : style qu'un linter devrait gérer, règle longue à passer en skill, gros bloc de code copié, pas de hook, pas de `deny`.

## Analyse de dépôt

Note sur 100 (A ≥ 85, B ≥ 70, C ≥ 55, D ≥ 40, E). Les critères non applicables sont exclus du calcul.

- **Préparation Claude** : mémoire racine, concision, commandes exactes, architecture, secrets, règles vagues, imports `@` valides, règles modulaires, permissions, hooks, skills/commandes, agents, fichiers perso gitignorés.
- **Bonnes pratiques** : README, tests, linter, formatter, typage, CI, lockfile, `.gitignore` / `.env.example`.

Le serveur Node lit le dossier (chemin absolu saisi dans l'interface) et enregistre chaque analyse dans PostgreSQL : historique par dépôt, évolution du score, ré-analyse en un clic. `SAURON_ROOTS` (chemins séparés par `:`) limite les dossiers lisibles.

```bash
cp .env.example .env          # DATABASE_URL vers la base locale
docker compose up -d db       # PostgreSQL sur localhost:5432
pnpm dev
```

API JSON (collection Bruno dans `bruno/`) :

| Méthode | Route                      | Rôle                                                      |
| ------- | -------------------------- | --------------------------------------------------------- |
| POST    | `/api/analyses` `{ path }` | analyse et enregistre, renvoie aussi `rules` et `context` |
| GET     | `/api/repos`               | dernier résultat par dépôt, nombre d'analyses             |
| GET     | `/api/analyses?path=`      | historique d'un dépôt                                     |
| GET     | `/api/analyses/:id`        | détail d'une analyse                                      |
| DELETE  | `/api/repos?path=`         | supprime l'historique d'un dépôt                          |

## CLI (dossiers locaux)

`sauron.json` est la source de vérité : exporté dans le zip, rechargeable dans l'interface, utilisable en ligne de commande.

```bash
pnpm sauron analyze ../mon-repo                  # note le dossier local (enregistré si DATABASE_URL)
pnpm sauron check sauron.json                      # exit 1 si erreur qualité
pnpm sauron generate sauron.json ../mon-repo --dry-run
pnpm sauron generate sauron.json ../mon-repo --force   # écrase les fichiers existants
```

Sans `--force`, `generate` n'écrase aucun fichier existant et refuse de générer s'il y a des erreurs qualité.

Ce repo applique sa propre méthode : `sauron.json` génère `CLAUDE.md`, `.claude/rules/`, la skill `add-quality-check` et `.claude/settings.json`.

## Docker

```bash
docker compose up --build web          # interface + API sur http://localhost:8080, base db incluse
docker compose up --build dev          # hot reload sur http://localhost:5173 (sources montées)
REPOS_DIR=$HOME/Code docker compose up --build web   # dossier monté (défaut : $HOME/Dev)
REPO=../mon-repo docker compose run --rm cli analyze .
REPO=../mon-repo docker compose run --rm cli generate sauron.json . --dry-run
```

- Cible `dev` : `vite dev` avec hot reload. Les sources sont montées dans `/app`, `node_modules` et `.svelte-kit` restent ceux du conteneur. Après un changement de dépendances : `docker compose up --build -V dev`. Si les modifications ne sont pas détectées : `CHOKIDAR_USEPOLLING=1 docker compose up dev`.
- Cible `web` : serveur SvelteKit `adapter-node` (tests inclus au build). `REPOS_DIR` est monté en lecture seule au même chemin que sur l'hôte et sert de `SAURON_ROOTS`.
- Service `db` : PostgreSQL 17, données dans le volume `pgdata`, table `analyses` créée au premier appel.
- Cible `cli` : même CLI, le dossier `REPO` est monté sur `/repo`.
- `pnpm install --frozen-lockfile` respecte `minimumReleaseAge` de pnpm : une dépendance publiée il y a moins d'un jour est refusée.

## Structure

```
src/routes/          une route par onglet (SPA, ssr = false), / = analyse de dépôt
src/routes/api/      API JSON de l'historique
src/lib/components/  contenu des onglets
src/lib/core/        logique pure, partagée UI + CLI (placement, quality, analyze, presets)
src/lib/server/      Node seulement : lecture disque (repo.ts), PostgreSQL (db.ts)
src/lib/history.ts   types + client de l'API
src/lib/state.svelte.ts  état partagé, persisté en localStorage
cli/sauron.ts          CLI Node
Dockerfile           cibles web (serveur Node) et cli
bruno/               collection Bruno de l'API
```
