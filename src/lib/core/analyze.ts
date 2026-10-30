import { lintMemoryText, LIMITS } from './quality';
import type { Category, Criterion, CriterionStatus, Issue, RepoAnalysis, RepoSnapshot, Rule } from './types';

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

const TEXT_FILES =
  /(^|\/)(CLAUDE(\.local)?\.md|AGENTS\.md|README(\.md)?|\.gitignore|package\.json|pyproject\.toml|settings(\.local)?\.json|SKILL\.md|\.env\.example|composer\.json|Cargo\.toml|go\.mod)$|^\.claude\/.*\.md$/i;

/** Indique si le contenu du fichier est utile à l'analyse (le reste : chemin seul). */
export function needsContent(path: string): boolean {
  return TEXT_FILES.test(path);
}

export function isIgnored(path: string): boolean {
  return path.split('/').some((part) => IGNORED_DIRS.has(part));
}

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

function frontmatterOf(text: string): string | null {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : null;
}

function grade(score: number): RepoAnalysis['grade'] {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'E';
}

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

  criteria.push(
    crit(
      'root-memory',
      'claude',
      'Mémoire racine (CLAUDE.md / AGENTS.md)',
      12,
      rootPath ? 'pass' : 'fail',
      rootPath ? `${rootPath} présent (${rootLines} lignes).` : 'Aucun CLAUDE.md ni AGENTS.md à la racine.',
      'Générer un CLAUDE.md avec le générateur ou `/init`, puis élaguer.',
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

  const commandSpans = (root.match(/`[^`\n]+`/g) ?? []).filter((s) =>
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
  for (const file of find(/^\.claude\/rules\/.*\.md$/)) memoryIssues.push(...lintMemoryText(file, read(file)));

  const imports = [...root.matchAll(/^\s*@([\w./-]+)/gm)].map((m) => m[1]);
  const broken = imports.filter((p) => !p.startsWith('~') && !paths.includes(p.replace(/^\.\//, '')));
  for (const p of broken) {
    memoryIssues.push({
      severity: 'error',
      code: 'broken-import',
      file: rootPath,
      message: `Import @${p} introuvable.`,
      fix: 'Corriger le chemin ou retirer l’import.',
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

  const ruleFiles = find(/^\.claude\/rules\/.*\.md$/);
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
  for (const line of text.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n')) {
    const h = line.match(/^#{2,3}\s+(.*)/);
    if (h) {
      if (current) out.push({ title: current.title, body: current.body.join('\n').trim() });
      current = { title: h[1].trim(), body: [] };
    } else if (current) current.body.push(line);
  }
  if (current) out.push({ title: current.title, body: current.body.join('\n').trim() });
  return out.filter((s) => s.body);
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
      for (const s of splitSections(text)) add(s.title, s.body, 'project');
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
      const list = sections.length
        ? sections
        : [{ title: name, body: text.replace(/^---\n[\s\S]*?\n---\n/, '').trim() }];
      for (const s of list) add(s.title, s.body, globs.length ? 'path' : 'topic', globs, categoryOf(name));
    }
  }
  return rules;
}
