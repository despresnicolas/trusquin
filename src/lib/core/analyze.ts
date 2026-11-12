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

/** pass si `pass`, sinon partial si `partial`, sinon fail. */
const passIf = (pass: boolean, partial = false): CriterionStatus => (pass ? 'pass' : partial ? 'partial' : 'fail');

/** na quand le critère ne s'applique pas au dépôt. */
const naUnless = (applies: boolean, status: CriterionStatus): CriterionStatus => (applies ? status : 'na');

/** Lectures du dépôt partagées par tous les critères, calculées une fois. */
interface RepoContext {
  paths: string[];
  read: (p: string) => string;
  has: (re: RegExp) => boolean;
  find: (re: RegExp) => string[];
  memoryFiles: string[];
  ruleFiles: string[];
  rootPath: string | undefined;
  root: string;
  rootLines: number;
  rootSpans: string[];
}

function repoContext({ paths, contents }: RepoSnapshot): RepoContext {
  const read = (p: string) => contents[p] ?? '';
  const find = (re: RegExp) => paths.filter((p) => re.test(p));
  const rootPath = ['CLAUDE.md', 'AGENTS.md'].find((p) => paths.includes(p));
  let root = rootPath ? read(rootPath) : '';
  // CLAUDE.md qui ne fait qu'importer AGENTS.md : analyser AGENTS.md.
  if (rootPath === 'CLAUDE.md' && /^@AGENTS\.md\s*$/m.test(root) && paths.includes('AGENTS.md')) {
    root = read('AGENTS.md') + '\n' + root;
  }
  return {
    paths,
    read,
    has: (re) => paths.some((p) => re.test(p)),
    find,
    memoryFiles: find(/(^|\/)(CLAUDE(\.local)?\.md|AGENTS\.md)$/),
    ruleFiles: find(/^\.claude\/rules\/.*\.md$/),
    rootPath,
    root,
    rootLines: root ? root.split('\n').length : 0,
    rootSpans: root.match(/`[^`\n]+`/g) ?? [],
  };
}

function rootMemoryDetail({ rootPath, rootLines }: RepoContext): string {
  if (!rootPath) return 'Aucun CLAUDE.md ni AGENTS.md à la racine.';
  if (rootPath === 'AGENTS.md') {
    return `AGENTS.md présent (${rootLines} lignes), mais sans CLAUDE.md Claude Code ne le lit pas.`;
  }
  return `${rootPath} présent (${rootLines} lignes).`;
}

/** Mémoire racine : présence, longueur, commandes, section architecture. */
function rootCriteria(ctx: RepoContext): Criterion[] {
  const { rootPath, rootLines, root } = ctx;
  const hasRoot = Boolean(rootPath);
  const commandSpans = ctx.rootSpans.filter((s) =>
    /\b(npm|pnpm|yarn|bun|make|cargo|go|pytest|uv|poetry|composer|php|mvn|gradle|docker|just)\b/.test(s),
  );
  const hasArchitecture = /^#{1,3} .*(architecture|structure|organisation|layout|overview|vue d)/im.test(root);
  return [
    crit(
      'root-memory',
      'claude',
      'Mémoire racine (CLAUDE.md / AGENTS.md)',
      12,
      passIf(rootPath === 'CLAUDE.md', hasRoot),
      rootMemoryDetail(ctx),
      hasRoot
        ? 'Créer un CLAUDE.md à côté contenant `@AGENTS.md`.'
        : 'Générer un CLAUDE.md avec le générateur ou `/init`, puis élaguer.',
    ),
    crit(
      'root-length',
      'claude',
      'Mémoire racine concise',
      6,
      naUnless(hasRoot, passIf(rootLines <= LIMITS.rootWarn, rootLines <= LIMITS.rootError)),
      hasRoot ? `${rootLines} lignes (cible < ${LIMITS.rootWarn}, max ${LIMITS.rootError}).` : '—',
      'Déplacer le détail dans .claude/rules/ ou des skills.',
    ),
    crit(
      'commands',
      'claude',
      'Commandes exactes (build/test/lint)',
      8,
      naUnless(hasRoot, passIf(commandSpans.length >= 3, commandSpans.length > 0)),
      `${commandSpans.length} commande(s) exacte(s) trouvée(s).`,
      'Lister install, dev, test, test ciblé, lint, typecheck, build entre backticks.',
    ),
    crit(
      'architecture',
      'claude',
      'Section architecture / structure',
      5,
      naUnless(hasRoot, passIf(hasArchitecture)),
      hasArchitecture ? 'Section trouvée.' : 'Pas de section décrivant la structure.',
      'Ajouter le WHAT/WHY : dossiers clés, rôle, décisions d’architecture.',
    ),
  ];
}

/** Imports `@chemin` de la mémoire racine, et ceux qui pointent vers un fichier absent. */
function rootImports({ root, paths }: RepoContext): { imports: string[]; broken: string[] } {
  const imports = [...root.matchAll(/^\s*@([\w./-]+)/gm)].map((m) => m[1]);
  const broken = imports.filter((p) => !p.startsWith('~') && !paths.includes(p.replace(/^\.\//, '')));
  return { imports, broken };
}

function brokenImportIssue(path: string, file: string | undefined): Issue {
  return {
    severity: 'error',
    code: 'broken-import',
    params: { path },
    file,
    message: `Import @${path} introuvable.`,
    fix: 'Corriger le chemin ou retirer l’import.',
  };
}

// Claude Code ne charge que CLAUDE.md : un AGENTS.md doit être importé par un CLAUDE.md voisin.
// shortcut: seul l'import depuis le même dossier est reconnu, élargir si des imports croisés apparaissent.
function agentsNotImportedIssues({ find, read }: RepoContext): Issue[] {
  const issues: Issue[] = [];
  for (const file of find(/(^|\/)AGENTS\.md$/)) {
    const dir = file.slice(0, -'AGENTS.md'.length);
    const importers = [`${dir}CLAUDE.md`, `${dir}CLAUDE.local.md`].map(read);
    if (importers.some((c) => /^\s*@(\.\/)?AGENTS\.md\s*$/m.test(c))) continue;
    issues.push({
      severity: 'warning',
      code: 'agents-not-imported',
      params: { dir },
      file,
      message: 'Aucun CLAUDE.md voisin n’importe ce fichier : Claude Code ne le lit pas.',
      fix: `Ajouter la ligne \`@AGENTS.md\` en tête de ${dir}CLAUDE.md (le créer si besoin).`,
    });
  }
  return issues;
}

/** Problèmes des fichiers mémoire et rules : lint du texte, imports cassés, AGENTS.md non importés. */
function memoryTextIssues(ctx: RepoContext, broken: string[]): Issue[] {
  const { memoryFiles, ruleFiles, read, rootPath } = ctx;
  return [
    ...memoryFiles.flatMap((file) => lintMemoryText(file, read(file), file === rootPath)),
    ...ruleFiles.flatMap((file) => lintMemoryText(file, read(file))),
    ...broken.map((p) => brokenImportIssue(p, rootPath)),
    ...agentsNotImportedIssues(ctx),
  ];
}

/** Contenu de la mémoire : secrets, formulations vagues, imports, fichiers exemplaires. */
function contentCriteria(ctx: RepoContext, issues: Issue[], imports: string[], broken: string[]): Criterion[] {
  const { memoryFiles, ruleFiles, read, paths } = ctx;
  const secrets = issues.filter((i) => i.code === 'secret');
  const vague = issues.filter((i) => i.code === 'vague');
  // Few-shot : la mémoire pointe vers des fichiers existants du dépôt à prendre pour modèle.
  const memoryText = [...memoryFiles, ...ruleFiles].map(read).join('\n');
  const referenced = [...memoryText.matchAll(/`([\w@./-]+\.\w+)(?::\d+)?`/g)].map((m) => m[1]);
  const examples = [...new Set(referenced.filter((p) => paths.includes(p)))];
  const hasMemory = memoryFiles.length > 0;
  return [
    crit(
      'no-secrets',
      'claude',
      'Aucun secret dans la mémoire',
      8,
      passIf(!secrets.length),
      secrets.length ? `${secrets.length} secret(s) probable(s).` : 'Rien détecté.',
      'Retirer les valeurs ; référencer seulement les noms de variables.',
    ),
    crit(
      'specific',
      'claude',
      'Règles spécifiques et vérifiables',
      4,
      naUnless(hasMemory, passIf(vague.length === 0, vague.length <= 2)),
      vague.length ? `${vague.length} fichier(s) avec formulations vagues.` : 'Pas de formulation vague détectée.',
      'Remplacer « code propre » par une règle testable.',
    ),
    crit(
      'imports',
      'claude',
      'Imports @ valides',
      3,
      naUnless(imports.length > 0, passIf(!broken.length)),
      imports.length ? `${imports.length} import(s), ${broken.length} cassé(s).` : 'Aucun import.',
      'Corriger les chemins importés.',
    ),
    crit(
      'examples',
      'claude',
      'Fichiers exemplaires cités',
      3,
      naUnless(hasMemory, passIf(examples.length > 0)),
      examples.length
        ? `${examples.length} fichier(s) du dépôt cité(s) : ${examples.slice(0, 3).join(', ')}.`
        : 'Aucun fichier du dépôt cité en exemple.',
      'Pointer vers un composant, un test ou un endpoint exemplaire (« suivre `src/…` ») plutôt que décrire le style.',
    ),
  ];
}

function packageMemoryDetail(packages: string[], covered: string[], uncovered: string[]): string {
  if (!packages.length) return 'Pas de workspace détecté.';
  const summary = `${covered.length}/${packages.length} paquet(s) avec un CLAUDE.md ou une règle paths:`;
  if (!uncovered.length) return summary + '.';
  const more = uncovered.length > 5 ? '…' : '';
  return `${summary} ; sans : ${uncovered.slice(0, 5).join(', ')}${more}.`;
}

function targetedCommandsDetail(packages: string[], targeted: boolean): string {
  if (!packages.length) return 'Pas de workspace détecté.';
  if (targeted) return 'La mémoire racine cite une commande filtrée par paquet.';
  return 'Aucune commande filtrée (--filter, nx run…) dans la mémoire racine.';
}

/** Découpage de la mémoire : rules avec `paths:`, CLAUDE.md de dossier, couverture des paquets d'un monorepo. */
function modularCriteria(ctx: RepoContext): Criterion[] {
  const { ruleFiles, memoryFiles, read, paths } = ctx;
  const scoped = ruleFiles.filter((p) => /^paths:/m.test(frontmatterOf(read(p)) ?? ''));
  const subMemory = memoryFiles.filter((p) => p.includes('/'));
  const packages = workspacePackages(paths, read);
  const covered = packages.filter(
    (d) =>
      paths.includes(`${d}/CLAUDE.md`) ||
      ruleFiles.some((r) => (frontmatterOf(read(r)) ?? '').match(/^paths:.*$/m)?.[0].includes(`${d}/`)),
  );
  const uncovered = packages.filter((d) => !covered.includes(d));
  const targeted = ctx.rootSpans.some((s) =>
    /--filter|--workspace|\s-F\s|yarn workspace |\b(nx|turbo) (run|affected)\b|lerna .*--scope|cargo \w+ (-p|--package)\b/.test(
      s,
    ),
  );
  const isMonorepo = packages.length > 0;
  return [
    crit(
      'modular',
      'claude',
      'Règles modulaires (rules/ ou CLAUDE.md de dossier)',
      6,
      passIf(scoped.length > 0 || subMemory.length > 0, ruleFiles.length > 0),
      `${ruleFiles.length} fichier(s) rules (${scoped.length} avec paths), ${subMemory.length} CLAUDE.md de sous-dossier.`,
      'Isoler les règles spécifiques dans .claude/rules/*.md avec `paths:`.',
    ),
    crit(
      'package-memory',
      'claude',
      'Mémoire par paquet (monorepo)',
      5,
      naUnless(isMonorepo, passIf(!uncovered.length, covered.length > 0)),
      packageMemoryDetail(packages, covered, uncovered),
      'Ajouter un CLAUDE.md par paquet (commandes, structure, conventions locales) : chargé seulement quand Claude y travaille.',
    ),
    crit(
      'targeted-commands',
      'claude',
      'Commandes ciblées sur un paquet',
      3,
      naUnless(isMonorepo, passIf(targeted)),
      targetedCommandsDetail(packages, targeted),
      'Citer les commandes d’un seul paquet (`pnpm --filter <paquet> test`) : plus rapides et moins de sortie qu’un test global.',
    ),
  ];
}

type Settings = { permissions?: { allow?: unknown[]; deny?: unknown[] }; hooks?: Record<string, unknown[]> };

/** .claude/settings.json lu, ou vide avec un problème si le JSON est invalide. */
function readSettings(read: (p: string) => string): { settings: Settings; issues: Issue[] } {
  try {
    return { settings: JSON.parse(read('.claude/settings.json') || '{}'), issues: [] };
  } catch {
    return {
      settings: {},
      issues: [
        {
          severity: 'error',
          code: 'settings-json',
          file: '.claude/settings.json',
          message: 'JSON invalide.',
          fix: 'Corriger la syntaxe.',
        },
      ],
    };
  }
}

/** Permissions et hooks de .claude/settings.json. */
function settingsCriteria(settings: Settings, paths: string[]): Criterion[] {
  const allow = settings.permissions?.allow?.length ?? 0;
  const deny = settings.permissions?.deny?.length ?? 0;
  const hookCount = Object.values(settings.hooks ?? {}).flat().length;
  return [
    crit(
      'permissions',
      'claude',
      'Permissions versionnées',
      5,
      passIf(deny > 0 && allow > 0, allow + deny > 0),
      paths.includes('.claude/settings.json') ? `${allow} allow, ${deny} deny.` : 'Pas de .claude/settings.json.',
      'Autoriser les commandes sûres (tests, lint) et refuser `.env`, secrets.',
    ),
    crit(
      'hooks',
      'claude',
      'Hooks déterministes (format/lint/tests)',
      6,
      passIf(hookCount > 0),
      hookCount ? `${hookCount} hook(s).` : 'Aucun hook.',
      'Ajouter un hook PostToolUse `Edit|Write` lançant le formatter.',
    ),
  ];
}

function skillIssues(file: string, text: string): Issue[] {
  // shortcut: description sur une seule ligne ; une description YAML multiligne (> ou |) n'est pas lue.
  const description = (frontmatterOf(text) ?? '').match(/^description:\s*['"]?(.*?)['"]?\s*$/m)?.[1] ?? '';
  const name = file.split('/')[2];
  return lintSkill(name, description, stripFrontmatter(text)).map((i) => ({ ...i, file }));
}

/** Skills, slash commands et sous-agents, avec les problèmes de chaque skill. */
function onDemandAnalysis({ find, read }: RepoContext): { criteria: Criterion[]; issues: Issue[] } {
  const skills = find(/^\.claude\/skills\/[^/]+\/SKILL\.md$/);
  const commands = find(/^\.claude\/commands\/.*\.md$/);
  const agents = find(/^\.claude\/agents\/.*\.md$/);
  const badSkills = skills.filter((p) => !/^description:\s*\S.{30,}/m.test(frontmatterOf(read(p)) ?? ''));
  const hasOnDemand = skills.length + commands.length > 0;
  const badDetail = badSkills.length ? `, ${badSkills.length} skill(s) sans description utile` : '';
  const criteria = [
    crit(
      'on-demand',
      'claude',
      'Skills / slash commands',
      5,
      passIf(hasOnDemand && !badSkills.length, hasOnDemand),
      `${skills.length} skill(s), ${commands.length} commande(s)${badDetail}.`,
      'Extraire les procédures ponctuelles (release, migration…) en skills.',
    ),
    crit(
      'agents',
      'claude',
      'Sous-agents spécialisés',
      2,
      passIf(agents.length > 0),
      `${agents.length} agent(s).`,
      'Optionnel : un agent reviewer ou test-runner avec outils restreints.',
    ),
  ];
  return { criteria, issues: skills.flatMap((file) => skillIssues(file, read(file))) };
}

function localIgnoredCriterion({ read, paths }: RepoContext): Criterion {
  const gitignore = read('.gitignore');
  const localFiles = ['CLAUDE.local.md', '.claude/settings.local.json'];
  const ignored = (f: string) => gitignore.includes(f.split('/').pop()!);
  const leaked = localFiles.filter((f) => paths.includes(f) && !ignored(f));
  return crit(
    'local-ignored',
    'claude',
    'Fichiers perso gitignorés',
    3,
    passIf(!leaked.length && localFiles.every(ignored), !leaked.length),
    leaked.length ? `Non ignoré(s) : ${leaked.join(', ')}.` : 'OK.',
    'Ajouter `CLAUDE.local.md` et `.claude/settings.local.json` à .gitignore.',
  );
}

const TEST_FILES = /(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[jt]sx?$|_test\.(go|py)$|(^|\/)test_[^/]+\.py$/;
const LINTER_FILES =
  /(^|\/)(\.?eslint(rc)?[^/]*|eslint\.config\.[cm]?[jt]s|biome\.jsonc?|\.golangci\.ya?ml|\.rubocop\.yml|ruff\.toml|\.flake8|phpstan\.neon(\.dist)?|clippy\.toml)$/;
const FORMATTER_FILES =
  /(^|\/)(\.prettierrc[^/]*|prettier\.config\.[cm]?js|biome\.jsonc?|\.editorconfig|rustfmt\.toml|\.php-cs-fixer(\.dist)?\.php)$/;
const TYPED_FILES = /(^|\/)tsconfig[^/]*\.json$|(^|\/)(mypy\.ini|pyrightconfig\.json)$|\.go$|\.rs$/;
const CI_FILES =
  /^\.github\/workflows\/.+\.ya?ml$|^\.gitlab-ci\.yml$|^\.circleci\/|^Jenkinsfile$|^bitbucket-pipelines\.yml$/;
const LOCK_FILES =
  /^(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|poetry\.lock|uv\.lock|Cargo\.lock|go\.sum|composer\.lock|Gemfile\.lock)$/;

/** Linter, formatter et typage : un fichier de config, ou leur section dans pyproject.toml / package.json. */
function toolsFound({ has, read }: RepoContext): { linter: boolean; formatter: boolean; typed: boolean } {
  const pyproject = read('pyproject.toml');
  return {
    linter: has(LINTER_FILES) || /\[tool\.(ruff|flake8|pylint)\]/.test(pyproject),
    formatter:
      has(FORMATTER_FILES) ||
      /"prettier"/.test(read('package.json')) ||
      /\[tool\.(black|ruff\.format)\]/.test(pyproject),
    typed: has(TYPED_FILES) || /\[tool\.(mypy|pyright)\]/.test(pyproject),
  };
}

/** Critère de bonne pratique tout ou rien : pass si `found`, fail sinon. */
function presenceCrit(
  id: string,
  label: string,
  max: number,
  found: boolean,
  [yes, no]: [string, string],
  fix: string,
): Criterion {
  return crit(id, 'practices', label, max, passIf(found), found ? yes : no, fix);
}

/** Bonnes pratiques générales : ce qui donne à Claude des boucles de feedback. */
function practiceCriteria(ctx: RepoContext): Criterion[] {
  const { has, find, read } = ctx;
  const tests = find(TEST_FILES);
  const { linter, formatter, typed } = toolsFound(ctx);
  const gitignore = Boolean(read('.gitignore'));
  const envDocumented = has(/(^|\/)\.env\.example$/) || !has(/(^|\/)\.env$/);
  return [
    crit(
      'readme',
      'practices',
      'README',
      3,
      passIf(has(/^README(\.md)?$/i)),
      has(/^README/i) ? 'Présent.' : 'Absent.',
      'Ajouter un README.',
    ),
    crit(
      'tests',
      'practices',
      'Tests automatisés',
      8,
      passIf(tests.length >= 5, tests.length > 0),
      `${tests.length} fichier(s) de test.`,
      'Claude vérifie son travail par les tests : sans eux, il devine.',
    ),
    presenceCrit(
      'linter',
      'Linter configuré',
      5,
      linter,
      ['Trouvé.', 'Aucun linter détecté.'],
      'Ajouter ESLint/Biome/Ruff… et l’appeler par hook.',
    ),
    presenceCrit(
      'formatter',
      'Formatter configuré',
      4,
      formatter,
      ['Trouvé.', 'Aucun formatter détecté.'],
      'Ajouter Prettier/Biome/Black/gofmt.',
    ),
    presenceCrit(
      'types',
      'Typage statique',
      4,
      typed,
      ['Trouvé.', 'Pas de vérification de types.'],
      'Activer TypeScript strict / mypy / pyright.',
    ),
    presenceCrit(
      'ci',
      'Intégration continue',
      5,
      has(CI_FILES),
      ['Pipeline trouvé.', 'Aucune CI.'],
      'Ajouter une CI qui lance lint + tests.',
    ),
    presenceCrit(
      'lockfile',
      'Dépendances verrouillées',
      2,
      has(LOCK_FILES),
      ['Lockfile présent.', 'Pas de lockfile.'],
      'Committer le lockfile.',
    ),
    crit(
      'gitignore',
      'practices',
      '.gitignore + .env.example',
      3,
      passIf(gitignore && envDocumented, gitignore),
      gitignore ? 'Présent.' : 'Absent.',
      'Ignorer .env et documenter les variables dans .env.example.',
    ),
  ];
}

/** Note sur 100 : points obtenus sur les critères applicables. */
function scoreOf(criteria: Criterion[]): number {
  const scored = criteria.filter((c) => c.status !== 'na');
  const max = scored.reduce((s, c) => s + c.max, 0);
  const got = scored.reduce((s, c) => s + c.points, 0);
  return max ? Math.round((got / max) * 100) : 0;
}

export function analyzeRepo(repo: RepoSnapshot): RepoAnalysis {
  const ctx = repoContext(repo);
  const { imports, broken } = rootImports(ctx);
  const textIssues = memoryTextIssues(ctx, broken);
  const { settings, issues: settingsIssues } = readSettings(ctx.read);
  const onDemand = onDemandAnalysis(ctx);
  const criteria = [
    ...rootCriteria(ctx),
    ...contentCriteria(ctx, textIssues, imports, broken),
    ...modularCriteria(ctx),
    ...settingsCriteria(settings, ctx.paths),
    ...onDemand.criteria,
    localIgnoredCriterion(ctx),
    ...practiceCriteria(ctx),
  ];
  const score = scoreOf(criteria);
  return {
    score,
    grade: grade(score),
    criteria,
    memoryIssues: [...textIssues, ...settingsIssues, ...onDemand.issues],
    memoryFiles: ctx.memoryFiles,
  };
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

/** Règle importée, avant attribution de son id. */
type RuleDraft = Omit<Rule, 'id' | 'enabled'>;

type HookGroup = { matcher?: string; hooks?: { command?: string }[] };

/** Une règle par section ; catégorie déduite du titre de section sauf si imposée. */
function sectionRules(
  sections: { title: string; body: string }[],
  scope: Rule['scope'],
  targets: string[] = [],
  category?: Category,
): RuleDraft[] {
  return sections.map((s) => ({
    kind: 'rule',
    title: s.title,
    body: s.body,
    scope,
    targets: [...targets],
    category: category ?? categoryOf(s.title),
  }));
}

/** Globs du `paths:` d'une règle : en ligne (`paths: a, b` ou `[a, b]`) ou en liste YAML. */
function frontmatterGlobs(text: string): string[] {
  const fm = frontmatterOf(text) ?? '';
  const inline = fm.match(/^paths:[ \t]*(\[.*\]|\S.*)$/m)?.[1];
  if (!inline) return [...fm.matchAll(/^\s*-\s*["']?([^"'\n]+)["']?\s*$/gm)].map((m) => m[1]);
  return inline
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((g) => g.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

/** .claude/rules/*.md : portée « chemins » si `paths:`, sinon thème ; fichier sans section = une seule règle. */
function ruleFileRules(path: string, text: string): RuleDraft[] {
  const globs = frontmatterGlobs(text);
  const name = path.split('/').pop()!.replace(/\.md$/, '');
  const sections = splitSections(text);
  const list = sections.length ? sections : [{ title: name, body: stripFrontmatter(text).trim() }];
  return sectionRules(list, globs.length ? 'path' : 'topic', globs, categoryOf(name));
}

/** Règles tirées d'un fichier mémoire du dépôt ; aucune pour les autres fichiers. */
function fileRules(path: string, text: string): RuleDraft[] {
  if (path === 'CLAUDE.md' || path === 'AGENTS.md') {
    // « Rappels » répète les règles critiques déjà importées ailleurs dans le fichier.
    return sectionRules(
      splitSections(text).filter((s) => s.title !== 'Rappels'),
      'project',
    );
  }
  if (path === 'CLAUDE.local.md') return sectionRules(splitSections(text), 'local');
  if (/\/CLAUDE\.md$/.test(path)) {
    return sectionRules(splitSections(text), 'directory', [path.replace(/\/CLAUDE\.md$/, '')]);
  }
  if (/^\.claude\/rules\/.*\.md$/.test(path)) return ruleFileRules(path, text);
  return [];
}

/** Hooks de .claude/settings.json, vides si le JSON est invalide. */
function readHooks(contents: RepoSnapshot['contents']): Record<string, unknown> {
  try {
    return JSON.parse(contents['.claude/settings.json'] ?? '{}').hooks ?? {};
  } catch {
    // settings.json invalide : déjà signalé par analyzeRepo
    return {};
  }
}

/** Un hook par commande d'un groupe (matcher partagé). */
function groupHookRules(event: string, group: HookGroup): RuleDraft[] {
  return (group.hooks ?? [])
    .filter((h) => h.command)
    .map((h) => ({
      kind: 'hook',
      title: `${event} ${group.matcher ?? ''}`.trim(),
      body: '',
      scope: 'project',
      targets: [],
      category: 'other',
      event: event as HookEvent,
      matcher: group.matcher,
      command: h.command,
    }));
}

function hookRules(hooks: Record<string, unknown>): RuleDraft[] {
  return Object.entries(hooks).flatMap(([event, groups]) =>
    (Array.isArray(groups) ? (groups as HookGroup[]) : []).flatMap((group) => groupHookRules(event, group)),
  );
}

/** Reconstruit des règles à partir des fichiers mémoire existants d'un repo. */
export function importRules(repo: RepoSnapshot, newId: () => string): Rule[] {
  const drafts = [
    ...Object.entries(repo.contents).flatMap(([path, text]) => fileRules(path, text)),
    ...hookRules(readHooks(repo.contents)),
  ];
  // ids attribués dans l'ordre : fichiers d'abord, puis hooks.
  return drafts.map((draft) => ({ enabled: true, id: newId(), ...draft }));
}
