import { lintMemoryText, lintSkill, LIMITS } from './quality';
import type {
  Category,
  ClaudeFile,
  ClaudeFileGroup,
  Criterion,
  CriterionStatus,
  HookEvent,
  Issue,
  RepoAnalysis,
  RepoSnapshot,
  Rule,
} from './types';

export const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.svelte-kit',
  '.nuxt',
  'vendor',
  'target',
  '.venv',
  'venv',
  '__pycache__',
  '.cache',
  'coverage',
  '.idea',
  '.turbo',
]);

/** Fichiers dont le contenu est lu pour l'analyse (le reste : chemin seul). */
export const TEXT_FILES =
  /(^|\/)(CLAUDE(\.local)?\.md|AGENTS\.md|README(\.md)?|\.gitignore|package\.json|pyproject\.toml|settings(\.local)?\.json|SKILL\.md|\.env\.example|composer\.json|Cargo\.toml|go\.mod|pnpm-workspace\.yaml)$|^\.claude\/.*\.md$/i;

function crit(
  id: string,
  group: Criterion['group'],
  label: string,
  max: number,
  status: CriterionStatus,
  detail: string,
  fix?: string,
): Criterion {
  const points = status === 'pass' ? max : status === 'partial' ? Math.round(max / 2) : 0;
  return { id, group, label, max, points, status, detail, fix: status === 'pass' || status === 'na' ? undefined : fix };
}

/** Globs de workspace (pnpm-workspace.yaml ou `workspaces` du package.json racine). */
// shortcut: Cargo, go.work et Nx (project.json) ne sont pas lus, les ajouter si un dépôt de ce type est analysé.
function workspaceGlobs(read: (p: string) => string): string[] {
  const block = read('pnpm-workspace.yaml').match(/^packages:[ \t]*\n((?:[ \t]+.*(?:\n|$))*)/m)?.[1] ?? '';
  const pnpm = [...block.matchAll(/^\s*-\s*['"]?([^'"\n#]+?)['"]?\s*$/gm)].map((m) => m[1]);
  if (pnpm.length) return pnpm;
  try {
    const ws = JSON.parse(read('package.json') || '{}').workspaces;
    const list: unknown = Array.isArray(ws) ? ws : ws?.packages;
    return Array.isArray(list) ? list.filter((g): g is string => typeof g === 'string') : [];
  } catch {
    return [];
  }
}

function globToRegExp(glob: string): RegExp {
  const src = glob
    .replace(/^\.\/|\/$/g, '')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\0')
    .replace(/\*/g, '[^/]+')
    .replace(/\0/g, '.*');
  return new RegExp(`^${src}$`);
}

/** Dossiers des paquets du workspace (ceux qui ont un package.json). Vide hors monorepo. */
function workspacePackages(paths: string[], read: (p: string) => string): string[] {
  const globs = workspaceGlobs(read);
  const include = globs.filter((g) => !g.startsWith('!')).map(globToRegExp);
  const exclude = globs.filter((g) => g.startsWith('!')).map((g) => globToRegExp(g.slice(1)));
  return paths
    .filter((p) => p.endsWith('/package.json'))
    .map((p) => p.slice(0, -'/package.json'.length))
    .filter((d) => include.some((re) => re.test(d)) && !exclude.some((re) => re.test(d)));
}

function frontmatterOf(text: string): string | null {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : null;
}

const stripFrontmatter = (text: string) => text.replace(/^---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/, '');

/** Barème des lettres, de la meilleure à la moins bonne : note minimale sur 100 pour chacune. */
export const GRADES: { grade: RepoAnalysis['grade']; min: number }[] = [
  { grade: 'A', min: 85 },
  { grade: 'B', min: 70 },
  { grade: 'C', min: 55 },
  { grade: 'D', min: 40 },
  { grade: 'E', min: 0 },
];

const grade = (score: number) => GRADES.find((g) => score >= g.min)!.grade;

export function analyzeRepo(repo: RepoSnapshot): RepoAnalysis {
  const { paths, contents } = repo;
  const has = (re: RegExp) => paths.some((p) => re.test(p));
  const find = (re: RegExp) => paths.filter((p) => re.test(p));
  const read = (p: string) => contents[p] ?? '';
  const criteria: Criterion[] = [];

  const memoryFiles = find(/(^|\/)(CLAUDE(\.local)?\.md|AGENTS\.md)$/);
  const rootPath = ['CLAUDE.md', 'AGENTS.md'].find((p) => paths.includes(p));
  let root = rootPath ? read(rootPath) : '';
  // CLAUDE.md qui ne fait qu'importer AGENTS.md : analyser AGENTS.md.
  if (rootPath === 'CLAUDE.md' && /^@AGENTS\.md\s*$/m.test(root) && paths.includes('AGENTS.md')) {
    root = read('AGENTS.md') + '\n' + root;
  }
  const rootLines = root ? root.split('\n').length : 0;
  const rootSpans = root.match(/`[^`\n]+`/g) ?? [];
  const ruleFiles = find(/^\.claude\/rules\/.*\.md$/);

  criteria.push(
    crit(
      'root-memory',
      'claude',
      'Mémoire racine (CLAUDE.md / AGENTS.md)',
      12,
      rootPath === 'CLAUDE.md' ? 'pass' : rootPath ? 'partial' : 'fail',
      rootPath === 'AGENTS.md'
        ? `AGENTS.md présent (${rootLines} lignes), mais sans CLAUDE.md Claude Code ne le lit pas.`
        : rootPath
          ? `${rootPath} présent (${rootLines} lignes).`
          : 'Aucun CLAUDE.md ni AGENTS.md à la racine.',
      rootPath
        ? 'Créer un CLAUDE.md à côté contenant `@AGENTS.md`.'
        : 'Générer un CLAUDE.md avec le générateur ou `/init`, puis élaguer.',
    ),
  );
  criteria.push(
    crit(
      'root-length',
      'claude',
      'Mémoire racine concise',
      6,
      !rootPath ? 'na' : rootLines <= LIMITS.rootWarn ? 'pass' : rootLines <= LIMITS.rootError ? 'partial' : 'fail',
      rootPath ? `${rootLines} lignes (cible < ${LIMITS.rootWarn}, max ${LIMITS.rootError}).` : '—',
      'Déplacer le détail dans .claude/rules/ ou des skills.',
    ),
  );

  const commandSpans = rootSpans.filter((s) =>
    /\b(npm|pnpm|yarn|bun|make|cargo|go|pytest|uv|poetry|composer|php|mvn|gradle|docker|just)\b/.test(s),
  );
  criteria.push(
    crit(
      'commands',
      'claude',
      'Commandes exactes (build/test/lint)',
      8,
      !rootPath ? 'na' : commandSpans.length >= 3 ? 'pass' : commandSpans.length ? 'partial' : 'fail',
      `${commandSpans.length} commande(s) exacte(s) trouvée(s).`,
      'Lister install, dev, test, test ciblé, lint, typecheck, build entre backticks.',
    ),
  );
  const hasArchitecture = /^#{1,3} .*(architecture|structure|organisation|layout|overview|vue d)/im.test(root);
  criteria.push(
    crit(
      'architecture',
      'claude',
      'Section architecture / structure',
      5,
      !rootPath ? 'na' : hasArchitecture ? 'pass' : 'fail',
      hasArchitecture ? 'Section trouvée.' : 'Pas de section décrivant la structure.',
      'Ajouter le WHAT/WHY : dossiers clés, rôle, décisions d’architecture.',
    ),
  );

  const memoryIssues: Issue[] = [];
  for (const file of memoryFiles) {
    memoryIssues.push(...lintMemoryText(file, read(file), file === rootPath));
  }
  for (const file of ruleFiles) memoryIssues.push(...lintMemoryText(file, read(file)));

  const imports = [...root.matchAll(/^\s*@([\w./-]+)/gm)].map((m) => m[1]);
  const broken = imports.filter((p) => !p.startsWith('~') && !paths.includes(p.replace(/^\.\//, '')));
  for (const p of broken) {
    memoryIssues.push({
      severity: 'error',
      code: 'broken-import',
      params: { path: p },
      file: rootPath,
      message: `Import @${p} introuvable.`,
      fix: 'Corriger le chemin ou retirer l’import.',
    });
  }

  // Claude Code ne charge que CLAUDE.md : un AGENTS.md doit être importé par un CLAUDE.md voisin.
  // shortcut: seul l'import depuis le même dossier est reconnu, élargir si des imports croisés apparaissent.
  for (const file of find(/(^|\/)AGENTS\.md$/)) {
    const dir = file.slice(0, -'AGENTS.md'.length);
    const importers = [`${dir}CLAUDE.md`, `${dir}CLAUDE.local.md`].map(read);
    if (importers.some((c) => /^\s*@(\.\/)?AGENTS\.md\s*$/m.test(c))) continue;
    memoryIssues.push({
      severity: 'warning',
      code: 'agents-not-imported',
      params: { dir },
      file,
      message: 'Aucun CLAUDE.md voisin n’importe ce fichier : Claude Code ne le lit pas.',
      fix: `Ajouter la ligne \`@AGENTS.md\` en tête de ${dir}CLAUDE.md (le créer si besoin).`,
    });
  }

  const secrets = memoryIssues.filter((i) => i.code === 'secret');
  criteria.push(
    crit(
      'no-secrets',
      'claude',
      'Aucun secret dans la mémoire',
      8,
      secrets.length ? 'fail' : 'pass',
      secrets.length ? `${secrets.length} secret(s) probable(s).` : 'Rien détecté.',
      'Retirer les valeurs ; référencer seulement les noms de variables.',
    ),
  );
  const vague = memoryIssues.filter((i) => i.code === 'vague');
  criteria.push(
    crit(
      'specific',
      'claude',
      'Règles spécifiques et vérifiables',
      4,
      !memoryFiles.length ? 'na' : vague.length === 0 ? 'pass' : vague.length <= 2 ? 'partial' : 'fail',
      vague.length ? `${vague.length} fichier(s) avec formulations vagues.` : 'Pas de formulation vague détectée.',
      'Remplacer « code propre » par une règle testable.',
    ),
  );
  criteria.push(
    crit(
      'imports',
      'claude',
      'Imports @ valides',
      3,
      !imports.length ? 'na' : broken.length ? 'fail' : 'pass',
      imports.length ? `${imports.length} import(s), ${broken.length} cassé(s).` : 'Aucun import.',
      'Corriger les chemins importés.',
    ),
  );

  // Few-shot : la mémoire pointe vers des fichiers existants du dépôt à prendre pour modèle.
  const memoryText = [...memoryFiles, ...ruleFiles].map(read).join('\n');
  const referenced = [...memoryText.matchAll(/`([\w@./-]+\.\w+)(?::\d+)?`/g)].map((m) => m[1]);
  const examples = [...new Set(referenced.filter((p) => paths.includes(p)))];
  criteria.push(
    crit(
      'examples',
      'claude',
      'Fichiers exemplaires cités',
      3,
      !memoryFiles.length ? 'na' : examples.length ? 'pass' : 'fail',
      examples.length
        ? `${examples.length} fichier(s) du dépôt cité(s) : ${examples.slice(0, 3).join(', ')}.`
        : 'Aucun fichier du dépôt cité en exemple.',
      'Pointer vers un composant, un test ou un endpoint exemplaire (« suivre `src/…` ») plutôt que décrire le style.',
    ),
  );

  const scoped = ruleFiles.filter((p) => /^paths:/m.test(frontmatterOf(read(p)) ?? ''));
  const subMemory = memoryFiles.filter((p) => p.includes('/'));
  criteria.push(
    crit(
      'modular',
      'claude',
      'Règles modulaires (rules/ ou CLAUDE.md de dossier)',
      6,
      scoped.length || subMemory.length ? 'pass' : ruleFiles.length ? 'partial' : 'fail',
      `${ruleFiles.length} fichier(s) rules (${scoped.length} avec paths), ${subMemory.length} CLAUDE.md de sous-dossier.`,
      'Isoler les règles spécifiques dans .claude/rules/*.md avec `paths:`.',
    ),
  );

  const packages = workspacePackages(paths, read);
  const covered = packages.filter(
    (d) =>
      paths.includes(`${d}/CLAUDE.md`) ||
      ruleFiles.some((r) => (frontmatterOf(read(r)) ?? '').match(/^paths:.*$/m)?.[0].includes(`${d}/`)),
  );
  const uncovered = packages.filter((d) => !covered.includes(d));
  criteria.push(
    crit(
      'package-memory',
      'claude',
      'Mémoire par paquet (monorepo)',
      5,
      !packages.length ? 'na' : !uncovered.length ? 'pass' : covered.length ? 'partial' : 'fail',
      !packages.length
        ? 'Pas de workspace détecté.'
        : `${covered.length}/${packages.length} paquet(s) avec un CLAUDE.md ou une règle paths:` +
            (uncovered.length
              ? ` ; sans : ${uncovered.slice(0, 5).join(', ')}${uncovered.length > 5 ? '…' : ''}.`
              : '.'),
      'Ajouter un CLAUDE.md par paquet (commandes, structure, conventions locales) : chargé seulement quand Claude y travaille.',
    ),
  );
  const targeted = rootSpans.some((s) =>
    /--filter|--workspace|\s-F\s|yarn workspace |\b(nx|turbo) (run|affected)\b|lerna .*--scope|cargo \w+ (-p|--package)\b/.test(
      s,
    ),
  );
  criteria.push(
    crit(
      'targeted-commands',
      'claude',
      'Commandes ciblées sur un paquet',
      3,
      !packages.length ? 'na' : targeted ? 'pass' : 'fail',
      !packages.length
        ? 'Pas de workspace détecté.'
        : targeted
          ? 'La mémoire racine cite une commande filtrée par paquet.'
          : 'Aucune commande filtrée (--filter, nx run…) dans la mémoire racine.',
      'Citer les commandes d’un seul paquet (`pnpm --filter <paquet> test`) : plus rapides et moins de sortie qu’un test global.',
    ),
  );

  let settings: { permissions?: { allow?: unknown[]; deny?: unknown[] }; hooks?: Record<string, unknown[]> } = {};
  try {
    settings = JSON.parse(read('.claude/settings.json') || '{}');
  } catch {
    memoryIssues.push({
      severity: 'error',
      code: 'settings-json',
      file: '.claude/settings.json',
      message: 'JSON invalide.',
      fix: 'Corriger la syntaxe.',
    });
  }
  const perms = settings.permissions ?? {};
  const permCount = (perms.allow?.length ?? 0) + (perms.deny?.length ?? 0);
  criteria.push(
    crit(
      'permissions',
      'claude',
      'Permissions versionnées',
      5,
      perms.deny?.length && perms.allow?.length ? 'pass' : permCount ? 'partial' : 'fail',
      paths.includes('.claude/settings.json')
        ? `${perms.allow?.length ?? 0} allow, ${perms.deny?.length ?? 0} deny.`
        : 'Pas de .claude/settings.json.',
      'Autoriser les commandes sûres (tests, lint) et refuser `.env`, secrets.',
    ),
  );
  const hookCount = Object.values(settings.hooks ?? {}).flat().length;
  criteria.push(
    crit(
      'hooks',
      'claude',
      'Hooks déterministes (format/lint/tests)',
      6,
      hookCount ? 'pass' : 'fail',
      hookCount ? `${hookCount} hook(s).` : 'Aucun hook.',
      'Ajouter un hook PostToolUse `Edit|Write` lançant le formatter.',
    ),
  );

  const skills = find(/^\.claude\/skills\/[^/]+\/SKILL\.md$/);
  const commands = find(/^\.claude\/commands\/.*\.md$/);
  const badSkills = skills.filter((p) => !/^description:\s*\S.{30,}/m.test(frontmatterOf(read(p)) ?? ''));
  for (const file of skills) {
    const text = read(file);
    // shortcut: description sur une seule ligne ; une description YAML multiligne (> ou |) n'est pas lue.
    const description = (frontmatterOf(text) ?? '').match(/^description:\s*['"]?(.*?)['"]?\s*$/m)?.[1] ?? '';
    const body = stripFrontmatter(text);
    const name = file.split('/')[2];
    memoryIssues.push(...lintSkill(name, description, body).map((i) => ({ ...i, file })));
  }
  criteria.push(
    crit(
      'on-demand',
      'claude',
      'Skills / slash commands',
      5,
      skills.length + commands.length === 0 ? 'fail' : badSkills.length ? 'partial' : 'pass',
      `${skills.length} skill(s), ${commands.length} commande(s)${badSkills.length ? `, ${badSkills.length} skill(s) sans description utile` : ''}.`,
      'Extraire les procédures ponctuelles (release, migration…) en skills.',
    ),
  );
  const agents = find(/^\.claude\/agents\/.*\.md$/);
  criteria.push(
    crit(
      'agents',
      'claude',
      'Sous-agents spécialisés',
      2,
      agents.length ? 'pass' : 'fail',
      `${agents.length} agent(s).`,
      'Optionnel : un agent reviewer ou test-runner avec outils restreints.',
    ),
  );

  const gitignore = read('.gitignore');
  const localFiles = ['CLAUDE.local.md', '.claude/settings.local.json'];
  const leaked = localFiles.filter((f) => paths.includes(f) && !gitignore.includes(f.split('/').pop()!));
  criteria.push(
    crit(
      'local-ignored',
      'claude',
      'Fichiers perso gitignorés',
      3,
      leaked.length ? 'fail' : localFiles.every((f) => gitignore.includes(f.split('/').pop()!)) ? 'pass' : 'partial',
      leaked.length ? `Non ignoré(s) : ${leaked.join(', ')}.` : 'OK.',
      'Ajouter `CLAUDE.local.md` et `.claude/settings.local.json` à .gitignore.',
    ),
  );

  // Bonnes pratiques générales : ce qui donne à Claude des boucles de feedback.
  criteria.push(
    crit(
      'readme',
      'practices',
      'README',
      3,
      has(/^README(\.md)?$/i) ? 'pass' : 'fail',
      has(/^README/i) ? 'Présent.' : 'Absent.',
      'Ajouter un README.',
    ),
  );
  const tests = find(/(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[jt]sx?$|_test\.(go|py)$|(^|\/)test_[^/]+\.py$/);
  criteria.push(
    crit(
      'tests',
      'practices',
      'Tests automatisés',
      8,
      tests.length >= 5 ? 'pass' : tests.length ? 'partial' : 'fail',
      `${tests.length} fichier(s) de test.`,
      'Claude vérifie son travail par les tests : sans eux, il devine.',
    ),
  );
  const pkg = read('package.json');
  const pyproject = read('pyproject.toml');
  const linter =
    has(
      /(^|\/)(\.?eslint(rc)?[^/]*|eslint\.config\.[cm]?[jt]s|biome\.jsonc?|\.golangci\.ya?ml|\.rubocop\.yml|ruff\.toml|\.flake8|phpstan\.neon(\.dist)?|clippy\.toml)$/,
    ) || /\[tool\.(ruff|flake8|pylint)\]/.test(pyproject);
  criteria.push(
    crit(
      'linter',
      'practices',
      'Linter configuré',
      5,
      linter ? 'pass' : 'fail',
      linter ? 'Trouvé.' : 'Aucun linter détecté.',
      'Ajouter ESLint/Biome/Ruff… et l’appeler par hook.',
    ),
  );
  const formatter =
    has(
      /(^|\/)(\.prettierrc[^/]*|prettier\.config\.[cm]?js|biome\.jsonc?|\.editorconfig|rustfmt\.toml|\.php-cs-fixer(\.dist)?\.php)$/,
    ) ||
    /"prettier"/.test(pkg) ||
    /\[tool\.(black|ruff\.format)\]/.test(pyproject);
  criteria.push(
    crit(
      'formatter',
      'practices',
      'Formatter configuré',
      4,
      formatter ? 'pass' : 'fail',
      formatter ? 'Trouvé.' : 'Aucun formatter détecté.',
      'Ajouter Prettier/Biome/Black/gofmt.',
    ),
  );
  const typed =
    has(/(^|\/)tsconfig[^/]*\.json$|(^|\/)(mypy\.ini|pyrightconfig\.json)$|\.go$|\.rs$/) ||
    /\[tool\.(mypy|pyright)\]/.test(pyproject);
  criteria.push(
    crit(
      'types',
      'practices',
      'Typage statique',
      4,
      typed ? 'pass' : 'fail',
      typed ? 'Trouvé.' : 'Pas de vérification de types.',
      'Activer TypeScript strict / mypy / pyright.',
    ),
  );
  const ci = has(
    /^\.github\/workflows\/.+\.ya?ml$|^\.gitlab-ci\.yml$|^\.circleci\/|^Jenkinsfile$|^bitbucket-pipelines\.yml$/,
  );
  criteria.push(
    crit(
      'ci',
      'practices',
      'Intégration continue',
      5,
      ci ? 'pass' : 'fail',
      ci ? 'Pipeline trouvé.' : 'Aucune CI.',
      'Ajouter une CI qui lance lint + tests.',
    ),
  );
  const lock = has(
    /^(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|poetry\.lock|uv\.lock|Cargo\.lock|go\.sum|composer\.lock|Gemfile\.lock)$/,
  );
  criteria.push(
    crit(
      'lockfile',
      'practices',
      'Dépendances verrouillées',
      2,
      lock ? 'pass' : 'fail',
      lock ? 'Lockfile présent.' : 'Pas de lockfile.',
      'Committer le lockfile.',
    ),
  );
  criteria.push(
    crit(
      'gitignore',
      'practices',
      '.gitignore + .env.example',
      3,
      gitignore && (has(/(^|\/)\.env\.example$/) || !has(/(^|\/)\.env$/)) ? 'pass' : gitignore ? 'partial' : 'fail',
      gitignore ? 'Présent.' : 'Absent.',
      'Ignorer .env et documenter les variables dans .env.example.',
    ),
  );

  const scored = criteria.filter((c) => c.status !== 'na');
  const max = scored.reduce((s, c) => s + c.max, 0);
  const got = scored.reduce((s, c) => s + c.points, 0);
  const score = max ? Math.round((got / max) * 100) : 0;
  return { score, grade: grade(score), criteria, memoryIssues, memoryFiles };
}

const HEADING_CATEGORY: [RegExp, Category][] = [
  [/command|script|build|run|commande/i, 'commands'],
  [/architect|structure|layout|organisation|overview|vue/i, 'architecture'],
  [/test/i, 'testing'],
  [/secur|sécu/i, 'security'],
  [/git|commit|branch|pr\b|mr\b|merge/i, 'git'],
  [/glossa|domain|métier|terms/i, 'domain'],
  [/style|convention|naming|nommage|code/i, 'conventions'],
  [/workflow|méthode|process/i, 'workflow'],
];

function categoryOf(heading: string): Category {
  return HEADING_CATEGORY.find(([re]) => re.test(heading))?.[1] ?? 'other';
}

function splitSections(text: string): { title: string; body: string }[] {
  const out: { title: string; body: string }[] = [];
  let current: { title: string; body: string[] } | null = null;
  for (const line of stripFrontmatter(text).split('\n')) {
    const h = line.match(/^#{2,3}\s+(.*)/);
    if (h) {
      if (current) out.push({ title: current.title, body: current.body.join('\n').trim() });
      current = { title: h[1].trim(), body: [] };
    } else if (current) current.body.push(line);
  }
  if (current) out.push({ title: current.title, body: current.body.join('\n').trim() });
  return out.filter((s) => s.body);
}

/** Description et stack : intro de la mémoire racine (avant le premier `##`), sinon `description` du package.json. */
export function importContext(repo: RepoSnapshot): { description: string; stack: string } {
  const memory = repo.contents['CLAUDE.md'] ?? repo.contents['AGENTS.md'] ?? '';
  const intro = stripFrontmatter(memory).split(/^#{2,3}\s/m)[0];
  const stackLine = /^\**stack\s*:?\s*\**\s*:?\s*(.+)$/im;
  const stack = intro.match(stackLine)?.[1].trim() ?? '';
  let description = intro
    .replace(stackLine, '')
    .split('\n')
    .filter((l) => l.trim() && !/^#\s|^@/.test(l))
    .join(' ')
    .trim();
  if (!description) {
    try {
      description = String(JSON.parse(repo.contents['package.json'] ?? '{}').description ?? '').trim();
    } catch {
      // package.json illisible : pas de description
    }
  }
  return { description, stack };
}

export const CLAUDE_FILE_LABELS: Record<ClaudeFileGroup, string> = {
  memory: 'Mémoire',
  rules: 'Règles',
  skills: 'Skills',
  agents: 'Agents',
  commands: 'Commandes',
  settings: 'Réglages',
};

const CLAUDE_FILE_GROUPS: [ClaudeFileGroup, RegExp][] = [
  ['memory', /(^|\/)(CLAUDE(\.local)?|AGENTS)\.md$/],
  ['rules', /^\.claude\/rules\/.+\.md$/],
  ['skills', /^\.claude\/skills\/.+\.md$/],
  ['agents', /^\.claude\/agents\/.+\.md$/],
  ['commands', /^\.claude\/commands\/.+\.md$/],
  ['settings', /^\.claude\/settings(\.local)?\.json$/],
];

/** Fichiers Claude Code lisibles d'un dépôt, par groupe (ordre de CLAUDE_FILE_LABELS), racine d'abord. */
export function claudeFiles(repo: RepoSnapshot): ClaudeFile[] {
  const depth = (p: string) => p.split('/').length;
  return CLAUDE_FILE_GROUPS.flatMap(([group, re]) =>
    Object.keys(repo.contents)
      .filter((path) => re.test(path))
      .sort((a, b) => depth(a) - depth(b) || a.localeCompare(b))
      .map((path) => ({ path, group, content: repo.contents[path] })),
  );
}

/** Chemin supposé d'un fichier importé seul (sans son dossier) : la mémoire et settings.json gardent leur rôle, tout autre .md devient une règle. */
export function importedPath(name: string): string {
  if (/^(CLAUDE(\.local)?|AGENTS)\.md$/.test(name)) return name;
  if (name === 'settings.json') return '.claude/settings.json';
  return `.claude/rules/${name}`;
}

/** Reconstruit des règles à partir des fichiers mémoire existants d'un repo. */
export function importRules(repo: RepoSnapshot, newId: () => string): Rule[] {
  const rules: Rule[] = [];
  const base = { enabled: true, targets: [] as string[] };
  const add = (title: string, body: string, scope: Rule['scope'], targets: string[] = [], category?: Category) =>
    rules.push({
      ...base,
      id: newId(),
      kind: 'rule',
      title,
      body,
      scope,
      targets,
      category: category ?? categoryOf(title),
    });

  for (const [path, text] of Object.entries(repo.contents)) {
    if (path === 'CLAUDE.md' || path === 'AGENTS.md') {
      // « Rappels » répète les règles critiques déjà importées ailleurs dans le fichier.
      for (const s of splitSections(text)) if (s.title !== 'Rappels') add(s.title, s.body, 'project');
    } else if (path === 'CLAUDE.local.md') {
      for (const s of splitSections(text)) add(s.title, s.body, 'local');
    } else if (/\/CLAUDE\.md$/.test(path)) {
      const dir = path.replace(/\/CLAUDE\.md$/, '');
      for (const s of splitSections(text)) add(s.title, s.body, 'directory', [dir]);
    } else if (/^\.claude\/rules\/.*\.md$/.test(path)) {
      const fm = frontmatterOf(text) ?? '';
      const inline = fm.match(/^paths:[ \t]*(\[.*\]|\S.*)$/m)?.[1];
      const globs = inline
        ? inline
            .replace(/^\[|\]$/g, '')
            .split(',')
            .map((g) => g.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean)
        : [...fm.matchAll(/^\s*-\s*["']?([^"'\n]+)["']?\s*$/gm)].map((m) => m[1]);
      const name = path.split('/').pop()!.replace(/\.md$/, '');
      const sections = splitSections(text);
      const list = sections.length ? sections : [{ title: name, body: stripFrontmatter(text).trim() }];
      for (const s of list) add(s.title, s.body, globs.length ? 'path' : 'topic', globs, categoryOf(name));
    }
  }

  let hooks: Record<string, { matcher?: string; hooks?: { command?: string }[] }[]> = {};
  try {
    hooks = JSON.parse(repo.contents['.claude/settings.json'] ?? '{}').hooks ?? {};
  } catch {
    // settings.json invalide : déjà signalé par analyzeRepo
  }
  for (const [event, groups] of Object.entries(hooks)) {
    for (const group of Array.isArray(groups) ? groups : []) {
      for (const h of group.hooks ?? []) {
        if (!h.command) continue;
        rules.push({
          ...base,
          id: newId(),
          kind: 'hook',
          title: `${event} ${group.matcher ?? ''}`.trim(),
          body: '',
          scope: 'project',
          category: 'other',
          event: event as HookEvent,
          matcher: group.matcher,
          command: h.command,
        });
      }
    }
  }
  return rules;
}
