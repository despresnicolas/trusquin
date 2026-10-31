import { error, json, type RequestHandler } from '@sveltejs/kit';
import { getProject } from '#lib/server/db.ts';
import { db } from '#lib/server/store.ts';

export const GET: RequestHandler = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) error(400, 'Identifiant invalide');
  const record = await getProject(await db(), id);
  if (!record) error(404, `Projet ${id} introuvable`);
  return json(record);
};
