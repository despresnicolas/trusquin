import { error, json, type RequestHandler } from '@sveltejs/kit';
import { deleteProject, listProjects, saveProject } from '#lib/server/db.ts';
import { db } from '#lib/server/store.ts';

export const GET: RequestHandler = async () => json(await listProjects(await db()));

/** Enregistre une version du projet du générateur (ignorée si identique à la dernière). */
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const project = body?.project;
  if (typeof project?.name !== 'string' || !project.name.trim() || !Array.isArray(project.rules))
    error(400, 'Champ « project » attendu (avec name et rules)');
  if (!Number.isInteger(body.score)) error(400, 'Champ « score » attendu (entier)');
  return json(await saveProject(await db(), project, body.score));
};

export const DELETE: RequestHandler = async ({ url }) => {
  const name = url.searchParams.get('name');
  if (!name) error(400, 'Paramètre « name » attendu');
  return json({ deleted: await deleteProject(await db(), name) });
};
