import type { Kind, Loading, Project, Rule, Scope } from './types';

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
    label: 'Skill : release',
    hint: 'Procédure ponctuelle chargée seulement quand elle sert.',
    rule: {
      kind: 'skill',
      title: 'Release',
      name: 'release',
      description:
        'Prépare une release : changelog, bump de version, tag. Use when the user asks to release, publish or bump the version.',
      body: '# Release\n\n1. Lire les commits depuis le dernier tag : `git log $(git describe --tags --abbrev=0)..HEAD --oneline`\n2. Mettre à jour `CHANGELOG.md`\n3. `pnpm version <patch|minor|major> --no-git-tag-version`\n4. Proposer les commandes git, ne pas les lancer',
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

export function starterProject(): Project {
  return {
    name: 'Mon projet',
    description: '',
    stack: '',
    useAgentsMd: false,
    permissions: { allow: ['Bash(pnpm test:*)', 'Bash(pnpm lint:*)'], deny: ['Read(./.env)', 'Read(./.env.*)'] },
    rules: [TEMPLATES[0], TEMPLATES[1], TEMPLATES[7]].map((t) => newRule(t.rule)),
  };
}

export const KIND_LABELS: Record<Kind, string> = {
  rule: 'Règle',
  command: 'Slash command',
  skill: 'Skill',
  agent: 'Sous-agent',
  hook: 'Hook',
};

export const SCOPE_LABELS: Record<Scope, string> = {
  project: 'Projet (CLAUDE.md racine)',
  topic: 'Thème (.claude/rules/, toujours chargé)',
  path: 'Chemins (.claude/rules/ + paths)',
  directory: 'Dossier (<dossier>/CLAUDE.md)',
  local: 'Perso projet (CLAUDE.local.md)',
  user: 'Perso global (~/.claude/CLAUDE.md)',
};

export const LOADING_LABELS: Record<Loading, string> = {
  always: 'Toujours chargé',
  'on-path': 'Chargé selon les fichiers touchés',
  'on-demand': 'À la demande',
  personal: 'Personnel, non versionné',
  deterministic: 'Exécuté par le harness',
};

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
