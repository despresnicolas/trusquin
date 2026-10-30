/** Ce que l'élément devient dans le repo. */
export type Kind = 'rule' | 'command' | 'skill' | 'agent' | 'hook';

/**
 * Portée d'une règle (kind = 'rule') :
 * - project   : CLAUDE.md racine, chargé à chaque session
 * - topic     : .claude/rules/<categorie>.md, chargé à chaque session (modulaire)
 * - path      : .claude/rules/*.md avec frontmatter `paths`, chargé quand Claude touche ces fichiers
 * - directory : <dossier>/CLAUDE.md, chargé quand Claude travaille dans ce dossier
 * - local     : CLAUDE.local.md, préférences perso non versionnées
 * - user      : ~/.claude/CLAUDE.md, valable pour tous les projets
 */
export type Scope = 'project' | 'topic' | 'path' | 'directory' | 'local' | 'user';

export type Category =
  | 'overview'
  | 'commands'
  | 'architecture'
  | 'conventions'
  | 'testing'
  | 'security'
  | 'git'
  | 'domain'
  | 'workflow'
  | 'other';

export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'UserPromptSubmit'
  | 'Stop'
  | 'SubagentStop'
  | 'SessionStart'
  | 'Notification'
  | 'PreCompact';

export interface Rule {
  id: string;
  kind: Kind;
  enabled: boolean;
  title: string;
  /** Une instruction par ligne pour les règles ; prompt complet pour command/skill/agent. */
  body: string;
  category: Category;
  scope: Scope;
  /** Globs (scope path) ou dossiers (scope directory). */
  targets: string[];
  /** command / skill / agent : identifiant kebab-case. */
  name?: string;
  /** command / skill / agent : quand l'utiliser. */
  description?: string;
  /** agent / command : outils autorisés, séparés par des virgules. */
  tools?: string;
  /** agent : modèle (sonnet, opus, haiku, inherit). */
  model?: string;
  /** command : indice d'argument affiché dans l'autocomplétion. */
  argumentHint?: string;
  event?: HookEvent;
  matcher?: string;
  /** hook : commande shell exécutée. */
  command?: string;
}

export interface Project {
  name: string;
  description: string;
  stack: string;
  /** Écrit le contenu racine dans AGENTS.md et fait importer `@AGENTS.md` par CLAUDE.md. */
  useAgentsMd: boolean;
  permissions: { allow: string[]; deny: string[] };
  rules: Rule[];
}

/** Quand Claude charge le fichier dans son contexte. */
export type Loading = 'always' | 'on-path' | 'on-demand' | 'personal' | 'deterministic';

export interface GeneratedFile {
  path: string;
  content: string;
  loading: Loading;
  /** Pourquoi ce fichier est à cet endroit. */
  explanation: string;
  sources: string[];
}

export type Severity = 'error' | 'warning' | 'info';

export interface Issue {
  severity: Severity;
  code: string;
  message: string;
  fix: string;
  file?: string;
  ruleId?: string;
}

export interface QualityReport {
  score: number;
  issues: Issue[];
  /** Nombre d'instructions chargées à chaque session. */
  alwaysLoadedInstructions: number;
}

/** Repo vu comme une liste de chemins + contenu des fichiers texte pertinents. */
export interface RepoSnapshot {
  paths: string[];
  contents: Record<string, string>;
}

export type CriterionStatus = 'pass' | 'partial' | 'fail' | 'na';

export interface Criterion {
  id: string;
  group: 'claude' | 'practices';
  label: string;
  points: number;
  max: number;
  status: CriterionStatus;
  detail: string;
  fix?: string;
}

export interface RepoAnalysis {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  criteria: Criterion[];
  memoryIssues: Issue[];
  memoryFiles: string[];
}
