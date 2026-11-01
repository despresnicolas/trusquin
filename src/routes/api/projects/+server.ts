import { error, json, type RequestHandler } from '@sveltejs/kit';
import { checkProject } from '#lib/core/quality.ts';
import type { Project } from '#lib/core/types.ts';
import { deleteProject, listProjects, saveProject } from '#lib/server/db.ts';
import { db } from '#lib/server/store.ts';

export const GET: RequestHandler = async () => json(await listProjects(await db()));

/** Enregistre une version du projet du générateur (ignorée si identique à la dernière). Refusé s'il a des erreurs bloquantes. */
export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const project = body?.project;
  if (typeof project?.name !== 'string' || !project.name.trim() || !Array.isArray(project.rules))
    error(400, 'Champ « project » attendu (avec name et rules)');
  // Score recalculé ici : le client ne décide ni de la note ni de ce qui bloque.
  let report;
  try {
    report = checkProject(project as Project);
  } catch {
    error(400, 'Projet illisible');
  }
  const blocking = report.issues.filter((i) => i.severity === 'error');
  if (blocking.length)
    error(422, `${blocking.length} erreur(s) bloquante(s), projet non enregistré : ${blocking[0].message}`);
  return json(await saveProject(await db(), project, report.score));
};

export const DELETE: RequestHandler = async ({ url }) => {
  const name = url.searchParams.get('name');
  if (!name) error(400, 'Paramètre « name » attendu');
  return json({ deleted: await deleteProject(await db(), name) });
};
