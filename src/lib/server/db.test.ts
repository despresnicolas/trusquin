import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { RepoAnalysis } from '../core/types.ts';
import { connect, databaseUrl, deleteRepo, getAnalysis, listRepos, listRuns, migrate, saveAnalysis } from './db.ts';
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
});
