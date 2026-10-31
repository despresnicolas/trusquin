import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { starterProject } from '../core/presets.ts';
import type { RepoAnalysis } from '../core/types.ts';
import {
  connect,
  databaseUrl,
  deleteProject,
  deleteRepo,
  getAnalysis,
  getProject,
  listProjects,
  listRepos,
  listRuns,
  migrate,
  saveAnalysis,
  saveProject,
} from './db.ts';
import type { Sql } from './db.ts';

const url = databaseUrl();
const schema = `sauron_test_${process.pid}`;
const result = (score: number): RepoAnalysis => ({
  score,
  grade: 'C',
  criteria: [],
  memoryIssues: [],
  memoryFiles: ['CLAUDE.md'],
});

// Intégration : tourne seulement si DATABASE_URL pointe vers un PostgreSQL, dans un schéma jetable.
describe.skipIf(!url)('historique PostgreSQL', () => {
  let sql: Sql;

  beforeAll(async () => {
    sql = connect(url!, { connection: { search_path: schema }, max: 1 });
    await sql.unsafe(`CREATE SCHEMA ${schema}`);
    await migrate(sql);
  });

  afterAll(async () => {
    await sql.unsafe(`DROP SCHEMA ${schema} CASCADE`);
    await sql.end();
  });

  it('enregistre, résume par dossier et supprime', async () => {
    await saveAnalysis(sql, { path: '/a', name: 'a', fileCount: 3, result: result(40) });
    const last = await saveAnalysis(sql, { path: '/a', name: 'a', fileCount: 4, result: result(70) });
    await saveAnalysis(sql, { path: '/b', name: 'b', fileCount: 1, result: result(90) });

    const repos = await listRepos(sql);
    expect(repos.map((p) => p.last.path)).toEqual(['/b', '/a']);
    expect(repos[1]).toMatchObject({ runs: 2, previousScore: 40, last: { id: last.id, score: 70 } });
    expect(repos[0].previousScore).toBeNull();

    expect((await listRuns(sql, '/a')).map((r) => r.score)).toEqual([70, 40]);
    expect((await getAnalysis(sql, last.id))?.result).toEqual(result(70));
    expect(await getAnalysis(sql, -1)).toBeNull();

    expect(await deleteRepo(sql, '/a')).toBe(2);
    expect((await listRepos(sql)).map((p) => p.last.path)).toEqual(['/b']);
  });

  it('versionne les projets du générateur sans doublon', async () => {
    const a = { ...starterProject(), name: 'a' };
    const first = await saveProject(sql, a, 80);
    expect((await saveProject(sql, a, 80)).id).toBe(first.id);
    const second = await saveProject(sql, { ...a, description: 'v2' }, 85);
    await saveProject(sql, { ...a, name: 'b' }, 90);

    const projects = await listProjects(sql);
    expect(projects.map((p) => p.last.name)).toEqual(['b', 'a']);
    expect(projects[1]).toMatchObject({ versions: 2, last: { id: second.id, score: 85, ruleCount: a.rules.length } });
    expect((await getProject(sql, second.id))?.project.description).toBe('v2');

    expect(await deleteProject(sql, 'a')).toBe(2);
    expect((await listProjects(sql)).map((p) => p.last.name)).toEqual(['b']);
  });
});
