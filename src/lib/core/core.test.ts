import { describe, expect, it } from 'vitest';
import { analyzeRepo, importContext, importRules } from './analyze';
import { generate, slug, toBullets } from './placement';
import { newRule, starterProject } from './presets';
import { checkProject, lintMemoryText } from './quality';
import type { Project } from './types';

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

  it('gives a clean starter a high score', () => {
    expect(checkProject(project(starterProject().rules)).score).toBeGreaterThanOrEqual(90);
  });
});

describe('analyze', () => {
  it('scores an empty repo low and a configured repo high', () => {
    const empty = analyzeRepo({ paths: ['index.js'], contents: {} });
    expect(empty.grade).toBe('E');

    const files = generate(project(starterProject().rules));
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
