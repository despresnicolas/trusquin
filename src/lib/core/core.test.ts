import { describe, expect, it } from 'vitest';
import { analyzeRepo, claudeFiles, importContext, importedPath, importRules } from './analyze';
import { generate, slug, toBullets } from './placement';
import {
  DECISION_TREE,
  isStep,
  newRule,
  PATTERNS,
  starterProject,
  type Pattern,
  type Step,
  templateForCriterion,
  TEMPLATES,
  templatesFor,
} from './presets';
import { checkProject, lintMemoryText } from './quality';
import type { Project } from './types';

// Commandes, architecture et hook Prettier : une config minimale mais complète.
const sampleRules = () => [TEMPLATES[0], TEMPLATES[1], TEMPLATES[7]].map((t) => newRule(t.rule));

function project(rules: Project['rules'], extra: Partial<Project> = {}): Project {
  return { ...starterProject(), description: 'd', stack: 's', rules, ...extra };
}

describe('placement', () => {
  it('places each scope in the right file', () => {
    const files = generate(
      project([
        newRule({ title: 'Cmd', category: 'commands', body: '`pnpm test`' }),
        newRule({ title: 'Tests', category: 'testing', scope: 'topic', body: 'a' }),
        newRule({ title: 'Api', scope: 'path', targets: ['apps/api/**/*.ts'], body: 'b' }),
        newRule({ title: 'Web', scope: 'directory', targets: ['apps/web/'], body: 'c' }),
        newRule({ title: 'Moi', scope: 'local', body: 'd' }),
        newRule({ title: 'Global', scope: 'user', body: 'e' }),
        newRule({ kind: 'skill', title: 'Release', name: 'release', description: 'x', body: 'y' }),
        newRule({ kind: 'agent', title: 'T', name: 'test-runner', description: 'x', body: 'y' }),
        newRule({ kind: 'command', title: 'R', name: 'review', body: 'y' }),
        newRule({ kind: 'hook', title: 'fmt', event: 'PostToolUse', matcher: 'Edit', command: 'prettier' }),
      ]),
    );
    expect(files.map((f) => f.path).sort()).toEqual(
      [
        '.claude/agents/test-runner.md',
        '.claude/commands/review.md',
        '.claude/rules/api.md',
        '.claude/rules/testing.md',
        '.claude/settings.json',
        '.claude/skills/release/SKILL.md',
        'CLAUDE.local.md',
        'CLAUDE.md',
        'apps/web/CLAUDE.md',
        '~/.claude/CLAUDE.md',
      ].sort(),
    );
    const scoped = files.find((f) => f.path === '.claude/rules/api.md')!;
    expect(scoped.content).toMatch(/^---\npaths:\n {2}- "apps\/api\/\*\*\/\*\.ts"\n---/);
    const settings = JSON.parse(files.find((f) => f.path === '.claude/settings.json')!.content);
    expect(settings.hooks.PostToolUse[0]).toEqual({
      matcher: 'Edit',
      hooks: [{ type: 'command', command: 'prettier' }],
    });
    expect(files.find((f) => f.path === 'CLAUDE.md')!.content).toContain('## Automatisations');
  });

  it('uses AGENTS.md with an import when asked', () => {
    const files = generate(project([newRule({ body: 'x' })], { useAgentsMd: true }));
    expect(files.find((f) => f.path === 'CLAUDE.md')!.content).toBe('@AGENTS.md\n');
    expect(files.find((f) => f.path === 'AGENTS.md')!.content).toContain('- x');
  });

  it('slugs accents and ligatures', () => {
    expect(slug('Cœur métier')).toBe('coeur-metier');
  });

  it('keeps code fences and existing bullets', () => {
    expect(toBullets('a\n- b\n```\nc\n```')).toBe('- a\n- b\n```\nc\n```');
  });
});

describe('quality', () => {
  it('flags vague wording, secrets and linter jobs', () => {
    const report = checkProject(
      project([
        newRule({ title: 'Style', body: 'Écrire du code propre\nIndentation 2 espaces' }),
        newRule({ title: 'Cfg', body: 'api_key = abcdef123456789' }),
      ]),
    );
    const codes = report.issues.map((i) => i.code);
    expect(codes).toContain('vague');
    expect(codes).toContain('secret');
    expect(codes).toContain('linter-job');
    expect(codes).toContain('no-commands');
  });

  it('detects contradictions and mixed package managers', () => {
    const report = checkProject(
      project([
        newRule({ title: 'A', category: 'commands', body: 'Lancer `npm test`\nUtiliser `pnpm`' }),
        newRule({ title: 'B', body: 'Ne jamais utiliser `pnpm`' }),
      ]),
    );
    const codes = report.issues.map((i) => i.code);
    expect(codes).toContain('contradiction');
    expect(codes).toContain('package-manager');
  });

  it('ignores package managers mentioned as forbidden', () => {
    const report = checkProject(
      project([
        newRule({ title: 'C', category: 'commands', body: 'Installer : `pnpm install` (jamais `npm` ni `yarn`)' }),
      ]),
    );
    expect(report.issues.map((i) => i.code)).not.toContain('package-manager');
  });

  it('validates skills and path scopes', () => {
    const report = checkProject(
      project([newRule({ kind: 'skill', name: 'Bad Name', body: 'x' }), newRule({ scope: 'path', body: 'x' })]),
    );
    const codes = report.issues.map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(['bad-name', 'no-description', 'no-paths']));
  });

  it('warns on long root memory', () => {
    const text = Array.from({ length: 120 }, (_, i) => `- r${i}`).join('\n');
    expect(lintMemoryText('CLAUDE.md', text, true)[0].code).toBe('root-long');
  });

  it('scores an empty project zero', () => {
    const report = checkProject(project([]));
    expect(report.score).toBe(0);
    expect(report.issues[0].code).toBe('no-rules');
  });

  it('gives a minimal complete config a high score', () => {
    expect(checkProject(project(sampleRules())).score).toBeGreaterThanOrEqual(90);
  });
});

describe('analyze', () => {
  it('scores an empty repo low and a configured repo high', () => {
    const empty = analyzeRepo({ paths: ['index.js'], contents: {} });
    expect(empty.grade).toBe('E');

    const files = generate(project(sampleRules()));
    const contents: Record<string, string> = Object.fromEntries(files.map((f) => [f.path, f.content]));
    contents['CLAUDE.md'] += '\n## Architecture\n\n- `pnpm build`\n- `pnpm lint`\n';
    contents['.gitignore'] = 'CLAUDE.local.md\nsettings.local.json\n.env\n';
    contents['README.md'] = '# x';
    contents['.claude/skills/release/SKILL.md'] =
      '---\nname: release\ndescription: Prépare une release complète. Use when releasing.\n---\nbody';
    contents['.claude/rules/api.md'] = '---\npaths: ["src/**"]\n---\n- x';
    contents['.claude/agents/t.md'] = '---\nname: t\n---\nx';
    const paths = [
      ...Object.keys(contents),
      'tsconfig.json',
      'eslint.config.js',
      '.prettierrc',
      '.github/workflows/ci.yml',
      'pnpm-lock.yaml',
      'src/a.test.ts',
      'src/b.test.ts',
      'src/c.test.ts',
      'src/d.test.ts',
      'src/e.test.ts',
    ];
    const result = analyzeRepo({ paths, contents });
    expect(result.grade).toBe('A');
  });

  it('reports broken imports', () => {
    const result = analyzeRepo({ paths: ['CLAUDE.md'], contents: { 'CLAUDE.md': '@docs/missing.md\n' } });
    expect(result.memoryIssues.map((i) => i.code)).toContain('broken-import');
  });

  it('flags AGENTS.md that no sibling CLAUDE.md imports', () => {
    const codes = (contents: Record<string, string>) =>
      analyzeRepo({ paths: Object.keys(contents), contents })
        .memoryIssues.filter((i) => i.code === 'agents-not-imported')
        .map((i) => i.file);
    const alone = analyzeRepo({ paths: ['AGENTS.md'], contents: { 'AGENTS.md': '# P' } });
    expect(alone.criteria.find((c) => c.id === 'root-memory')?.status).toBe('partial');
    expect(codes({ 'AGENTS.md': '# P' })).toEqual(['AGENTS.md']);
    expect(codes({ 'AGENTS.md': '# P', 'CLAUDE.md': '# Autre' })).toEqual(['AGENTS.md']);
    expect(codes({ 'api/AGENTS.md': '# A', 'CLAUDE.md': '@AGENTS.md' })).toEqual(['api/AGENTS.md']);
    expect(codes({ 'AGENTS.md': '# P', 'CLAUDE.md': '@AGENTS.md\n\n## Claude' })).toEqual([]);
    expect(codes({ 'api/AGENTS.md': '# A', 'api/CLAUDE.md': '@./AGENTS.md' })).toEqual([]);
  });

  it('imports existing memory as rules', () => {
    let n = 0;
    const rules = importRules(
      {
        paths: [],
        contents: {
          'CLAUDE.md': '# P\n\n## Commands\n\n- `npm test`\n',
          '.claude/rules/api.md': '---\npaths:\n  - "src/api/**"\n---\n- valider',
          'apps/web/CLAUDE.md': '# web\n\n## Style\n\n- x',
        },
      },
      () => String(n++),
    );
    expect(rules.map((r) => [r.scope, r.category, r.targets])).toEqual([
      ['project', 'commands', []],
      ['path', 'other', ['src/api/**']],
      ['directory', 'conventions', ['apps/web']],
    ]);
  });

  it('imports hooks from .claude/settings.json', () => {
    const hook = newRule({ kind: 'hook', event: 'PostToolUse', matcher: 'Edit', command: 'prettier' });
    const files = generate(project([newRule({ body: 'x' }), hook]));
    const contents = Object.fromEntries(files.map((f) => [f.path, f.content]));
    const imported = importRules({ paths: [], contents }, () => 'h').filter((r) => r.kind === 'hook');
    expect(imported.map((r) => [r.event, r.matcher, r.command])).toEqual([['PostToolUse', 'Edit', 'prettier']]);
  });

  it('imports description and stack from the root memory, else package.json', () => {
    const files = generate(project([newRule({ body: 'x' })], { description: 'Un outil.', stack: 'Svelte, TS' }));
    const contents = Object.fromEntries(files.map((f) => [f.path, f.content]));
    expect(importContext({ paths: [], contents })).toEqual({ description: 'Un outil.', stack: 'Svelte, TS' });
    expect(
      importContext({
        paths: [],
        contents: { 'CLAUDE.md': '# P\n\n## Cmd\n\n- x', 'package.json': '{"description":"Pkg."}' },
      }),
    ).toEqual({ description: 'Pkg.', stack: '' });
  });
});

describe('patterns', () => {
  it('files every template under exactly one pattern', () => {
    for (const t of TEMPLATES) {
      expect(PATTERNS.filter((p) => templatesFor(p).includes(t)).length, t.label).toBe(1);
    }
  });

  it('reaches every pattern exactly once in the decision tree', () => {
    const leaves = (s: Step): Pattern[] => s.choices.flatMap((c) => (isStep(c.next) ? leaves(c.next) : [c.next]));
    expect(leaves(DECISION_TREE).toSorted((a, b) => a.answer.localeCompare(b.answer))).toEqual(
      PATTERNS.toSorted((a, b) => a.answer.localeCompare(b.answer)),
    );
  });
});

describe('claudeFiles', () => {
  it('groups readable Claude files, root first', () => {
    const contents = {
      'apps/web/CLAUDE.md': 'w',
      'CLAUDE.md': 'r',
      '.claude/rules/api.md': 'a',
      '.claude/skills/release/SKILL.md': 's',
      '.claude/settings.json': '{}',
      'README.md': 'x',
    };
    expect(claudeFiles({ paths: Object.keys(contents), contents }).map((f) => [f.group, f.path])).toEqual([
      ['memory', 'CLAUDE.md'],
      ['memory', 'apps/web/CLAUDE.md'],
      ['rules', '.claude/rules/api.md'],
      ['skills', '.claude/skills/release/SKILL.md'],
      ['settings', '.claude/settings.json'],
    ]);
  });
});

describe('importedPath', () => {
  it('maps a lone uploaded file to the path importRules expects', () => {
    expect(['CLAUDE.md', 'AGENTS.md', 'settings.json', 'api.md'].map(importedPath)).toEqual([
      'CLAUDE.md',
      'AGENTS.md',
      '.claude/settings.json',
      '.claude/rules/api.md',
    ]);
  });
});

describe('templateForCriterion', () => {
  it('resolves a template for every mapped criterion', () => {
    for (const id of ['root-memory', 'commands', 'architecture', 'modular', 'hooks', 'on-demand', 'agents']) {
      expect(templateForCriterion(id), id).toBeDefined();
    }
    expect(templateForCriterion('readme')).toBeUndefined();
  });
});

describe('bonnes pratiques', () => {
  it('flags prohibitions without a positive alternative', () => {
    const issues = lintMemoryText(
      'CLAUDE.md',
      '- Ne jamais utiliser `any`\n- Pas de console.log : utiliser `logger`\n- Lancer `pnpm test`\n- Never push to main',
    );
    const negative = issues.filter((i) => i.code === 'negative-phrasing');
    expect(negative).toHaveLength(1);
    expect(negative[0].message).toContain('2');
  });

  it('anchors critical rules at the top and bottom of the root memory', () => {
    const files = generate(
      project([
        newRule({ title: 'Archi', category: 'architecture', body: 'x' }),
        newRule({
          title: 'Tests',
          category: 'testing',
          body: 'Lancer `pnpm test` avant de rendre la main',
          critical: true,
        }),
      ]),
    );
    const root = files.find((f) => f.path === 'CLAUDE.md')!.content;
    expect(root.indexOf('## Règles critiques')).toBeLessThan(root.indexOf('## Architecture'));
    expect(root.trimEnd().endsWith('- Lancer `pnpm test` avant de rendre la main')).toBe(true);
    expect(root.match(/Lancer `pnpm test`/g)).toHaveLength(2);
  });

  it('warns when too many rules are critical', () => {
    const rules = [1, 2, 3, 4].map((n) => newRule({ title: `R${n}`, body: `Règle ${n}`, critical: true }));
    expect(checkProject(project(rules)).issues.map((i) => i.code)).toContain('too-many-critical');
  });

  it('rewards memory that points to exemplary files of the repo', () => {
    const scored = (root: string) =>
      analyzeRepo({ paths: ['CLAUDE.md', 'src/Button.svelte'], contents: { 'CLAUDE.md': root } }).criteria.find(
        (c) => c.id === 'examples',
      )!.status;
    expect(scored('- Nouveau composant : suivre `src/Button.svelte`')).toBe('pass');
    expect(scored('- Composants propres')).toBe('fail');
    expect(templateForCriterion('examples')).toBeDefined();
  });

  it('ships workflow templates for planning and debugging', () => {
    const names = TEMPLATES.map((t) => t.rule.name);
    expect(names).toContain('plan');
    expect(names).toContain('debug');
  });
});
