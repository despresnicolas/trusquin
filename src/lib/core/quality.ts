import { generate, slug } from './placement';
import type { GeneratedFile, HookEvent, Issue, Project, QualityReport, Rule } from './types';

const VAGUE = [
  'clean code',
  'code propre',
  'bonnes pratiques',
  'best practices',
  'be careful',
  'fais attention',
  'faire attention',
  'si possible',
  'when appropriate',
  'if needed',
  'si nécessaire',
  'de qualité',
  'high quality',
  'readable',
  'lisible',
  'maintenable',
  'maintainable',
  'comme d’habitude',
  "comme d'habitude",
  'etc.',
];

const LINTER_JOB =
  /\b(indent\w*|tabulations?|tabs?|semi-?colons?|points?-virgules?|trailing comma|virgule finale|guillemets?|quotes?|line length|longueur de ligne|max(imum)? \d+ (caractères|characters|chars))\b/i;

const SECRET_PATTERNS: [RegExp, string][] = [
  [/\bsk-[A-Za-z0-9_-]{16,}/, 'clé API type sk-'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'clé AWS'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, 'token GitHub'],
  [/\bglpat-[A-Za-z0-9_-]{20,}/, 'token GitLab'],
  [/\bxox[abpr]-[A-Za-z0-9-]{10,}/, 'token Slack'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'clé privée'],
  [/\b(password|passwd|mot de passe|secret|api[_-]?key|token)\s*[:=]\s*['"]?[^\s'"`]{8,}/i, 'secret en clair'],
];

const NEGATION = /\b(never|jamais|don['’]?t|do not|ne pas|n['’]utilise pas|avoid|évite[rz]?|interdit|forbidden|no)\b/i;
const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'];
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Événements de hook reconnus, le plus courant en premier (ordre du sélecteur). */
export const HOOK_EVENTS: HookEvent[] = [
  'PostToolUse',
  'PreToolUse',
  'UserPromptSubmit',
  'Stop',
  'SubagentStop',
  'SessionStart',
  'Notification',
  'PreCompact',
];

const SKILL_TRIGGER =
  /use (it )?(when|for|proactively)|when the user|à utiliser (quand|lorsque|pour)|quand l[’']utilisateur|lorsque/i;
const SKILL_VERIFY = /vérifi|contrôl|valider|relancer|\btests?\b|tester|\bcheck|\bverif|\bpass(e|ent)?\b/i;

export const LIMITS = {
  rootWarn: 100,
  rootError: 200,
  otherWarn: 150,
  alwaysInstructions: 150,
  ruleLines: 15,
  codeBlock: 10,
  criticalRules: 3,
  skillLines: 500,
};

/** Instructions = puces et lignes numérotées hors blocs de code. */
export function countInstructions(text: string): number {
  let inFence = false;
  let count = 0;
  for (const line of text.split('\n')) {
    if (line.trim().startsWith('```')) inFence = !inFence;
    else if (!inFence && /^\s*([-*+]|\d+\.)\s+\S/.test(line)) count++;
  }
  return count;
}

function codeSpans(line: string): string[] {
  return [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim().toLowerCase());
}

// Consigne qui commence par une interdiction ; l'alternative éventuelle suit (« : utiliser X », « plutôt »…).
const NEGATIVE =
  /^\s*(?:[-*+]|\d+\.)\s+(?:\*\*[^*]+\*\*\s*:?\s*)?(?:ne\s+(?:jamais|pas)\b|n['’]|jamais\b|pas\s+d[e'’]|aucun|interdit|never\b|don['’]t\b|do\s+not\b|avoid\b|évite[rz]?\b)/i;
const ALTERNATIVE = /[:→;—]|\bplutôt\b|\bà la place\b|\binstead\b|\bprefer|\bpréférer\b/i;

/** Problème de lint d'un fichier mémoire, avant d'y rattacher le fichier. */
type TextIssue = Omit<Issue, 'file'>;

/** Taille : seuils de la racine (avertissement puis erreur) ou d'un fichier de règles. */
function lengthIssues(count: number, isRoot: boolean): TextIssue[] {
  if (!isRoot) {
    if (count <= LIMITS.otherWarn) return [];
    return [
      {
        severity: 'warning',
        code: 'file-long',
        params: { n: count },
        message: `${count} lignes dans un seul fichier de règles.`,
        fix: 'Découper par thème ou par chemin.',
      },
    ];
  }
  if (count > LIMITS.rootError) {
    return [
      {
        severity: 'error',
        code: 'root-too-long',
        params: { n: count, max: LIMITS.rootError },
        message: `${count} lignes : au-delà de ${LIMITS.rootError}, Claude suit moins bien les consignes.`,
        fix: 'Déplacer les sections spécifiques dans .claude/rules/ avec `paths`, ou en skills.',
      },
    ];
  }
  if (count > LIMITS.rootWarn) {
    return [
      {
        severity: 'warning',
        code: 'root-long',
        params: { n: count, max: LIMITS.rootWarn },
        message: `${count} lignes : viser moins de ${LIMITS.rootWarn} lignes pour la racine.`,
        fix: 'Garder la racine comme index ; détailler ailleurs.',
      },
    ];
  }
  return [];
}

function vagueIssues(text: string): TextIssue[] {
  const lower = text.toLowerCase();
  const vague = VAGUE.filter((v) => lower.includes(v));
  if (!vague.length) return [];
  return [
    {
      severity: 'warning',
      code: 'vague',
      params: { terms: vague.join(', ') },
      message: `Formulations vagues : ${vague.map((v) => `« ${v} »`).join(', ')}.`,
      fix: 'Remplacer par une règle vérifiable (commande, seuil, exemple de fichier). Test : « sans cette ligne, Claude se tromperait-il ? »',
    },
  ];
}

/** Un problème par type de secret détecté. */
function secretIssues(text: string): TextIssue[] {
  return SECRET_PATTERNS.filter(([pattern]) => pattern.test(text)).map(([, label]) => ({
    severity: 'error',
    code: 'secret',
    params: { kind: label },
    message: `Secret probable (${label}).`,
    fix: 'Retirer la valeur, la mettre dans .env (gitignoré) et ne référencer que le nom de variable.',
  }));
}

/** Numéros (1-based) des lignes hors bloc de code qui interdisent sans donner d'alternative. */
function negativeLines(lines: string[]): number[] {
  const found: number[] = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (line.trim().startsWith('```')) inFence = !inFence;
    else if (!inFence && isBareProhibition(line)) found.push(i + 1);
  });
  return found;
}

const isBareProhibition = (line: string) => NEGATIVE.test(line) && !ALTERNATIVE.test(line.replace(NEGATIVE, ''));

/** Les 5 premiers numéros, suivis de « … » s'il y en a plus. */
const firstLines = (lines: number[]) => lines.slice(0, 5).join(', ') + (lines.length > 5 ? '…' : '');

function negativeIssues(lines: string[]): TextIssue[] {
  const negative = negativeLines(lines);
  if (!negative.length) return [];
  const shown = firstLines(negative);
  return [
    {
      severity: 'info',
      code: 'negative-phrasing',
      params: { n: negative.length, lines: shown },
      message: `${negative.length} consigne(s) formulée(s) en interdiction sans alternative (ligne ${shown}).`,
      fix: "Dire quoi faire : « Utiliser TypeScript strict » plutôt que « Pas de any ». Garder l'interdiction seulement suivie de l'alternative (« … : utiliser X »).",
    },
  ];
}

/** Blocs de code fermés : index (0-based) de la ligne d'ouverture et nombre de lignes de contenu. */
function codeBlocks(lines: string[]): { start: number; size: number }[] {
  const fences = lines.flatMap((line, i) => (line.trim().startsWith('```') ? [i] : []));
  const blocks: { start: number; size: number }[] = [];
  // Les clôtures vont par paires ; une ouverture sans fermeture est ignorée.
  for (let k = 0; k + 1 < fences.length; k += 2) {
    blocks.push({ start: fences[k], size: fences[k + 1] - fences[k] - 1 });
  }
  return blocks;
}

function codeCopyIssues(lines: string[]): TextIssue[] {
  return codeBlocks(lines)
    .filter((b) => b.size > LIMITS.codeBlock)
    .map(({ start, size }) => ({
      severity: 'info',
      code: 'code-copy',
      params: { n: size, line: start + 1 },
      message: `Bloc de code de ${size} lignes (ligne ${start + 1}).`,
      fix: 'Pointer vers le fichier source (`chemin:ligne`) plutôt que copier : une copie devient obsolète.',
    }));
}

/** Contrôles applicables à n'importe quel fichier mémoire (générateur et analyse). */
export function lintMemoryText(file: string, text: string, isRoot = false): Issue[] {
  const lines = text.split('\n');
  const issues = [
    ...lengthIssues(lines.length, isRoot),
    ...vagueIssues(text),
    ...secretIssues(text),
    ...negativeIssues(lines),
    ...codeCopyIssues(lines),
  ];
  return issues.map((issue) => ({ ...issue, file }));
}

/** Contrôles de conception d'une skill (Générateur et SKILL.md d'un dépôt analysé). */
export function lintSkill(label: string, description: string, body: string): Issue[] {
  const issues: Issue[] = [];
  description = description.trim();
  // Seule la description est lue avant le déclenchement : sans le « quand », la skill ne sert jamais.
  if (description.length >= 40 && !SKILL_TRIGGER.test(description)) {
    issues.push({
      severity: 'warning',
      code: 'no-trigger',
      params: { label },
      message: `Description de « ${label} » sans situation déclenchante.`,
      fix: 'Finir par « Use when… » avec les demandes de l’utilisateur, y compris celles qui ne citent pas le nom de la skill.',
    });
  }

  if (body.trim()) {
    const lines = body.split('\n').length;
    if (lines > LIMITS.skillLines) {
      issues.push({
        severity: 'warning',
        code: 'long-skill',
        params: { label, n: lines, max: LIMITS.skillLines },
        message: `SKILL.md de « ${label} » : ${lines} lignes (max conseillé ${LIMITS.skillLines}).`,
        fix: 'Garder les étapes dans SKILL.md et déplacer le détail dans des fichiers de référence, lus seulement quand une étape le demande.',
      });
    }
    if (!/^\s*\d+[.)]\s/m.test(body)) {
      issues.push({
        severity: 'info',
        code: 'no-workflow',
        params: { label },
        message: `« ${label} » : pas d’étapes numérotées.`,
        fix: 'Écrire la procédure en étapes ordonnées (1., 2., 3.) : Claude les suit dans l’ordre au lieu de deviner.',
      });
    }
    if (!SKILL_VERIFY.test(body)) {
      issues.push({
        severity: 'info',
        code: 'no-verification',
        params: { label },
        message: `« ${label} » : aucune étape de vérification.`,
        fix: 'Finir par une vérification concrète (commande de test, critère mesurable) pour que Claude contrôle son résultat.',
      });
    }
  }
  return issues;
}

/** Portée « chemins » : au moins un glob, chacun relatif à la racine et sans espace. */
function pathScopeIssues(rule: Rule, label: string): Issue[] {
  const issues: Issue[] = [];
  if (!rule.targets.length) {
    issues.push({
      severity: 'error',
      code: 'no-paths',
      params: { label },
      message: `« ${label} » : portée « chemins » sans glob.`,
      fix: 'Ajouter un glob, ex. `src/api/**/*.ts`.',
    });
  }
  for (const glob of rule.targets.filter((g) => /^\/|\s/.test(g))) {
    issues.push({
      severity: 'warning',
      code: 'bad-glob',
      params: { glob },
      message: `Glob « ${glob} » : relatif à la racine, sans espace.`,
      fix: 'Écrire `src/**/*.ts` et non `/src/...`.',
    });
  }
  return issues;
}

/** Portée « dossier » : un vrai dossier, pas un glob. */
function directoryScopeIssues(rule: Rule, label: string): Issue[] {
  const dir = rule.targets[0] ?? '';
  if (!dir.trim()) {
    return [
      {
        severity: 'error',
        code: 'no-dir',
        params: { label },
        message: `« ${label} » : portée « dossier » sans dossier.`,
        fix: 'Indiquer le dossier, ex. `apps/api`.',
      },
    ];
  }
  if (/[*?[\]]/.test(dir)) {
    return [
      {
        severity: 'error',
        code: 'dir-glob',
        params: { dir },
        message: `« ${dir} » est un glob, pas un dossier.`,
        fix: 'Utiliser la portée « chemins » pour un glob.',
      },
    ];
  }
  return [];
}

/** Contenu d'une règle mémoire : poids si toujours chargée, formatage, commandes exactes. */
function memoryContentIssues(rule: Rule, label: string): Issue[] {
  const issues: Issue[] = [];
  const alwaysLoaded = rule.scope === 'project' || rule.scope === 'topic';
  const lineCount = rule.body.split('\n').filter((l) => l.trim()).length;
  if (alwaysLoaded && lineCount > LIMITS.ruleLines) {
    issues.push({
      severity: 'info',
      code: 'heavy-rule',
      params: { label, n: lineCount },
      message: `« ${label} » : ${lineCount} lignes chargées à chaque session.`,
      fix: 'Si c’est une procédure ponctuelle, en faire une skill (chargée à la demande).',
    });
  }
  if (LINTER_JOB.test(rule.body)) {
    issues.push({
      severity: 'info',
      code: 'linter-job',
      params: { label },
      message: `« ${label} » décrit du formatage.`,
      fix: 'Confier ça au formatter/linter + hook PostToolUse. Ne pas demander au LLM le travail d’un linter.',
    });
  }
  if (rule.category === 'commands' && !/`[^`]+`/.test(rule.body)) {
    issues.push({
      severity: 'warning',
      code: 'command-not-exact',
      params: { label },
      message: `« ${label} » : aucune commande exacte entre backticks.`,
      fix: 'Écrire la commande complète, ex. `pnpm test -- path/to/file`.',
    });
  }
  return issues;
}

/** Problèmes propres à la portée : glob pour « chemins », dossier pour « dossier ». */
function scopeIssues(rule: Rule, label: string): Issue[] {
  if (rule.scope === 'path') return pathScopeIssues(rule, label);
  if (rule.scope === 'directory') return directoryScopeIssues(rule, label);
  return [];
}

/** Commande, skill ou agent : nom en kebab-case. */
function nameIssues(rule: Rule): Issue[] {
  const name = rule.name || slug(rule.title);
  if (NAME_RE.test(name) && name.length <= 64) return [];
  return [
    {
      severity: 'error',
      code: 'bad-name',
      params: { name },
      message: `Nom « ${name} » invalide.`,
      fix: 'kebab-case, minuscules, chiffres et tirets, 64 caractères max.',
    },
  ];
}

/** Description : présente, assez longue pour déclencher (sauf commande), pas plus de 1024 caractères. */
function descriptionIssues(rule: Rule, label: string): Issue[] {
  const description = rule.description?.trim() ?? '';
  if (!description) {
    return [
      {
        severity: rule.kind === 'command' ? 'warning' : 'error',
        code: 'no-description',
        params: { label },
        message: `« ${label} » sans description.`,
        fix: 'Décrire quoi ET quand l’utiliser : c’est ce que Claude lit pour décider.',
      },
    ];
  }
  if (rule.kind !== 'command' && description.length < 40) {
    return [
      {
        severity: 'warning',
        code: 'short-description',
        params: { label },
        message: `Description de « ${label} » trop courte pour déclencher au bon moment.`,
        fix: 'Ajouter « Use when… » avec les situations déclencheuses.',
      },
    ];
  }
  if (description.length > 1024) {
    return [
      {
        severity: 'error',
        code: 'long-description',
        params: { label },
        message: `Description de « ${label} » > 1024 caractères.`,
        fix: 'Résumer ; mettre le détail dans le corps.',
      },
    ];
  }
  return [];
}

/** Hook : commande, événement connu, matcher pour les événements d'outil. */
function hookIssues(rule: Rule, label: string): Issue[] {
  const issues: Issue[] = [];
  if (!rule.command?.trim()) {
    issues.push({
      severity: 'error',
      code: 'hook-no-command',
      params: { label },
      message: `Hook « ${label} » sans commande.`,
      fix: "Ex. `jq -r '.tool_input.file_path' | xargs pnpm exec prettier --write`.",
    });
  }
  if (!rule.event || !HOOK_EVENTS.includes(rule.event)) {
    issues.push({
      severity: 'error',
      code: 'hook-event',
      params: { label, events: HOOK_EVENTS.join(', ') },
      message: `Hook « ${label} » : événement inconnu.`,
      fix: `Choisir parmi ${HOOK_EVENTS.join(', ')}.`,
    });
  }
  if ((rule.event === 'PreToolUse' || rule.event === 'PostToolUse') && !rule.matcher) {
    issues.push({
      severity: 'info',
      code: 'hook-matcher',
      params: { label },
      message: `Hook « ${label} » s’exécute après chaque outil.`,
      fix: 'Restreindre avec un matcher, ex. `Edit|Write`.',
    });
  }
  return issues;
}

/** Problèmes selon le type d'élément, dans l'ordre d'affichage. */
function kindIssues(rule: Rule, label: string): Issue[] {
  switch (rule.kind) {
    case 'rule':
      return [...scopeIssues(rule, label), ...memoryContentIssues(rule, label)];
    case 'command':
    case 'agent':
      return [...nameIssues(rule), ...descriptionIssues(rule, label)];
    case 'skill':
      return [
        ...nameIssues(rule),
        ...descriptionIssues(rule, label),
        ...lintSkill(label, rule.description ?? '', rule.body),
      ];
    case 'hook':
      return hookIssues(rule, label);
    default:
      return [];
  }
}

function ruleIssues(rule: Rule): Issue[] {
  const label = rule.title || rule.name || rule.id;
  const issues: Issue[] = [];
  if (rule.kind !== 'hook' && !rule.body.trim()) {
    issues.push({
      severity: 'error',
      code: 'empty',
      params: { label },
      message: `« ${label} » est vide.`,
      fix: 'Écrire le contenu ou désactiver l’élément.',
    });
  }
  issues.push(...kindIssues(rule, label));
  return issues.map((i) => ({ ruleId: rule.id, ...i }));
}

/** Chaque ligne du corps de chaque règle, avec sa règle, dans l'ordre. */
function ruleLines(rules: Rule[]): { rule: Rule; line: string }[] {
  return rules.flatMap((rule) => rule.body.split('\n').map((line) => ({ rule, line })));
}

/** Clé de comparaison d'une ligne : sans puce, en minuscules. */
const lineKey = (line: string) =>
  line
    .replace(/^[-*+\s]+/, '')
    .trim()
    .toLowerCase();

/** Ligne (d'au moins 12 caractères) déjà présente dans une autre règle. */
function duplicateIssues(memory: Rule[]): Issue[] {
  const issues: Issue[] = [];
  const seen = new Map<string, Rule>();
  for (const { rule, line } of ruleLines(memory)) {
    const key = lineKey(line);
    if (key.length < 12) continue;
    const other = seen.get(key);
    if (!other || other.id === rule.id) {
      seen.set(key, rule);
      continue;
    }
    issues.push({
      severity: 'warning',
      code: 'duplicate',
      params: { title: other.title, line: line.trim() },
      ruleId: rule.id,
      message: `Ligne dupliquée avec « ${other.title} » : « ${line.trim()} ».`,
      fix: 'Garder une seule source de vérité.',
    });
  }
  return issues;
}

/** Première règle citant chaque `code` dans une ligne affirmative, et dans une ligne d'interdiction. */
function spansByPolarity(memory: Rule[]): { positive: Map<string, Rule>; negative: Map<string, Rule> } {
  const positive = new Map<string, Rule>();
  const negative = new Map<string, Rule>();
  const cited = ruleLines(memory).flatMap(({ rule, line }) =>
    codeSpans(line).map((span) => ({ rule, span, target: NEGATION.test(line) ? negative : positive })),
  );
  for (const { rule, span, target } of cited) if (!target.has(span)) target.set(span, rule);
  return { positive, negative };
}

/** Même `code` demandé par une règle et interdit par une autre de même portée. */
function contradictionIssues(memory: Rule[]): Issue[] {
  const { positive, negative } = spansByPolarity(memory);
  return [...negative].flatMap(([span, rule]): Issue[] => {
    const other = positive.get(span);
    if (!other || other.scope !== rule.scope) return [];
    return [
      {
        severity: 'warning',
        code: 'contradiction',
        params: { span, allowed: other.title, denied: rule.title },
        ruleId: rule.id,
        message: `\`${span}\` est à la fois demandé (« ${other.title} ») et interdit (« ${rule.title} »).`,
        fix: 'Clarifier quand l’un ou l’autre s’applique, ou supprimer une des deux règles.',
      },
    ];
  });
}

/** `code` d'une ligne situés avant une éventuelle négation : « `pnpm install` (jamais `npm`) » ne cite que pnpm. */
function affirmedSpans(line: string): string[] {
  const negation = line.search(NEGATION);
  const affirmed = negation >= 0 ? line.slice(0, negation) : line;
  return [...affirmed.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

/** Plusieurs gestionnaires de paquets cités dans les règles de commandes. */
function packageManagerIssues(memory: Rule[]): Issue[] {
  const commandLines = ruleLines(memory.filter((r) => r.category === 'commands'));
  const managers = new Set(
    commandLines
      .flatMap(({ line }) => affirmedSpans(line))
      .map((span) => span.trim().split(/\s+/)[0])
      .filter((first) => PACKAGE_MANAGERS.includes(first)),
  );
  if (managers.size <= 1) return [];
  return [
    {
      severity: 'warning',
      code: 'package-manager',
      params: { managers: [...managers].join(', ') },
      message: `Plusieurs gestionnaires de paquets : ${[...managers].join(', ')}.`,
      fix: 'N’en garder qu’un ; Claude choisira sinon au hasard.',
    },
  ];
}

function crossRuleIssues(rules: Rule[]): Issue[] {
  const memory = rules.filter((r) => r.kind === 'rule');
  return [...duplicateIssues(memory), ...contradictionIssues(memory), ...packageManagerIssues(memory)];
}

function projectIssues(project: Project, files: GeneratedFile[]): Issue[] {
  const issues: Issue[] = [];
  const active = project.rules.filter((r) => r.enabled);
  if (!active.length) {
    issues.push({
      severity: 'error',
      code: 'no-rules',
      message: 'Aucune règle active : rien à envoyer à Claude.',
      fix: "Ajouter une règle, partir d'un pattern ou importer un CLAUDE.md.",
    });
  }
  if (!active.some((r) => r.kind === 'rule' && r.category === 'commands' && r.scope === 'project')) {
    issues.push({
      severity: 'warning',
      code: 'no-commands',
      message: 'Aucune commande build/test/lint dans la mémoire racine.',
      fix: 'Ajouter une règle « Commandes » : install, dev, test, test unitaire, lint, typecheck, build.',
    });
  }
  if (!project.description.trim() || !project.stack.trim()) {
    issues.push({
      severity: 'info',
      code: 'no-context',
      message: 'Description ou stack du projet manquante.',
      fix: 'Une phrase sur le « quoi » et la stack aident Claude sur les cas ambigus.',
    });
  }
  if (!active.some((r) => r.kind === 'hook')) {
    issues.push({
      severity: 'info',
      code: 'no-hooks',
      message: 'Aucun hook : format et lint reposent sur la bonne volonté du modèle.',
      fix: 'Ajouter un hook PostToolUse `Edit|Write` qui lance le formatter.',
    });
  }
  if (!project.permissions.deny.length) {
    issues.push({
      severity: 'info',
      code: 'no-deny',
      message: 'Aucune permission refusée.',
      fix: 'Ex. refuser `Read(./.env)` et `Read(./secrets/**)`.',
    });
  }
  const critical = active.filter((r) => r.kind === 'rule' && r.scope === 'project' && r.critical);
  if (critical.length > LIMITS.criticalRules) {
    issues.push({
      severity: 'warning',
      code: 'too-many-critical',
      params: { n: critical.length, max: LIMITS.criticalRules },
      file: 'CLAUDE.md',
      message: `${critical.length} règles critiques : au-delà de ${LIMITS.criticalRules}, plus rien ne ressort.`,
      fix: 'Garder critiques seulement les consignes les plus souvent oubliées (tests avant de rendre la main, format des commits).',
    });
  }
  if (active.some((r) => r.kind === 'rule' && r.scope === 'local')) {
    issues.push({
      severity: 'info',
      code: 'local-gitignore',
      file: 'CLAUDE.local.md',
      message: 'CLAUDE.local.md doit rester hors du dépôt.',
      fix: 'Vérifier que `.gitignore` contient `CLAUDE.local.md`.',
    });
  }
  const paths = new Map<string, number>();
  for (const f of files) paths.set(f.path, (paths.get(f.path) ?? 0) + 1);
  for (const [path, n] of paths) {
    if (n > 1)
      issues.push({
        severity: 'error',
        code: 'collision',
        params: { n, path },
        file: path,
        message: `${n} éléments génèrent ${path}.`,
        fix: 'Renommer un des éléments.',
      });
  }
  return issues;
}

export function scoreFrom(issues: Issue[]): number {
  const penalty = issues.reduce((sum, i) => sum + (i.severity === 'error' ? 15 : i.severity === 'warning' ? 5 : 1), 0);
  return Math.max(0, 100 - penalty);
}

export function checkProject(project: Project, files = generate(project)): QualityReport {
  const issues: Issue[] = [];
  for (const rule of project.rules.filter((r) => r.enabled)) issues.push(...ruleIssues(rule));
  issues.push(...crossRuleIssues(project.rules.filter((r) => r.enabled)));
  for (const file of files) {
    if (file.path.endsWith('.json')) continue;
    issues.push(...lintMemoryText(file.path, file.content, file.path === 'CLAUDE.md' || file.path === 'AGENTS.md'));
  }
  issues.push(...projectIssues(project, files));

  const alwaysLoadedInstructions = files
    .filter((f) => f.loading === 'always')
    .reduce((sum, f) => sum + countInstructions(f.content), 0);
  if (alwaysLoadedInstructions > LIMITS.alwaysInstructions) {
    issues.push({
      severity: 'warning',
      code: 'instruction-budget',
      params: { n: alwaysLoadedInstructions, max: LIMITS.alwaysInstructions },
      message: `${alwaysLoadedInstructions} instructions chargées à chaque session (budget ≈ ${LIMITS.alwaysInstructions}).`,
      fix: 'Passer des règles en portée « chemins » ou en skills.',
    });
  }

  const order = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);
  // Projet vide : la note part de zéro au lieu de 100 moins quelques manques.
  const score = project.rules.some((r) => r.enabled) ? scoreFrom(issues) : 0;
  return { score, issues, alwaysLoadedInstructions };
}
