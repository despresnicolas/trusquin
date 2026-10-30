import type { RepoAnalysis, Rule } from './core/types';

/** Une analyse enregistrée, sans le détail des critères. */
export interface AnalysisRun {
  id: number;
  path: string;
  name: string;
  fileCount: number;
  score: number;
  grade: RepoAnalysis['grade'];
  createdAt: string;
}

export interface AnalysisRecord extends AnalysisRun {
  result: RepoAnalysis;
}

/** Réponse d'une nouvelle analyse : les règles importables ne sont pas stockées. */
export interface FreshAnalysis extends AnalysisRecord {
  rules: Rule[];
  context: { description: string; stack: string };
}

export interface ProjectSummary {
  last: AnalysisRun;
  runs: number;
  previousScore: number | null;
}

/** Contenu d'un dossier du serveur, pour le sélecteur de projet. */
export interface DirListing {
  path: string;
  /** Null à la racine du disque ou d'une racine autorisée. */
  parent: string | null;
  isRepo: boolean;
  dirs: { name: string; path: string; isRepo: boolean }[];
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message ?? `Erreur ${res.status}`);
  return body as T;
}

const q = (path: string) => `path=${encodeURIComponent(path)}`;

export const api = {
  projects: () => call<ProjectSummary[]>('/api/projects'),
  runs: (path: string) => call<AnalysisRun[]>(`/api/analyses?${q(path)}`),
  dirs: (path?: string) => call<DirListing>(`/api/dirs${path ? `?${q(path)}` : ''}`),
  get: (id: number) => call<AnalysisRecord>(`/api/analyses/${id}`),
  analyze: (path: string) =>
    call<FreshAnalysis>('/api/analyses', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path }),
    }),
  // Sans content-type, SvelteKit traite le DELETE comme un formulaire et le bloque (CSRF) en production.
  forget: (path: string) =>
    call<{ deleted: number }>(`/api/projects?${q(path)}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
    }),
};
