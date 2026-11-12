import type { Category, GeneratedFile, HookEvent, Project, Rule } from './types';

export const CATEGORY_LABELS: Record<Category, string> = {
  overview: 'Vue d’ensemble',
  commands: 'Commandes',
  architecture: 'Architecture',
  conventions: 'Conventions',
  testing: 'Tests',
  security: 'Sécurité',
  git: 'Git & workflow',
  domain: 'Glossaire métier',
  workflow: 'Méthode de travail',
  other: 'Divers',
};

const CATEGORY_ORDER: Category[] = [
  'overview',
  'commands',
  'architecture',
  'conventions',
  'testing',
  'security',
  'git',
  'domain',
  'workflow',
  'other',
];

export const USER_PREFIX = '~/';

export function slug(value: string): string {
  return (
    value
      .replace(/œ/gi, 'oe')
      .replace(/æ/gi, 'ae')
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'item'
  );
}

/** Transforme le corps d'une règle en liste markdown, en gardant titres et blocs de code. */
export function toBullets(body: string): string {
  const out: string[] = [];
  let inFence = false;
  for (const raw of body.split('\n')) {
    const line = raw.trimEnd();
    if (line.trim().startsWith('```')) inFence = !inFence;
    if (inFence || line.trim().startsWith('```')) {
      out.push(line);
      continue;
    }
    if (!line.trim()) continue;
    if (/^\s*([-*+]|\d+\.|#|>|\|)/.test(line)) out.push(line);
    else out.push(`- ${line.trim()}`);
  }
  return out.join('\n');
}

function frontmatter(fields: Record<string, string | string[] | undefined>): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === '' || (Array.isArray(value) && !value.length)) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - "${item}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

function sections(rules: Rule[]): string {
  const parts: string[] = [];
  for (const category of CATEGORY_ORDER) {
    const inCategory = rules.filter((r) => r.category === category);
    if (!inCategory.length) continue;
    parts.push(`## ${CATEGORY_LABELS[category]}`, '');
    for (const rule of inCategory) {
      if (inCategory.length > 1 && rule.title) parts.push(`### ${rule.title}`, '');
      parts.push(toBullets(rule.body), '');
    }
  }
  return parts.join('\n');
}

function finalize(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    map.set(k, [...(map.get(k) ?? []), item]);
  }
  return map;
}

function rootMemory(project: Project, rules: Rule[], hooks: Rule[]): string {
  const head = [`# ${project.name || 'Projet'}`, ''];
  if (project.description) head.push(project.description.trim(), '');
  if (project.stack) head.push(`**Stack :** ${project.stack.trim()}`, '');
  const automation = hooks.length
    ? [
        '## Automatisations',
        '',
        'Ces contrôles tournent via des hooks (`.claude/settings.json`) : ne pas les refaire à la main.',
        '',
        ...hooks.map((h) => `- ${h.title || h.command} (${h.event}${h.matcher ? ` · ${h.matcher}` : ''})`),
        '',
      ]
    : [];
  // Ancrage : les règles critiques ouvrent le fichier et sont rappelées à la fin (biais de primauté et de récence).
  const critical = rules.filter((r) => r.critical);
  const top = critical.length
    ? [
        '## Règles critiques',
        '',
        ...critical.flatMap((r) => [
          ...(critical.length > 1 && r.title ? [`### ${r.title}`, ''] : []),
          toBullets(r.body),
          '',
        ]),
      ]
    : [];
  const bottom = critical.length ? ['## Rappels', '', ...critical.map((r) => toBullets(r.body)), ''] : [];
  const others = rules.filter((r) => !r.critical);
  return finalize([...head, ...top, sections(others), ...automation, ...bottom].join('\n'));
}

function settingsFile(project: Project, hooks: Rule[]): string | null {
  const settings: Record<string, unknown> = {};
  const allow = project.permissions.allow.filter(Boolean);
  const deny = project.permissions.deny.filter(Boolean);
  if (allow.length || deny.length) settings.permissions = { allow, deny };
  if (hooks.length) {
    const byEvent: Partial<Record<HookEvent, unknown[]>> = {};
    for (const [event, list] of groupBy(hooks, (h) => h.event ?? 'PostToolUse')) {
      byEvent[event as HookEvent] = [...groupBy(list, (h) => h.matcher ?? '')].map(([matcher, group]) => ({
        ...(matcher ? { matcher } : {}),
        hooks: group.map((h) => ({ type: 'command', command: h.command ?? '' })),
      }));
    }
    settings.hooks = byEvent;
  }
  return Object.keys(settings).length ? JSON.stringify(settings, null, 2) + '\n' : null;
}

const ids = (list: Rule[]) => list.map((r) => r.id);

const byScope = (rules: Rule[], scope: Rule['scope']) => rules.filter((r) => r.scope === scope);

/** Mémoire racine : CLAUDE.md seul, ou AGENTS.md importé par un CLAUDE.md d'une ligne. */
function rootFiles(project: Project, projectRules: Rule[], hooks: Rule[]): GeneratedFile[] {
  const content = rootMemory(project, projectRules, hooks);
  if (!project.useAgentsMd) {
    return [
      {
        path: 'CLAUDE.md',
        content,
        loading: 'always',
        explanation: 'Mémoire racine versionnée, chargée à chaque session. Viser < 100 lignes.',
        sources: ids(projectRules),
      },
    ];
  }
  return [
    {
      path: 'AGENTS.md',
      content,
      loading: 'always',
      explanation: 'Mémoire racine lisible par tous les agents IA (Codex, Cursor, Claude…).',
      sources: ids(projectRules),
    },
    {
      path: 'CLAUDE.md',
      content: '@AGENTS.md\n',
      loading: 'always',
      explanation: 'Point d’entrée Claude Code : importe AGENTS.md pour éviter la duplication.',
      sources: [],
    },
  ];
}

/** Un .claude/rules/<catégorie>.md par catégorie de règles thématiques. */
function topicFiles(rules: Rule[]): GeneratedFile[] {
  return [...groupBy(byScope(rules, 'topic'), (r) => r.category)].map(([category, list]) => ({
    path: `.claude/rules/${category}.md`,
    content: finalize(`# ${CATEGORY_LABELS[category as Category]}\n\n${sections(list)}`),
    loading: 'always',
    explanation: 'Règle thématique sans `paths` : chargée à chaque session, mais isolée pour rester lisible.',
    sources: ids(list),
  }));
}

/** Nom d'un fichier de règles à chemins. Une seule règle : son titre. Sinon : catégorie + dossiers fixes + extension du glob. */
function pathFileBase(list: Rule[]): string {
  const first = list[0];
  if (list.length === 1 && first.title) return slug(first.title);
  const glob = first.targets[0] ?? '';
  const anchor = glob.split('/').filter((p) => p && !/[*?[{]/.test(p));
  const ext = glob.match(/\*\.(\w+)$/)?.[1];
  return slug([first.category, ...anchor, ext].filter(Boolean).join('-'));
}

/** `base`, ou `base-2`, `base-3`… s'il est déjà pris ; le nom retenu est ajouté à `used`. */
function uniqueName(base: string, used: Set<string>): string {
  let name = base;
  for (let i = 2; used.has(name); i++) name = `${base}-${i}`;
  used.add(name);
  return name;
}

/** Un fichier par groupe de règles de même catégorie et mêmes globs, chargé seulement sur ces chemins. */
function pathFiles(rules: Rule[]): GeneratedFile[] {
  const used = new Set<string>();
  const groups = groupBy(byScope(rules, 'path'), (r) => `${r.category}|${[...r.targets].sort().join(',')}`);
  return [...groups.values()].map((list) => {
    const { targets } = list[0];
    return {
      path: `.claude/rules/${uniqueName(pathFileBase(list), used)}.md`,
      content: finalize(frontmatter({ paths: targets }) + sections(list)),
      loading: 'on-path',
      explanation: `Chargée seulement quand Claude lit ou modifie ${targets.join(', ')}.`,
      sources: ids(list),
    };
  });
}

/** Un CLAUDE.md par dossier ciblé. */
function directoryFiles(rules: Rule[]): GeneratedFile[] {
  const groups = groupBy(byScope(rules, 'directory'), (r) => (r.targets[0] ?? '').replace(/^\.?\/+|\/+$/g, ''));
  return [...groups].map(([dir, list]) => ({
    path: `${dir ? `${dir}/` : ''}CLAUDE.md`,
    content: finalize(`# ${dir || 'racine'}\n\n${sections(list)}`),
    loading: 'on-path',
    explanation: `Mémoire de sous-dossier : chargée quand Claude travaille dans ${dir}/. Prime sur la racine.`,
    sources: ids(list),
  }));
}

/** Préférences personnelles : CLAUDE.local.md (projet) et ~/.claude/CLAUDE.md (utilisateur), si non vides. */
function personalFiles(rules: Rule[]): GeneratedFile[] {
  const local = byScope(rules, 'local');
  const user = byScope(rules, 'user');
  const files: GeneratedFile[] = [];
  if (local.length) {
    files.push({
      path: 'CLAUDE.local.md',
      content: finalize(`# Préférences locales\n\n${sections(local)}`),
      loading: 'personal',
      explanation: 'Préférences personnelles du projet. À garder dans .gitignore.',
      sources: ids(local),
    });
  }
  if (user.length) {
    files.push({
      path: `${USER_PREFIX}.claude/CLAUDE.md`,
      content: finalize(`# Préférences globales\n\n${sections(user)}`),
      loading: 'personal',
      explanation: 'Mémoire utilisateur, tous projets confondus. À fusionner dans ~/.claude/CLAUDE.md.',
      sources: ids(user),
    });
  }
  return files;
}

const fileName = (rule: Rule) => slug(rule.name || rule.title);

function commandFile(rule: Rule): GeneratedFile {
  const name = fileName(rule);
  const fields = { description: rule.description, 'argument-hint': rule.argumentHint, 'allowed-tools': rule.tools };
  return {
    path: `.claude/commands/${name}.md`,
    content: finalize(frontmatter(fields) + rule.body),
    loading: 'on-demand',
    explanation: `Slash command /${name}, lancée explicitement par l’utilisateur.`,
    sources: [rule.id],
  };
}

function skillFile(rule: Rule): GeneratedFile {
  const name = fileName(rule);
  return {
    path: `.claude/skills/${name}/SKILL.md`,
    content: finalize(frontmatter({ name, description: rule.description }) + rule.body),
    loading: 'on-demand',
    explanation: 'Skill : seule la description est en contexte, le corps est chargé quand la tâche correspond.',
    sources: [rule.id],
  };
}

function agentFile(rule: Rule): GeneratedFile {
  const name = fileName(rule);
  const fields = { name, description: rule.description, tools: rule.tools, model: rule.model };
  return {
    path: `.claude/agents/${name}.md`,
    content: finalize(frontmatter(fields) + rule.body),
    loading: 'on-demand',
    explanation: 'Sous-agent avec son propre contexte, délégué par Claude ou appelé par son nom.',
    sources: [rule.id],
  };
}

/** .claude/settings.json, seulement s'il y a des permissions ou des hooks. */
function settingsFiles(project: Project, hooks: Rule[]): GeneratedFile[] {
  const content = settingsFile(project, hooks);
  if (!content) return [];
  return [
    {
      path: '.claude/settings.json',
      content,
      loading: 'deterministic',
      explanation: 'Permissions et hooks versionnés : exécutés par le harness, pas interprétés par le modèle.',
      sources: ids(hooks),
    },
  ];
}

/** Calcule l'emplacement et le contenu de chaque fichier à partir des règles. */
export function generate(project: Project): GeneratedFile[] {
  const active = project.rules.filter((r) => r.enabled);
  const ofKind = (kind: Rule['kind']) => active.filter((r) => r.kind === kind);
  const rules = ofKind('rule');
  const hooks = ofKind('hook');
  return [
    ...rootFiles(project, byScope(rules, 'project'), hooks),
    ...topicFiles(rules),
    ...pathFiles(rules),
    ...directoryFiles(rules),
    ...personalFiles(rules),
    ...ofKind('command').map(commandFile),
    ...ofKind('skill').map(skillFile),
    ...ofKind('agent').map(agentFile),
    ...settingsFiles(project, hooks),
  ];
}
