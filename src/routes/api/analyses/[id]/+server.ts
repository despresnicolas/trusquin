import { error, json, type RequestHandler } from '@sveltejs/kit';
import { getAnalysis } from '#lib/server/db.ts';
import { db } from '#lib/server/store.ts';

export const GET: RequestHandler = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) error(400, 'Identifiant invalide');
  const record = await getAnalysis(await db(), id);
  if (!record) error(404, `Analyse ${id} introuvable`);
  return json(record);
};
