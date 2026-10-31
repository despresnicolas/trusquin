import postgres from 'postgres';
import type { Project, RepoAnalysis } from '../core/types.ts';
import type {
  AnalysisRecord,
  AnalysisRun,
  ProjectRecord,
  ProjectSummary,
  ProjectVersion,
  RepoSummary,
} from '../history.ts';

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
  await sql`
    CREATE TABLE IF NOT EXISTS projects (
      id serial PRIMARY KEY,
      name text NOT NULL,
      rule_count integer NOT NULL,
      score integer NOT NULL,
      project jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS projects_name_created_idx ON projects (name, created_at DESC)`;
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
export async function listRepos(sql: Sql): Promise<RepoSummary[]> {
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
export async function deleteRepo(sql: Sql, path: string): Promise<number> {
  const result = await sql`DELETE FROM analyses WHERE path = ${path}`;
  return result.count;
}

interface ProjectRow {
  id: number;
  name: string;
  rule_count: number;
  score: number;
  created_at: Date;
}

const version = (r: ProjectRow): ProjectVersion => ({
  id: r.id,
  name: r.name,
  ruleCount: r.rule_count,
  score: r.score,
  createdAt: r.created_at.toISOString(),
});

/** Enregistre une version d'un projet du générateur, sauf si elle est identique à la dernière du même nom. */
export async function saveProject(sql: Sql, project: Project, score: number): Promise<ProjectVersion> {
  const json = sql.json(project as never);
  const [same] = await sql<ProjectRow[]>`
    SELECT id, name, rule_count, score, created_at FROM projects
    WHERE id = (SELECT id FROM projects WHERE name = ${project.name} ORDER BY created_at DESC, id DESC LIMIT 1)
      AND project = ${json}`;
  if (same) return version(same);
  const [row] = await sql<ProjectRow[]>`
    INSERT INTO projects (name, rule_count, score, project)
    VALUES (${project.name}, ${project.rules.length}, ${score}, ${json})
    RETURNING id, name, rule_count, score, created_at`;
  return version(row);
}

/** Dernière version de chaque projet (par nom), la plus récente en premier. */
export async function listProjects(sql: Sql): Promise<ProjectSummary[]> {
  const rows = await sql<(ProjectRow & { versions: number })[]>`
    SELECT * FROM (
      SELECT DISTINCT ON (name) id, name, rule_count, score, created_at,
        count(*) OVER (PARTITION BY name)::int AS versions
      FROM projects
      ORDER BY name, created_at DESC, id DESC
    ) latest
    ORDER BY created_at DESC`;
  return rows.map((r) => ({ last: version(r), versions: r.versions }));
}

export async function getProject(sql: Sql, id: number): Promise<ProjectRecord | null> {
  const [row] = await sql<(ProjectRow & { project: Project })[]>`
    SELECT id, name, rule_count, score, created_at, project FROM projects WHERE id = ${id}`;
  return row ? { ...version(row), project: row.project } : null;
}

/** Supprime toutes les versions d'un projet ; renvoie le nombre de versions supprimées. */
export async function deleteProject(sql: Sql, name: string): Promise<number> {
  const result = await sql`DELETE FROM projects WHERE name = ${name}`;
  return result.count;
}
