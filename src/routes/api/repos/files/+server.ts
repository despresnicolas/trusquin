import { error, json, type RequestHandler } from '@sveltejs/kit';
import { claudeFiles } from '#lib/core/analyze.ts';
import { allowedRoots, resolveRepoPath, snapshot } from '#lib/server/repo.ts';

/** Fichiers Claude Code actuels d'un dépôt, lus sur le disque (pas dans l'historique). */
export const GET: RequestHandler = ({ url }) => {
  const path = url.searchParams.get('path');
  if (!path) error(400, 'Paramètre « path » attendu');
  let root: string;
  try {
    root = resolveRepoPath(path, allowedRoots());
  } catch (e) {
    error(400, (e as Error).message);
  }
  return json(claudeFiles(snapshot(root)));
};
