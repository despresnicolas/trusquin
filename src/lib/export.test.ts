import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { generate } from './core/placement';
import { newRule, starterProject } from './core/presets';
import { checkProject } from './core/quality';
import { exportZip, zipName } from './export';

describe('export', () => {
  it('names the zip after the project slug', () => {
    expect(zipName({ ...starterProject(), name: 'Mon Projet Été' })).toBe('mon-projet-ete-trusquin.zip');
    expect(zipName({ ...starterProject(), name: '  ' })).toBe('claude-trusquin.zip');
  });

  it('moves ~/ files under _home/ and adds the report', async () => {
    const project = { ...starterProject(), rules: [newRule({ scope: 'user', body: 'x' })] };
    const files = generate(project);
    const zip = await JSZip.loadAsync(await (await exportZip(files, checkProject(project, files))).arrayBuffer());
    const names = Object.keys(zip.files);
    expect(names).toContain('_home/.claude/CLAUDE.md');
    expect(names).toContain('_trusquin-report.md');
    expect(names.some((n) => n.startsWith('~'))).toBe(false);
  });
});
