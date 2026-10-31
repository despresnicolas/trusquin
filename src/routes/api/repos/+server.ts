import { error, json, type RequestHandler } from '@sveltejs/kit';
import { deleteRepo, listRepos } from '#lib/server/db.ts';
import { db } from '#lib/server/store.ts';

export const GET: RequestHandler = async () => json(await listRepos(await db()));

export const DELETE: RequestHandler = async ({ url }) => {
  const path = url.searchParams.get('path');
  if (!path) error(400, 'Paramètre « path » attendu');
  return json({ deleted: await deleteRepo(await db(), path) });
};
