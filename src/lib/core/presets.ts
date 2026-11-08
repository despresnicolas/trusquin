import type { Kind, Project, Rule, Scope } from './types';

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function newRule(partial: Partial<Rule> = {}): Rule {
  return {
    id: newId(),
    kind: 'rule',
    enabled: true,
    title: '',
    body: '',
    category: 'conventions',
    scope: 'project',
    targets: [],
    ...partial,
  };
}

export interface Template {
  label: string;
  hint: string;
  rule: Partial<Rule>;
}

/** Modèles prêts à l'emploi, à adapter au repo. */
export const TEMPLATES: Template[] = [
  {
    label: 'Commandes du projet',
    hint: 'Indispensable : Claude lance les bonnes commandes au lieu de deviner.',
    rule: {
      title: 'Commandes',
      category: 'commands',
      scope: 'project',
      body: 'Installer : `pnpm install`\nDev : `pnpm dev`\nTests : `pnpm test`\nUn seul test : `pnpm test -- path/to/file.test.ts`\nTypecheck : `pnpm typecheck`\nLint : `pnpm lint`\nAvant de rendre la main : `pnpm typecheck && pnpm lint && pnpm test`',
    },
  },
  {
    label: 'Architecture (WHAT / WHY)',
    hint: 'Les dossiers clés et les décisions que Claude ne peut pas deviner.',
    rule: {
      title: 'Architecture',
      category: 'architecture',
      scope: 'project',
      body: '`apps/api` : API REST (Fastify), seule à parler à la base\n`apps/web` : front SvelteKit, appelle l’API via `src/lib/api.ts`\n`packages/shared` : types partagés, aucune dépendance runtime\nPourquoi : la base n’est jamais exposée au front (contrainte RGPD)',
    },
  },
  {
    label: 'Monorepo : carte et commandes ciblées',
    hint: 'Une ligne par paquet et les commandes d’un seul paquet : Claude sait où chercher et ne lance pas tout le dépôt.',
    rule: {
      title: 'Monorepo',
      category: 'architecture',
      scope: 'project',
      body: 'Workspace pnpm : `apps/*` et `packages/*` ; lancer Claude depuis la racine\n`apps/web` : front, dépend de `packages/ui`\n`packages/api` : API, seule à parler à la base\n`packages/ui` : composants, sans dépendance interne\nTests d’un paquet : `pnpm --filter <paquet> test`\nUn seul test : `pnpm --filter <paquet> exec vitest run <fichier>`\nPaquets touchés depuis main : `pnpm turbo run lint test --filter=...[origin/main]`\nCe qui ne vaut que pour un paquet va dans son CLAUDE.md',
    },
  },
  {
    label: 'Monorepo : CLAUDE.md de paquet',
    hint: 'Chargé seulement quand Claude travaille dans ce paquet : ses commandes, sa structure, son fichier exemplaire.',
    rule: {
      title: 'Paquet API',
      category: 'commands',
      scope: 'directory',
      targets: ['packages/api'],
      body: 'Tests : `pnpm --filter @app/api test`\nUn seul test : `pnpm --filter @app/api exec vitest run src/x.test.ts`\nPoint d’entrée : `src/server.ts` ; routes dans `src/routes/`\nNouvelle route : suivre `src/routes/users.ts`\nDépendances internes autorisées : `packages/db` uniquement',
    },
  },
  {
    label: 'Règles API (ciblées par chemin)',
    hint: 'Chargées seulement quand Claude touche ces fichiers.',
    rule: {
      title: 'Endpoints API',
      category: 'conventions',
      scope: 'path',
      targets: ['apps/api/src/**/*.ts'],
      body: 'Valider chaque entrée avec le schéma zod du dossier `schemas/`\nRetourner les erreurs via `httpError()` de `src/errors.ts`\nToute nouvelle route : ajouter le fichier Bruno correspondant dans `bruno/`',
    },
  },
  {
    label: 'Exemple de référence (few-shot)',
    hint: 'Montrer plutôt qu’expliquer : Claude reproduit la structure d’un fichier exemplaire du dépôt.',
    rule: {
      title: 'Composants : suivre l’exemple',
      category: 'conventions',
      scope: 'path',
      targets: ['src/components/**'],
      body: 'Nouveau composant : partir de `src/components/Button.svelte` (props typées, styles via variables CSS)\nSon test : suivre `src/components/Button.test.ts`',
    },
  },
  {
    label: 'Tests',
    hint: 'Où sont les tests, comment les lancer, ce qui est attendu.',
    rule: {
      title: 'Tests',
      category: 'testing',
      scope: 'topic',
      body: 'Tests à côté du code : `foo.ts` → `foo.test.ts`\nPas de mock de la base : utiliser `createTestDb()` de `test/helpers.ts`\nTout bug corrigé arrive avec un test qui échouait avant',
    },
  },
  {
    label: 'Git / MR',
    hint: 'Format de commit et règles de branche.',
    rule: {
      title: 'Git',
      category: 'git',
      scope: 'project',
      body: 'Commits au format Conventional Commits (`feat:`, `fix:`, `chore:`)\nNe jamais lancer `git push` ni `git commit` : proposer le message\nBranches : `feat/<ticket>-<slug>`',
    },
  },
  {
    label: 'Glossaire métier',
    hint: 'Les termes du domaine évitent les mauvais noms de variables.',
    rule: {
      title: 'Glossaire',
      category: 'domain',
      scope: 'project',
      body: '**Chantier** : projet client facturable (table `projects`)\n**Lot** : sous-ensemble d’un chantier, unité de planning',
    },
  },
  {
    label: 'Préférence perso',
    hint: 'Non versionnée (CLAUDE.local.md).',
    rule: {
      title: 'Mes préférences',
      category: 'workflow',
      scope: 'local',
      body: 'Répondre en français\nMontrer le diff avant de modifier plus de 3 fichiers',
    },
  },
  {
    label: 'Hook : formatter après édition',
    hint: 'Déterministe : remplace toute règle de style dans CLAUDE.md.',
    rule: {
      kind: 'hook',
      title: 'Prettier après chaque édition',
      event: 'PostToolUse',
      matcher: 'Edit|Write|MultiEdit',
      command: "jq -r '.tool_input.file_path' | xargs pnpm exec prettier --write --ignore-unknown",
    },
  },
  {
    label: 'Hook : bloquer .env',
    hint: 'Refuse toute édition des fichiers secrets (exit 2 = blocage).',
    rule: {
      kind: 'hook',
      title: 'Protéger .env',
      event: 'PreToolUse',
      matcher: 'Edit|Write|MultiEdit',
      command:
        "jq -r '.tool_input.file_path' | grep -qE '(^|/)\\.env' && { echo \"Fichier protégé\" >&2; exit 2; } || exit 0",
    },
  },
  {
    label: 'Slash command : /review',
    hint: 'Prompt réutilisable lancé à la main.',
    rule: {
      kind: 'command',
      title: 'Review',
      name: 'review',
      description: 'Relire le diff courant',
      argumentHint: '[branche de base]',
      tools: 'Bash(git diff:*), Read, Grep',
      body: 'Relis `git diff ${ARGUMENTS:-main}...HEAD`.\nPour chaque problème : `fichier:ligne`, gravité, correction proposée.\nIgnore le formatage (géré par hook).',
    },
  },
  {
    label: 'Slash command : /plan',
    hint: 'Planifier en tranches testables (balles traçantes) et faire valider plan.md avant de coder.',
    rule: {
      kind: 'command',
      title: 'Plan',
      name: 'plan',
      description: 'Découpe une fonctionnalité en tranches testables dans plan.md, sans coder',
      argumentHint: '[fonctionnalité]',
      tools: 'Read, Grep, Glob, Write',
      body: 'Rédige `plan.md` pour : $ARGUMENTS\n\nDécoupe en tranches verticales (« balles traçantes ») : chaque tranche traverse base, API et UI et se termine par un test qui passe.\nPour chaque tranche : objectif, fichiers touchés, test d’acceptation.\nArrête-toi après `plan.md` et attends ma validation avant de coder.\nUne fonctionnalité par session ; pour travailler en parallèle, un worktree git par fonctionnalité.',
    },
  },
  {
    label: 'Skill : release',
    hint: 'Procédure ponctuelle chargée seulement quand elle sert.',
    rule: {
      kind: 'skill',
      title: 'Release',
      name: 'release',
      description:
        'Prépare une release : changelog, bump de version, tag. Use when the user asks to release, publish or bump the version.',
      body: '# Release\n\n1. Lire les commits depuis le dernier tag : `git log $(git describe --tags --abbrev=0)..HEAD --oneline`\n2. Mettre à jour `CHANGELOG.md`\n3. `pnpm version <patch|minor|major> --no-git-tag-version`\n4. Vérifier : `pnpm test` passe et le CHANGELOG cite chaque commit\n5. Proposer les commandes git, ne pas les lancer',
    },
  },
  {
    label: 'Skill : debug',
    hint: 'Méthode en 4 étapes : reproduire, isoler, diagnostiquer, corriger.',
    rule: {
      kind: 'skill',
      title: 'Debug',
      name: 'debug',
      description:
        'Corrige un bug méthodiquement : reproduire, isoler, diagnostiquer, corriger. Use when the user reports a bug, an error, a failing test or a stack trace.',
      body: '# Debug\n\n1. Reproduire : obtenir le message d’erreur complet et la stack trace, et une commande qui échoue à coup sûr\n2. Isoler : réduire au plus petit cas, idéalement un test qui échoue\n3. Diagnostiquer : remonter à la cause racine avant de modifier quoi que ce soit\n4. Corriger : changer la cause, garder le test comme non-régression, relancer toute la suite',
    },
  },
  {
    label: 'Skill : modèle complet',
    hint: 'La structure d’une bonne skill : principe, erreurs fréquentes et leur raison, étapes, vérification, détail à la demande.',
    rule: {
      kind: 'skill',
      title: 'Migration de base',
      name: 'db-migration',
      description:
        'Crée et applique une migration de base de données sans perte de données. Use when the user asks to change the schema, add a column or a table, or write a migration.',
      body: '# Migration de base\n\nPrincipe : une migration se rejoue sur la base de production sans perte de données.\n\n## Erreurs fréquentes\n\n- Renommer une colonne en une étape casse les instances encore déployées : ajouter, copier, puis supprimer en trois migrations\n- Modifier une migration déjà appliquée fait diverger les environnements : créer une nouvelle migration\n\n## Étapes\n\n1. Lire le schéma actuel (`db/schema.sql`) et la dernière migration de `db/migrations/`\n2. Créer le fichier : `pnpm db:new <nom>`\n3. Écrire `up` et `down` en suivant `db/migrations/0042_add_orders.sql`\n4. Appliquer en local : `pnpm db:migrate`, puis `pnpm db:rollback` et `pnpm db:migrate`\n5. Vérifier : `pnpm test` passe et le rollback ne perd aucune ligne\n\n## À la demande\n\n- Table de plus d’un million de lignes : lire `references/gros-volumes.md` avant l’étape 3',
    },
  },
  {
    label: 'Agent : test-runner',
    hint: 'Contexte isolé, outils restreints.',
    rule: {
      kind: 'agent',
      title: 'Test runner',
      name: 'test-runner',
      description: 'Lance les tests et analyse les échecs. Use proactively after code changes to verify nothing broke.',
      tools: 'Bash, Read, Grep, Glob',
      model: 'sonnet',
      body: 'Tu lances `pnpm test` puis, pour chaque échec, tu identifies la cause racine.\nTu ne modifies aucun fichier. Tu rends : test, cause, fichier:ligne, correction suggérée.',
    },
  },
];

/** Modèle de départ pour corriger un critère d'analyse, par identifiant de critère. */
const CRITERION_TEMPLATES: Record<string, string> = {
  'root-memory': 'Commandes du projet',
  commands: 'Commandes du projet',
  architecture: 'Architecture (WHAT / WHY)',
  modular: 'Règles API (ciblées par chemin)',
  hooks: 'Hook : formatter après édition',
  'on-demand': 'Skill : release',
  agents: 'Agent : test-runner',
  examples: 'Exemple de référence (few-shot)',
  'package-memory': 'Monorepo : CLAUDE.md de paquet',
  'targeted-commands': 'Monorepo : carte et commandes ciblées',
};

export function templateForCriterion(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.label === CRITERION_TEMPLATES[id]);
}

/** `name` : l'interface passe le nom par défaut traduit ; core reste sans i18n. */
export function starterProject(name = 'Mon projet'): Project {
  return {
    name,
    description: '',
    stack: '',
    useAgentsMd: false,
    permissions: { allow: ['Bash(pnpm test:*)', 'Bash(pnpm lint:*)'], deny: ['Read(./.env)', 'Read(./.env.*)'] },
    rules: [],
  };
}

/** Situation type → élément Claude Code et emplacement. `kind` / `scope` relient le pattern à ses modèles. */
export interface Pattern {
  question: string;
  answer: string;
  where: string;
  kind?: Kind;
  scope?: Scope;
}

/** Patterns affichés dans l'onglet Patterns, du plus courant au plus spécialisé. */
export const PATTERNS: Pattern[] = [
  {
    question: 'Vrai pour tout le projet, utile à chaque tâche ?',
    answer: 'Règle « Projet »',
    where: 'CLAUDE.md',
    kind: 'rule',
    scope: 'project',
  },
  {
    question: 'Vrai pour tout le projet mais long (tests, sécu…) ?',
    answer: 'Règle « Thème »',
    where: '.claude/rules/<thème>.md',
    kind: 'rule',
    scope: 'topic',
  },
  {
    question: 'Vrai seulement pour certains fichiers (API, migrations, front) ?',
    answer: 'Règle « Chemins »',
    where: '.claude/rules/*.md + paths:',
    kind: 'rule',
    scope: 'path',
  },
  {
    question: 'Spécifique à un sous-projet de monorepo ?',
    answer: 'Règle « Dossier »',
    where: '<dossier>/CLAUDE.md',
    kind: 'rule',
    scope: 'directory',
  },
  {
    question: 'Ma préférence perso, pas celle de l’équipe ?',
    answer: 'Règle « Perso »',
    where: 'CLAUDE.local.md ou ~/.claude/CLAUDE.md',
    kind: 'rule',
    scope: 'local',
  },
  {
    question: 'Procédure ponctuelle (release, migration, audit) ?',
    answer: 'Skill',
    where: '.claude/skills/<nom>/SKILL.md',
    kind: 'skill',
  },
  {
    question: 'Prompt que je lance moi-même ?',
    answer: 'Slash command',
    where: '.claude/commands/<nom>.md',
    kind: 'command',
  },
  {
    question: 'Tâche à déléguer avec contexte et outils séparés ?',
    answer: 'Sous-agent',
    where: '.claude/agents/<nom>.md',
    kind: 'agent',
  },
  {
    question: 'Doit arriver à 100 % (format, lint, blocage) ?',
    answer: 'Hook',
    where: '.claude/settings.json',
    kind: 'hook',
  },
  { question: 'Accès à autoriser ou interdire ?', answer: 'Permission', where: '.claude/settings.json' },
];

/** Modèles qui répondent à un pattern (même type, et même portée pour une règle). */
export function templatesFor(pattern: Pattern): Template[] {
  if (!pattern.kind) return [];
  return TEMPLATES.filter(
    (t) =>
      (t.rule.kind ?? 'rule') === pattern.kind &&
      (pattern.kind !== 'rule' || (t.rule.scope ?? 'project') === pattern.scope),
  );
}

/** Étape de l'arbre de décision de l'onglet Patterns : chaque choix mène à une autre étape ou à un pattern. */
export interface Step {
  question: string;
  hint?: string;
  choices: { label: string; next: Step | Pattern }[];
}

export function isStep(node: Step | Pattern): node is Step {
  return 'choices' in node;
}

function pattern(answer: string): Pattern {
  const p = PATTERNS.find((p) => p.answer === answer);
  if (!p) throw new Error(`Pattern inconnu : ${answer}`);
  return p;
}

/** Du plus contraignant (déterministe) au plus courant (règle), comme on trancherait à la main. */
export const DECISION_TREE: Step = {
  question: 'Doit-il arriver à 100 %, sans dépendre du modèle ?',
  hint: 'Une consigne est suivie la plupart du temps ; seul le harness garantit une exécution systématique.',
  choices: [
    {
      label: 'Oui',
      next: {
        question: 'Il s’agit de…',
        choices: [
          { label: 'Lancer une action (format, lint, blocage d’un fichier)', next: pattern('Hook') },
          { label: 'Autoriser ou interdire un accès (commande, fichier)', next: pattern('Permission') },
        ],
      },
    },
    {
      label: 'Non',
      next: {
        question: 'Tu le lances toi-même, à la demande ?',
        choices: [
          { label: 'Oui, par /nom', next: pattern('Slash command') },
          {
            label: 'Non, Claude s’en sert seul',
            next: {
              question: 'C’est une tâche à déléguer, avec son propre contexte et ses outils ?',
              hint: 'Seul le résumé revient dans la conversation principale.',
              choices: [
                { label: 'Oui', next: pattern('Sous-agent') },
                {
                  label: 'Non',
                  next: {
                    question: 'C’est une procédure ponctuelle (release, migration, audit) ?',
                    hint: 'Chargée seulement quand la demande correspond : ne coûte rien le reste du temps.',
                    choices: [
                      { label: 'Oui', next: pattern('Skill') },
                      {
                        label: 'Non, une consigne à suivre',
                        next: {
                          question: 'C’est une règle. Elle vaut pour…',
                          choices: [
                            { label: 'Tout le projet, utile à chaque tâche', next: pattern('Règle « Projet »') },
                            { label: 'Tout le projet, mais longue (tests, sécu…)', next: pattern('Règle « Thème »') },
                            { label: 'Certains fichiers seulement', next: pattern('Règle « Chemins »') },
                            { label: 'Un sous-projet de monorepo', next: pattern('Règle « Dossier »') },
                            { label: 'Moi seulement', next: pattern('Règle « Perso »') },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
};
