import { describe, expect, it } from 'vitest';
import { analyzeRepo, importRules } from './analyze';
import { generate } from './placement';
import { newRule, starterProject, TEMPLATES } from './presets';
import { checkProject } from './quality';
import type { Project } from './types';

// Non-régression : fige les sorties complètes. Changement voulu → `pnpm exec vitest run -u` puis relire le diff du snapshot.
const project: Project = {
  ...starterProject(),
  name: 'Fixture',
  description: 'Projet de référence',
  stack: 'TypeScript',
  rules: TEMPLATES.map((t, i) => newRule({ ...t.rule, id: `r${i}` })),
};
const files = generate(project);
const repo = {
  paths: [...files.map((f) => f.path), 'src/a.ts'],
  contents: Object.fromEntries(files.map((f) => [f.path, f.content])),
};

describe('non-régression', () => {
  it('generate', () => {
    expect(files).toMatchSnapshot();
  });

  it('checkProject', () => {
    expect(checkProject(project, files)).toMatchSnapshot();
  });

  it('analyzeRepo', () => {
    expect(analyzeRepo(repo)).toMatchSnapshot();
  });

  it('importRules', () => {
    let n = 0;
    expect(importRules(repo, () => `i${n++}`)).toMatchSnapshot();
  });
});
