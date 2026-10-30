import { error, json, type RequestHandler } from '@sveltejs/kit';
import { allowedRoots, listDirs } from '#lib/server/repo.ts';

/** Sous-dossiers d'un dossier du serveur (sélecteur « Ajouter projet »). */
export const GET: RequestHandler = ({ url }) => {
  try {
    return json(listDirs(url.searchParams.get('path'), allowedRoots()));
  } catch (e) {
    error(400, (e as Error).message);
  }
};
