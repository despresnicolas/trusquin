/**
 * Anglais des textes affichés venant de core/presets.ts (arbre du guide, patterns, modèles), indexé par le texte
 * français source : core reste sans i18n. Le contenu des règles générées n'est pas traduit.
 */
export const coreEn: Record<string, string> = {
  // Arbre de décision (DECISION_TREE)
  'Doit-il arriver à 100 %, sans dépendre du modèle ?': 'Must it happen 100% of the time, regardless of the model?',
  'Une consigne est suivie la plupart du temps ; seul le harness garantit une exécution systématique.':
    'An instruction is followed most of the time; only the harness guarantees it runs every time.',
  Oui: 'Yes',
  Non: 'No',
  'Il s’agit de…': 'It is about…',
  'Lancer une action (format, lint, blocage d’un fichier)': 'Running an action (format, lint, blocking a file)',
  'Autoriser ou interdire un accès (commande, fichier)': 'Allowing or denying access (command, file)',
  'Tu le lances toi-même, à la demande ?': 'Do you run it yourself, on demand?',
  'Oui, par /nom': 'Yes, with /name',
  'Non, Claude s’en sert seul': 'No, Claude uses it on its own',
  'C’est une tâche à déléguer, avec son propre contexte et ses outils ?':
    'Is it a task to delegate, with its own context and tools?',
  'Seul le résumé revient dans la conversation principale.': 'Only the summary comes back to the main conversation.',
  'C’est une procédure ponctuelle (release, migration, audit) ?':
    'Is it an occasional procedure (release, migration, audit)?',
  'Chargée seulement quand la demande correspond : ne coûte rien le reste du temps.':
    'Loaded only when the request matches: costs nothing the rest of the time.',
  'Non, une consigne à suivre': 'No, an instruction to follow',
  'C’est une règle. Elle vaut pour…': 'It is a rule. It applies to…',
  'Tout le projet, utile à chaque tâche': 'The whole project, useful for every task',
  'Tout le projet, mais longue (tests, sécu…)': 'The whole project, but long (tests, security…)',
  'Certains fichiers seulement': 'Some files only',
  'Un sous-projet de monorepo': 'A monorepo subproject',
  'Moi seulement': 'Me only',

  // Patterns (PATTERNS) : situation, élément, emplacement
  'Vrai pour tout le projet, utile à chaque tâche ?': 'True for the whole project, useful for every task?',
  'Vrai pour tout le projet mais long (tests, sécu…) ?': 'True for the whole project but long (tests, security…)?',
  'Vrai seulement pour certains fichiers (API, migrations, front) ?':
    'True only for some files (API, migrations, front end)?',
  'Spécifique à un sous-projet de monorepo ?': 'Specific to a monorepo subproject?',
  'Ma préférence perso, pas celle de l’équipe ?': 'My personal preference, not the team’s?',
  'Procédure ponctuelle (release, migration, audit) ?': 'Occasional procedure (release, migration, audit)?',
  'Prompt que je lance moi-même ?': 'A prompt I run myself?',
  'Tâche à déléguer avec contexte et outils séparés ?': 'A task to delegate with separate context and tools?',
  'Doit arriver à 100 % (format, lint, blocage) ?': 'Must happen 100% of the time (format, lint, blocking)?',
  'Accès à autoriser ou interdire ?': 'Access to allow or deny?',
  'Règle « Projet »': '“Project” rule',
  'Règle « Thème »': '“Topic” rule',
  'Règle « Chemins »': '“Paths” rule',
  'Règle « Dossier »': '“Folder” rule',
  'Règle « Perso »': '“Personal” rule',
  Skill: 'Skill',
  'Slash command': 'Slash command',
  'Sous-agent': 'Subagent',
  Hook: 'Hook',
  Permission: 'Permission',
  '.claude/rules/<thème>.md': '.claude/rules/<topic>.md',
  '<dossier>/CLAUDE.md': '<folder>/CLAUDE.md',
  'CLAUDE.local.md ou ~/.claude/CLAUDE.md': 'CLAUDE.local.md or ~/.claude/CLAUDE.md',
  '.claude/skills/<nom>/SKILL.md': '.claude/skills/<name>/SKILL.md',
  '.claude/commands/<nom>.md': '.claude/commands/<name>.md',
  '.claude/agents/<nom>.md': '.claude/agents/<name>.md',

  // Modèles (TEMPLATES) : nom et description
  'Commandes du projet': 'Project commands',
  'Indispensable : Claude lance les bonnes commandes au lieu de deviner.':
    'Essential: Claude runs the right commands instead of guessing.',
  'Architecture (WHAT / WHY)': 'Architecture (WHAT / WHY)',
  'Les dossiers clés et les décisions que Claude ne peut pas deviner.':
    'The key folders and the decisions Claude cannot guess.',
  'Monorepo : carte et commandes ciblées': 'Monorepo: map and targeted commands',
  'Une ligne par paquet et les commandes d’un seul paquet : Claude sait où chercher et ne lance pas tout le dépôt.':
    'One line per package and single-package commands: Claude knows where to look and does not run the whole repo.',
  'Monorepo : CLAUDE.md de paquet': 'Monorepo: package CLAUDE.md',
  'Chargé seulement quand Claude travaille dans ce paquet : ses commandes, sa structure, son fichier exemplaire.':
    'Loaded only when Claude works in this package: its commands, its structure, its model file.',
  'Règles API (ciblées par chemin)': 'API rules (path-targeted)',
  'Chargées seulement quand Claude touche ces fichiers.': 'Loaded only when Claude touches these files.',
  'Exemple de référence (few-shot)': 'Reference example (few-shot)',
  'Montrer plutôt qu’expliquer : Claude reproduit la structure d’un fichier exemplaire du dépôt.':
    'Show rather than explain: Claude reproduces the structure of a model file from the repo.',
  Tests: 'Tests',
  'Où sont les tests, comment les lancer, ce qui est attendu.':
    'Where the tests are, how to run them, what is expected.',
  'Git / MR': 'Git / MR',
  'Format de commit et règles de branche.': 'Commit format and branch rules.',
  'Glossaire métier': 'Domain glossary',
  'Les termes du domaine évitent les mauvais noms de variables.': 'Domain terms prevent bad variable names.',
  'Préférence perso': 'Personal preference',
  'Non versionnée (CLAUDE.local.md).': 'Not versioned (CLAUDE.local.md).',
  'Hook : formatter après édition': 'Hook: format after editing',
  'Déterministe : remplace toute règle de style dans CLAUDE.md.':
    'Deterministic: replaces any style rule in CLAUDE.md.',
  'Hook : bloquer .env': 'Hook: block .env',
  'Refuse toute édition des fichiers secrets (exit 2 = blocage).': 'Refuses any edit to secret files (exit 2 = block).',
  'Slash command : /review': 'Slash command: /review',
  'Prompt réutilisable lancé à la main.': 'Reusable prompt run by hand.',
  'Slash command : /plan': 'Slash command: /plan',
  'Planifier en tranches testables (balles traçantes) et faire valider plan.md avant de coder.':
    'Plan in testable slices (tracer bullets) and get plan.md approved before coding.',
  'Skill : release': 'Skill: release',
  'Procédure ponctuelle chargée seulement quand elle sert.': 'Occasional procedure loaded only when needed.',
  'Skill : debug': 'Skill: debug',
  'Méthode en 4 étapes : reproduire, isoler, diagnostiquer, corriger.':
    'Four-step method: reproduce, isolate, diagnose, fix.',
  'Skill : modèle complet': 'Skill: full template',
  'La structure d’une bonne skill : principe, erreurs fréquentes et leur raison, étapes, vérification, détail à la demande.':
    'The structure of a good skill: principle, common mistakes and why, steps, verification, details on demand.',
  'Agent : test-runner': 'Agent: test-runner',
  'Contexte isolé, outils restreints.': 'Isolated context, restricted tools.',

  // Explications des fichiers générés (core/placement.ts) ; celles avec une valeur passent par fileExplanation()
  'Mémoire racine lisible par tous les agents IA (Codex, Cursor, Claude…).':
    'Root memory readable by every AI agent (Codex, Cursor, Claude…).',
  'Point d’entrée Claude Code : importe AGENTS.md pour éviter la duplication.':
    'Claude Code entry point: imports AGENTS.md to avoid duplication.',
  'Mémoire racine versionnée, chargée à chaque session. Viser < 100 lignes.':
    'Versioned root memory, loaded in every session. Aim for < 100 lines.',
  'Règle thématique sans `paths` : chargée à chaque session, mais isolée pour rester lisible.':
    'Topic rule without `paths`: loaded in every session, but kept separate to stay readable.',
  'Préférences personnelles du projet. À garder dans .gitignore.':
    'Personal preferences for the project. Keep in .gitignore.',
  'Mémoire utilisateur, tous projets confondus. À fusionner dans ~/.claude/CLAUDE.md.':
    'User memory, across all projects. Merge into ~/.claude/CLAUDE.md.',
  'Skill : seule la description est en contexte, le corps est chargé quand la tâche correspond.':
    'Skill: only the description is in context; the body loads when the task matches.',
  'Sous-agent avec son propre contexte, délégué par Claude ou appelé par son nom.':
    'Subagent with its own context, delegated by Claude or called by name.',
  'Permissions et hooks versionnés : exécutés par le harness, pas interprétés par le modèle.':
    'Versioned permissions and hooks: run by the harness, not interpreted by the model.',
};

/** Explications qui contiennent une valeur (chemins, dossier, nom) : motif français → anglais. */
export const explanationsEn: [RegExp, string][] = [
  [/^Chargée seulement quand Claude lit ou modifie (.+)\.$/, 'Loaded only when Claude reads or edits $1.'],
  [
    /^Mémoire de sous-dossier : chargée quand Claude travaille dans (.+)\/\. Prime sur la racine\.$/,
    'Subfolder memory: loaded when Claude works in $1/. Takes precedence over the root.',
  ],
  [
    /^Slash command \/(.+), lancée explicitement par l’utilisateur\.$/,
    'Slash command /$1, run explicitly by the user.',
  ],
];
