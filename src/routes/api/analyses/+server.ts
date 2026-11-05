import { basename } from 'node:path';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { analyzeRepo } from '#lib/core/analyze.ts';
import { listRuns, saveAnalysis } from '#lib/server/db.ts';
import { allowedRoots, resolveRepoPath, snapshot } from '#lib/server/repo.ts';
import { db } from '#lib/server/store.ts';

export const GET: RequestHandler = async ({ url }) => {
  const path = url.searchParams.get('path');
  if (!path) error(400, 'Paramètre « path » attendu');
  return json(await listRuns(await db(), path));
};

/** Analyse un dossier local du serveur et enregistre le résultat. */
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (typeof body?.path !== 'string' || !body.path.trim()) error(400, 'Champ « path » attendu');
  let root: string;
  try {
    root = resolveRepoPath(body.path, allowedRoots());
  } catch (e) {
    error(400, (e as Error).message);
  }
  const sql = await db();
  const repo = snapshot(root);
  const result = analyzeRepo(repo);
  return json(await saveAnalysis(sql, { path: root, name: basename(root), fileCount: repo.paths.length, result }));
};
