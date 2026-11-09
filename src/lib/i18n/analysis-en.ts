/**
 * Anglais des détails et corrections des critères de notation (core/analyze.ts), indexé par le texte français :
 * core reste en français. Les textes avec une valeur passent par un motif.
 */
export const analysisEn: Record<string, string> = {
  // Détails
  'Aucun CLAUDE.md ni AGENTS.md à la racine.': 'No CLAUDE.md or AGENTS.md at the root.',
  '—': '—',
  'Section trouvée.': 'Section found.',
  'Pas de section décrivant la structure.': 'No section describing the structure.',
  'Rien détecté.': 'Nothing detected.',
  'Pas de formulation vague détectée.': 'No vague wording detected.',
  'Aucun import.': 'No imports.',
  'Aucun fichier du dépôt cité en exemple.': 'No repository file cited as an example.',
  'Pas de workspace détecté.': 'No workspace detected.',
  'La mémoire racine cite une commande filtrée par paquet.': 'The root memory cites a package-filtered command.',
  'Aucune commande filtrée (--filter, nx run…) dans la mémoire racine.':
    'No filtered command (--filter, nx run…) in the root memory.',
  'Pas de .claude/settings.json.': 'No .claude/settings.json.',
  'Aucun hook.': 'No hooks.',
  'OK.': 'OK.',
  'Présent.': 'Present.',
  'Absent.': 'Missing.',
  'Trouvé.': 'Found.',
  'Aucun linter détecté.': 'No linter detected.',
  'Aucun formatter détecté.': 'No formatter detected.',
  'Pas de vérification de types.': 'No type checking.',
  'Pipeline trouvé.': 'Pipeline found.',
  'Aucune CI.': 'No CI.',
  'Lockfile présent.': 'Lockfile present.',
  'Pas de lockfile.': 'No lockfile.',

  // Corrections
  'Créer un CLAUDE.md à côté contenant `@AGENTS.md`.': 'Create a CLAUDE.md next to it containing `@AGENTS.md`.',
  'Générer un CLAUDE.md avec le générateur ou `/init`, puis élaguer.':
    'Generate a CLAUDE.md with the generator or `/init`, then trim it.',
  'Déplacer le détail dans .claude/rules/ ou des skills.': 'Move the details to .claude/rules/ or skills.',
  'Lister install, dev, test, test ciblé, lint, typecheck, build entre backticks.':
    'List install, dev, test, targeted test, lint, typecheck, build in backticks.',
  'Ajouter le WHAT/WHY : dossiers clés, rôle, décisions d’architecture.':
    'Add the WHAT/WHY: key folders, their role, architecture decisions.',
  'Retirer les valeurs ; référencer seulement les noms de variables.':
    'Remove the values; reference only the variable names.',
  'Remplacer « code propre » par une règle testable.': 'Replace “clean code” with a testable rule.',
  'Corriger les chemins importés.': 'Fix the imported paths.',
  'Pointer vers un composant, un test ou un endpoint exemplaire (« suivre `src/…` ») plutôt que décrire le style.':
    'Point to a model component, test or endpoint (“follow `src/…`”) rather than describing the style.',
  'Isoler les règles spécifiques dans .claude/rules/*.md avec `paths:`.':
    'Isolate specific rules in .claude/rules/*.md with `paths:`.',
  'Ajouter un CLAUDE.md par paquet (commandes, structure, conventions locales) : chargé seulement quand Claude y travaille.':
    'Add one CLAUDE.md per package (commands, structure, local conventions): loaded only when Claude works there.',
  'Citer les commandes d’un seul paquet (`pnpm --filter <paquet> test`) : plus rapides et moins de sortie qu’un test global.':
    'Cite single-package commands (`pnpm --filter <package> test`): faster and less output than a global test run.',
  'Autoriser les commandes sûres (tests, lint) et refuser `.env`, secrets.':
    'Allow safe commands (tests, lint) and deny `.env`, secrets.',
  'Ajouter un hook PostToolUse `Edit|Write` lançant le formatter.':
    'Add a PostToolUse `Edit|Write` hook that runs the formatter.',
  'Extraire les procédures ponctuelles (release, migration…) en skills.':
    'Extract occasional procedures (release, migration…) into skills.',
  'Optionnel : un agent reviewer ou test-runner avec outils restreints.':
    'Optional: a reviewer or test-runner agent with restricted tools.',
  'Ajouter `CLAUDE.local.md` et `.claude/settings.local.json` à .gitignore.':
    'Add `CLAUDE.local.md` and `.claude/settings.local.json` to .gitignore.',
  'Ajouter un README.': 'Add a README.',
  'Claude vérifie son travail par les tests : sans eux, il devine.':
    'Claude checks its work with tests: without them, it guesses.',
  'Ajouter ESLint/Biome/Ruff… et l’appeler par hook.': 'Add ESLint/Biome/Ruff… and run it from a hook.',
  'Ajouter Prettier/Biome/Black/gofmt.': 'Add Prettier/Biome/Black/gofmt.',
  'Activer TypeScript strict / mypy / pyright.': 'Enable strict TypeScript / mypy / pyright.',
  'Ajouter une CI qui lance lint + tests.': 'Add a CI that runs lint + tests.',
  'Committer le lockfile.': 'Commit the lockfile.',
  'Ignorer .env et documenter les variables dans .env.example.':
    'Ignore .env and document the variables in .env.example.',
};

/** Détails avec une valeur : motif français → anglais (le premier qui correspond gagne). */
export const analysisPatternsEn: [RegExp, string][] = [
  [
    /^AGENTS\.md présent \((\d+) lignes\), mais sans CLAUDE\.md Claude Code ne le lit pas\.$/,
    'AGENTS.md present ($1 lines), but without CLAUDE.md Claude Code does not read it.',
  ],
  [/^(.+) présent \((\d+) lignes\)\.$/, '$1 present ($2 lines).'],
  [/^(\d+) lignes \(cible < (\d+), max (\d+)\)\.$/, '$1 lines (target < $2, max $3).'],
  [/^(\d+) commande\(s\) exacte\(s\) trouvée\(s\)\.$/, '$1 exact command(s) found.'],
  [/^(\d+) secret\(s\) probable\(s\)\.$/, '$1 probable secret(s).'],
  [/^(\d+) fichier\(s\) avec formulations vagues\.$/, '$1 file(s) with vague wording.'],
  [/^(\d+) import\(s\), (\d+) cassé\(s\)\.$/, '$1 import(s), $2 broken.'],
  [/^(\d+) fichier\(s\) du dépôt cité\(s\) : (.+)\.$/, '$1 repository file(s) cited: $2.'],
  [
    /^(\d+) fichier\(s\) rules \((\d+) avec paths\), (\d+) CLAUDE\.md de sous-dossier\.$/,
    '$1 rules file(s) ($2 with paths), $3 subfolder CLAUDE.md.',
  ],
  [
    /^(\d+)\/(\d+) paquet\(s\) avec un CLAUDE\.md ou une règle paths: ; sans : (.+)\.$/,
    '$1/$2 package(s) with a CLAUDE.md or a paths: rule; without: $3.',
  ],
  [
    /^(\d+)\/(\d+) paquet\(s\) avec un CLAUDE\.md ou une règle paths:\.$/,
    '$1/$2 package(s) with a CLAUDE.md or a paths: rule.',
  ],
  [
    /^(\d+) skill\(s\), (\d+) commande\(s\), (\d+) skill\(s\) sans description utile\.$/,
    '$1 skill(s), $2 command(s), $3 skill(s) without a useful description.',
  ],
  [/^(\d+) skill\(s\), (\d+) commande\(s\)\.$/, '$1 skill(s), $2 command(s).'],
  [/^Non ignoré\(s\) : (.+)\.$/, 'Not ignored: $1.'],
  [/^(\d+) fichier\(s\) de test\.$/, '$1 test file(s).'],
];
