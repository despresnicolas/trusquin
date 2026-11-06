# SAURON

**Écrivez vos règles une fois, SAURON les range au bon endroit pour Claude Code.**

SAURON (_Standards for Agents: Unified Rules, Oversight & Nesting_) est une application de bureau gratuite pour macOS, Windows et Linux. Elle aide à préparer un projet pour [Claude Code](https://claude.com/claude-code), l'assistant de programmation d'Anthropic : vous décrivez vos consignes en langage courant, l'application produit les bons fichiers (`CLAUDE.md`, règles, skills, agents, hooks…), vérifie leur qualité et note les dépôts existants.

## Pourquoi

Claude Code lit des fichiers de configuration éparpillés dans un projet : certains sont chargés en permanence, d'autres seulement quand il touche un dossier, d'autres à la demande. Savoir lequel utiliser, où le placer et comment l'écrire demande de bien connaître l'outil. Un fichier trop long, des consignes vagues ou contradictoires, et Claude les suit mal.

SAURON répond à trois questions :

- **Où mettre cette règle ?** Vous dites _quoi_ et _à quoi ça s'applique_ ; l'application choisit le fichier et l'emplacement.
- **Est-ce bien écrit ?** Un contrôle qualité signale les secrets oubliés, les consignes floues, les doublons, les contradictions et les fichiers trop longs, avant l'export.
- **Mon dépôt est-il prêt ?** L'analyse note un projet existant de A à E et propose d'en importer les règles.

## Fonctionnalités

- **Guide pas à pas** : un arbre de décision qui mène au bon élément Claude Code, avec des modèles prêts à l'emploi.
- **Générateur** : règles, skills, slash commands, sous-agents, hooks et permissions, avec aperçu en direct de la destination de chaque fichier.
- **Contrôle qualité** : score sur 100 ; les erreurs bloquantes empêchent l'export.
- **Analyse de dépôt** : choisissez un dossier local, obtenez une note, la liste des points à corriger et l'évolution du score au fil des analyses.
- **Export** : écriture directe dans le projet ou archive zip.
- **Local et privé** : tout reste sur votre machine (base SQLite locale), aucun compte, aucun envoi réseau.

## Installer

Aucune version précompilée n'est encore publiée : pour l'instant, l'application se compile depuis les sources.

Prérequis : [Go](https://go.dev/dl/) 1.26 ou plus, [Node.js](https://nodejs.org/) et [pnpm](https://pnpm.io/installation), puis la CLI Wails 3 :

```bash
go install github.com/wailsapp/wails/v3/cmd/wails3@latest
wails3 doctor      # vérifie que la machine a tout ce qu'il faut
```

Ensuite :

```bash
git clone https://github.com/despresnicolas/sauron.git
cd sauron
pnpm install
wails3 build       # binaire dans bin/sauron
wails3 package     # application empaquetée (.app, installeur…)
```

## Utiliser

1. Ouvrez **Générateur**, renseignez le nom et la stack du projet.
2. Ajoutez vos règles : pour chacune, le texte et sa portée (tout le projet, un dossier, certains fichiers…).
3. Consultez **Aperçu & export** : fichiers générés, score qualité, points à corriger.
4. Exportez dans votre projet ou en zip.

Pour un projet déjà configuré, passez par **Analyse de dépôt** : sélectionnez le dossier, lisez la note, importez les règles existantes pour les retravailler.

## Pour aller plus loin

### Où va chaque règle

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

Une règle projet marquée **Critique** est placée en tête du `CLAUDE.md` et rappelée dans une section « Rappels » en fin de fichier (biais de primauté et de récence).

### Contrôle qualité

Barème : erreur −15, avertissement −5, suggestion −1.

- **Erreurs** : aucune règle active (score 0), secret probable, portée sans cible, nom de skill/agent invalide, skill sans description, hook sans commande, collision de fichiers.
- **Avertissements** : racine > 100 lignes (erreur > 200), formulations vagues, doublons, contradictions (`X` demandé et interdit), plusieurs gestionnaires de paquets, commandes sans backticks, budget de ~150 instructions toujours chargées dépassé, plus de 3 règles critiques.
- **Suggestions** : style qu'un linter devrait gérer, règle longue à passer en skill, gros bloc de code copié, interdiction sans alternative (« Ne jamais… » → dire quoi faire), pas de hook, pas de `deny`.

### Analyse de dépôt

Note sur 100 (A ≥ 85, B ≥ 70, C ≥ 55, D ≥ 40, E). Les critères non applicables sont exclus du calcul.

- **Préparation Claude** : mémoire racine, concision, commandes exactes, architecture, secrets, règles vagues, imports `@` valides, fichiers exemplaires cités (few-shot), règles modulaires, en monorepo (workspace pnpm ou `workspaces` npm/yarn) mémoire par paquet et commandes ciblées, permissions, hooks, skills/commandes, agents, fichiers perso gitignorés.
- **Bonnes pratiques** : README, tests, linter, formatter, typage, CI, lockfile, `.gitignore` / `.env.example`.

### Où sont mes données

Analyses et projets sont enregistrés dans une base SQLite locale, dans le dossier de configuration de l'utilisateur :

- macOS : `~/Library/Application Support/sauron/sauron.db`
- Linux : `~/.config/sauron/sauron.db`
- Windows : `%AppData%\sauron\sauron.db`

La variable d'environnement `SAURON_DB` permet d'en choisir un autre chemin.

## Contribuer

Application [Wails 3](https://v3.wails.io/) : Go pour l'accès disque et la base, SvelteKit (Svelte 5, TypeScript) pour l'interface et toute la logique métier.

```bash
wails3 dev         # application en mode développement, rechargement du Go et du front
pnpm test          # tests du cœur (Vitest) puis des services Go
pnpm check         # types Svelte + TS
pnpm lint          # ESLint
```

```
main.go              application Wails : fenêtre, services, front embarqué (dist/)
repo.go              RepoService : lecture d'un dossier local, écriture des exports
history.go           HistoryService : historique des analyses et des projets (SQLite)
build/               configuration de build Wails (icônes, Info.plist, Taskfiles par plateforme)
src/routes/          une route par onglet (SPA)
src/lib/components/  contenu des onglets
src/lib/core/        logique pure (placement, qualité, analyse), testée par Vitest
src/lib/bindings/    bindings TypeScript des services Go (générés par wails3, ne pas éditer)
```

Les tickets et propositions passent par les [issues GitHub](https://github.com/despresnicolas/sauron/issues). Les choix d'architecture sont consignés dans [`docs/adr/`](docs/adr/).

## Sources

- [laconsole.dev — fichier CLAUDE.md](https://laconsole.dev/blog/fichier-claude-md)
- [dev.to — The perfect CLAUDE.md](https://dev.to/jangwook_kim_e31e7291ad98/the-perfect-claudemd-how-to-set-up-your-project-for-agentic-coding-d14)
- Medium — « The Complete Guide to CLAUDE.md »

SAURON est un projet indépendant, sans lien avec Anthropic.
