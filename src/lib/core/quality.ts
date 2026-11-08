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

/** Contrôles applicables à n'importe quel fichier mémoire (générateur et analyse). */
export function lintMemoryText(file: string, text: string, isRoot = false): Issue[] {
  const issues: Issue[] = [];
  const lines = text.split('\n');
  const count = lines.length;
  if (isRoot && count > LIMITS.rootError) {
    issues.push({
      severity: 'error',
      code: 'root-too-long',
      params: { n: count, max: LIMITS.rootError },
      file,
      message: `${count} lignes : au-delà de ${LIMITS.rootError}, Claude suit moins bien les consignes.`,
      fix: 'Déplacer les sections spécifiques dans .claude/rules/ avec `paths`, ou en skills.',
    });
  } else if (isRoot && count > LIMITS.rootWarn) {
    issues.push({
      severity: 'warning',
      code: 'root-long',
      params: { n: count, max: LIMITS.rootWarn },
      file,
      message: `${count} lignes : viser moins de ${LIMITS.rootWarn} lignes pour la racine.`,
      fix: 'Garder la racine comme index ; détailler ailleurs.',
    });
  } else if (!isRoot && count > LIMITS.otherWarn) {
    issues.push({
      severity: 'warning',
      code: 'file-long',
      params: { n: count },
      file,
      message: `${count} lignes dans un seul fichier de règles.`,
      fix: 'Découper par thème ou par chemin.',
    });
  }

  const lower = text.toLowerCase();
  const vague = VAGUE.filter((v) => lower.includes(v));
  if (vague.length) {
    issues.push({
      severity: 'warning',
      code: 'vague',
      params: { terms: vague.join(', ') },
      file,
      message: `Formulations vagues : ${vague.map((v) => `« ${v} »`).join(', ')}.`,
      fix: 'Remplacer par une règle vérifiable (commande, seuil, exemple de fichier). Test : « sans cette ligne, Claude se tromperait-il ? »',
    });
  }

  for (const [pattern, label] of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      issues.push({
        severity: 'error',
        code: 'secret',
        params: { kind: label },
        file,
        message: `Secret probable (${label}).`,
        fix: 'Retirer la valeur, la mettre dans .env (gitignoré) et ne référencer que le nom de variable.',
      });
    }
  }

  const negative: number[] = [];
  let inside = false;
  lines.forEach((line, i) => {
    if (line.trim().startsWith('```')) inside = !inside;
    else if (!inside && NEGATIVE.test(line) && !ALTERNATIVE.test(line.replace(NEGATIVE, ''))) negative.push(i + 1);
  });
  if (negative.length) {
    issues.push({
      severity: 'info',
      code: 'negative-phrasing',
      params: { n: negative.length, lines: negative.slice(0, 5).join(', ') + (negative.length > 5 ? '…' : '') },
      file,
      message: `${negative.length} consigne(s) formulée(s) en interdiction sans alternative (ligne ${negative.slice(0, 5).join(', ')}${negative.length > 5 ? '…' : ''}).`,
      fix: "Dire quoi faire : « Utiliser TypeScript strict » plutôt que « Pas de any ». Garder l'interdiction seulement suivie de l'alternative (« … : utiliser X »).",
    });
  }

  let inFence = false;
  let fenceStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().startsWith('```')) continue;
    if (!inFence) fenceStart = i;
    else if (i - fenceStart - 1 > LIMITS.codeBlock) {
      issues.push({
        severity: 'info',
        code: 'code-copy',
        params: { n: i - fenceStart - 1, line: fenceStart + 1 },
        file,
        message: `Bloc de code de ${i - fenceStart - 1} lignes (ligne ${fenceStart + 1}).`,
        fix: 'Pointer vers le fichier source (`chemin:ligne`) plutôt que copier : une copie devient obsolète.',
      });
    }
    inFence = !inFence;
  }
  return issues;
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

function ruleIssues(rule: Rule): Issue[] {
  const issues: Issue[] = [];
  const base = { ruleId: rule.id };
  const label = rule.title || rule.name || rule.id;

  if (rule.kind !== 'hook' && !rule.body.trim()) {
    issues.push({
      ...base,
      severity: 'error',
      code: 'empty',
      params: { label },
      message: `« ${label} » est vide.`,
      fix: 'Écrire le contenu ou désactiver l’élément.',
    });
  }

  if (rule.kind === 'rule') {
    if (rule.scope === 'path' && !rule.targets.length) {
      issues.push({
        ...base,
        severity: 'error',
        code: 'no-paths',
        params: { label },
        message: `« ${label} » : portée « chemins » sans glob.`,
        fix: 'Ajouter un glob, ex. `src/api/**/*.ts`.',
      });
    }
    if (rule.scope === 'path') {
      for (const glob of rule.targets) {
        if (/^\/|\s/.test(glob)) {
          issues.push({
            ...base,
            severity: 'warning',
            code: 'bad-glob',
            params: { glob },
            message: `Glob « ${glob} » : relatif à la racine, sans espace.`,
            fix: 'Écrire `src/**/*.ts` et non `/src/...`.',
          });
        }
      }
    }
    if (rule.scope === 'directory') {
      const dir = rule.targets[0] ?? '';
      if (!dir.trim()) {
        issues.push({
          ...base,
          severity: 'error',
          code: 'no-dir',
          params: { label },
          message: `« ${label} » : portée « dossier » sans dossier.`,
          fix: 'Indiquer le dossier, ex. `apps/api`.',
        });
      } else if (/[*?[\]]/.test(dir)) {
        issues.push({
          ...base,
          severity: 'error',
          code: 'dir-glob',
          params: { dir },
          message: `« ${dir} » est un glob, pas un dossier.`,
          fix: 'Utiliser la portée « chemins » pour un glob.',
        });
      }
    }
    const alwaysLoaded = rule.scope === 'project' || rule.scope === 'topic';
    const lineCount = rule.body.split('\n').filter((l) => l.trim()).length;
    if (alwaysLoaded && lineCount > LIMITS.ruleLines) {
      issues.push({
        ...base,
        severity: 'info',
        code: 'heavy-rule',
        params: { label, n: lineCount },
        message: `« ${label} » : ${lineCount} lignes chargées à chaque session.`,
        fix: 'Si c’est une procédure ponctuelle, en faire une skill (chargée à la demande).',
      });
    }
    if (LINTER_JOB.test(rule.body)) {
      issues.push({
        ...base,
        severity: 'info',
        code: 'linter-job',
        params: { label },
        message: `« ${label} » décrit du formatage.`,
        fix: 'Confier ça au formatter/linter + hook PostToolUse. Ne pas demander au LLM le travail d’un linter.',
      });
    }
    if (rule.category === 'commands' && !/`[^`]+`/.test(rule.body)) {
      issues.push({
        ...base,
        severity: 'warning',
        code: 'command-not-exact',
        params: { label },
        message: `« ${label} » : aucune commande exacte entre backticks.`,
        fix: 'Écrire la commande complète, ex. `pnpm test -- path/to/file`.',
      });
    }
  }

  if (rule.kind === 'command' || rule.kind === 'skill' || rule.kind === 'agent') {
    const name = rule.name || slug(rule.title);
    if (!NAME_RE.test(name) || name.length > 64) {
      issues.push({
        ...base,
        severity: 'error',
        code: 'bad-name',
        params: { name },
        message: `Nom « ${name} » invalide.`,
        fix: 'kebab-case, minuscules, chiffres et tirets, 64 caractères max.',
      });
    }
    const description = rule.description?.trim() ?? '';
    if (!description) {
      issues.push({
        ...base,
        severity: rule.kind === 'command' ? 'warning' : 'error',
        code: 'no-description',
        params: { label },
        message: `« ${label} » sans description.`,
        fix: 'Décrire quoi ET quand l’utiliser : c’est ce que Claude lit pour décider.',
      });
    } else if (rule.kind !== 'command' && description.length < 40) {
      issues.push({
        ...base,
        severity: 'warning',
        code: 'short-description',
        params: { label },
        message: `Description de « ${label} » trop courte pour déclencher au bon moment.`,
        fix: 'Ajouter « Use when… » avec les situations déclencheuses.',
      });
    } else if (description.length > 1024) {
      issues.push({
        ...base,
        severity: 'error',
        code: 'long-description',
        params: { label },
        message: `Description de « ${label} » > 1024 caractères.`,
        fix: 'Résumer ; mettre le détail dans le corps.',
      });
    }
  }

  if (rule.kind === 'skill')
    issues.push(...lintSkill(label, rule.description ?? '', rule.body).map((i) => ({ ...base, ...i })));

  if (rule.kind === 'hook') {
    if (!rule.command?.trim()) {
      issues.push({
        ...base,
        severity: 'error',
        code: 'hook-no-command',
        params: { label },
        message: `Hook « ${label} » sans commande.`,
        fix: "Ex. `jq -r '.tool_input.file_path' | xargs pnpm exec prettier --write`.",
      });
    }
    if (!rule.event || !HOOK_EVENTS.includes(rule.event)) {
      issues.push({
        ...base,
        severity: 'error',
        code: 'hook-event',
        params: { label, events: HOOK_EVENTS.join(', ') },
        message: `Hook « ${label} » : événement inconnu.`,
        fix: `Choisir parmi ${HOOK_EVENTS.join(', ')}.`,
      });
    }
    if ((rule.event === 'PreToolUse' || rule.event === 'PostToolUse') && !rule.matcher) {
      issues.push({
        ...base,
        severity: 'info',
        code: 'hook-matcher',
        params: { label },
        message: `Hook « ${label} » s’exécute après chaque outil.`,
        fix: 'Restreindre avec un matcher, ex. `Edit|Write`.',
      });
    }
  }

  return issues;
}

function crossRuleIssues(rules: Rule[]): Issue[] {
  const issues: Issue[] = [];
  const memory = rules.filter((r) => r.kind === 'rule');

  const seen = new Map<string, Rule>();
  for (const rule of memory) {
    for (const line of rule.body.split('\n')) {
      const key = line
        .replace(/^[-*+\s]+/, '')
        .trim()
        .toLowerCase();
      if (key.length < 12) continue;
      const other = seen.get(key);
      if (other && other.id !== rule.id) {
        issues.push({
          severity: 'warning',
          code: 'duplicate',
          params: { title: other.title, line: line.trim() },
          ruleId: rule.id,
          message: `Ligne dupliquée avec « ${other.title} » : « ${line.trim()} ».`,
          fix: 'Garder une seule source de vérité.',
        });
      } else seen.set(key, rule);
    }
  }

  const positive = new Map<string, Rule>();
  const negative = new Map<string, Rule>();
  for (const rule of memory) {
    for (const line of rule.body.split('\n')) {
      const target = NEGATION.test(line) ? negative : positive;
      for (const span of codeSpans(line)) if (!target.has(span)) target.set(span, rule);
    }
  }
  for (const [span, rule] of negative) {
    const other = positive.get(span);
    if (other && other.scope === rule.scope) {
      issues.push({
        severity: 'warning',
        code: 'contradiction',
        params: { span, allowed: other.title, denied: rule.title },
        ruleId: rule.id,
        message: `\`${span}\` est à la fois demandé (« ${other.title} ») et interdit (« ${rule.title} »).`,
        fix: 'Clarifier quand l’un ou l’autre s’applique, ou supprimer une des deux règles.',
      });
    }
  }

  const managers = new Set<string>();
  for (const rule of memory.filter((r) => r.category === 'commands')) {
    // Seule la partie avant une négation compte : « `pnpm install` (jamais `npm`) » n'utilise que pnpm.
    for (const line of rule.body.split('\n')) {
      const negation = line.search(NEGATION);
      for (const span of (negation >= 0 ? line.slice(0, negation) : line).matchAll(/`([^`]+)`/g)) {
        const first = span[1].trim().split(/\s+/)[0];
        if (PACKAGE_MANAGERS.includes(first)) managers.add(first);
      }
    }
  }
  if (managers.size > 1) {
    issues.push({
      severity: 'warning',
      code: 'package-manager',
      params: { managers: [...managers].join(', ') },
      message: `Plusieurs gestionnaires de paquets : ${[...managers].join(', ')}.`,
      fix: 'N’en garder qu’un ; Claude choisira sinon au hasard.',
    });
  }
  return issues;
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
