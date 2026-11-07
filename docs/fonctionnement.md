# Fonctionnement détaillé

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

Une règle projet marquée **Critique** est placée en tête du `CLAUDE.md` et rappelée dans une section « Rappels » en fin de fichier (biais de primauté et de récence).

## Contrôle qualité

Barème : erreur −15, avertissement −5, suggestion −1.

- **Erreurs** : aucune règle active (score 0), secret probable, portée sans cible, nom de skill/agent invalide, skill sans description, hook sans commande, collision de fichiers.
- **Avertissements** : racine > 100 lignes (erreur > 200), formulations vagues, doublons, contradictions (`X` demandé et interdit), plusieurs gestionnaires de paquets, commandes sans backticks, budget de ~150 instructions toujours chargées dépassé, plus de 3 règles critiques.
- **Suggestions** : style qu'un linter devrait gérer, règle longue à passer en skill, gros bloc de code copié, interdiction sans alternative (« Ne jamais… » → dire quoi faire), pas de hook, pas de `deny`.

## Analyse de dépôt

Note sur 100 (A ≥ 85, B ≥ 70, C ≥ 55, D ≥ 40, E). Les critères non applicables sont exclus du calcul.

- **Préparation Claude** : mémoire racine, concision, commandes exactes, architecture, secrets, règles vagues, imports `@` valides, fichiers exemplaires cités (few-shot), règles modulaires, en monorepo (workspace pnpm ou `workspaces` npm/yarn) mémoire par paquet et commandes ciblées, permissions, hooks, skills/commandes, agents, fichiers perso gitignorés.
- **Bonnes pratiques** : README, tests, linter, formatter, typage, CI, lockfile, `.gitignore` / `.env.example`.

## Où sont mes données

Analyses et projets sont enregistrés dans une base SQLite locale, dans le dossier de configuration de l'utilisateur :

- macOS : `~/Library/Application Support/trusquin/trusquin.db`
- Linux : `~/.config/trusquin/trusquin.db`
- Windows : `%AppData%\trusquin\trusquin.db`

La variable d'environnement `TRUSQUIN_DB` permet d'en choisir un autre chemin.

## Sources

- [laconsole.dev — fichier CLAUDE.md](https://laconsole.dev/blog/fichier-claude-md)
- [dev.to — The perfect CLAUDE.md](https://dev.to/jangwook_kim_e31e7291ad98/the-perfect-claudemd-how-to-set-up-your-project-for-agentic-coding-d14)
- Medium — « The Complete Guide to CLAUDE.md »
