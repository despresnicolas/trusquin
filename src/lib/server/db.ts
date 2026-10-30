import postgres from 'postgres';
import type { RepoAnalysis } from '../core/types.ts';
import type { AnalysisRecord, AnalysisRun, ProjectSummary } from '../history.ts';

export type Sql = postgres.Sql;

/** `DATABASE_URL`, chargée depuis `.env` si absente de l'environnement. */
export function databaseUrl(): string | undefined {
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile();
    } catch {
      // pas de .env : la base reste optionnelle
    }
  }
  return process.env.DATABASE_URL || undefined;
}

export function connect(url: string, options: postgres.Options<Record<string, never>> = {}): Sql {
  return postgres(url, { onnotice: () => {}, ...options });
}

export async function migrate(sql: Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS analyses (
      id serial PRIMARY KEY,
      path text NOT NULL,
      name text NOT NULL,
      file_count integer NOT NULL,
      score integer NOT NULL,
      grade text NOT NULL,
      result jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS analyses_path_created_idx ON analyses (path, created_at DESC)`;
}

interface Row {
  id: number;
  path: string;
  name: string;
  file_count: number;
  score: number;
  grade: RepoAnalysis['grade'];
  created_at: Date;
}

const run = (r: Row): AnalysisRun => ({
  id: r.id,
  path: r.path,
  name: r.name,
  fileCount: r.file_count,
  score: r.score,
  grade: r.grade,
  createdAt: r.created_at.toISOString(),
});

export async function saveAnalysis(
  sql: Sql,
  a: { path: string; name: string; fileCount: number; result: RepoAnalysis },
): Promise<AnalysisRecord> {
  const [row] = await sql<Row[]>`
    INSERT INTO analyses (path, name, file_count, score, grade, result)
    VALUES (${a.path}, ${a.name}, ${a.fileCount}, ${a.result.score}, ${a.result.grade}, ${sql.json(a.result as never)})
    RETURNING id, path, name, file_count, score, grade, created_at`;
  return { ...run(row), result: a.result };
}

/** Un résumé par dossier analysé, le plus récent en premier. */
export async function listProjects(sql: Sql): Promise<ProjectSummary[]> {
  const rows = await sql<(Row & { runs: number; previous_score: number | null })[]>`
    SELECT * FROM (
      SELECT DISTINCT ON (path) id, path, name, file_count, score, grade, created_at,
        count(*) OVER (PARTITION BY path)::int AS runs,
        lead(score) OVER (PARTITION BY path ORDER BY created_at DESC, id DESC) AS previous_score
      FROM analyses
      ORDER BY path, created_at DESC, id DESC
    ) latest
    ORDER BY created_at DESC`;
  return rows.map((r) => ({ last: run(r), runs: r.runs, previousScore: r.previous_score }));
}

/** Historique d'un dossier, sans le détail des critères. */
export async function listRuns(sql: Sql, path: string): Promise<AnalysisRun[]> {
  const rows = await sql<Row[]>`
    SELECT id, path, name, file_count, score, grade, created_at FROM analyses
    WHERE path = ${path} ORDER BY created_at DESC, id DESC`;
  return rows.map(run);
}

export async function getAnalysis(sql: Sql, id: number): Promise<AnalysisRecord | null> {
  const [row] = await sql<(Row & { result: RepoAnalysis })[]>`
    SELECT id, path, name, file_count, score, grade, created_at, result FROM analyses WHERE id = ${id}`;
  return row ? { ...run(row), result: row.result } : null;
}

/** Supprime tout l'historique d'un dossier ; renvoie le nombre d'analyses supprimées. */
export async function deleteProject(sql: Sql, path: string): Promise<number> {
  const result = await sql`DELETE FROM analyses WHERE path = ${path}`;
  return result.count;
}
