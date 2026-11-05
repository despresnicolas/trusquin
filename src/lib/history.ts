import type { ClaudeFile, Project, RepoAnalysis } from './core/types';

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

export interface RepoSummary {
  last: AnalysisRun;
  runs: number;
  previousScore: number | null;
}

/** Une version enregistrée d'un projet du générateur, sans son contenu. */
export interface ProjectVersion {
  id: number;
  name: string;
  ruleCount: number;
  score: number;
  createdAt: string;
}

export interface ProjectRecord extends ProjectVersion {
  project: Project;
}

export interface ProjectSummary {
  last: ProjectVersion;
  versions: number;
}

/** Contenu d'un dossier du serveur, pour le sélecteur de dépôt. */
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
  repos: () => call<RepoSummary[]>('/api/repos'),
  runs: (path: string) => call<AnalysisRun[]>(`/api/analyses?${q(path)}`),
  files: (path: string) => call<ClaudeFile[]>(`/api/repos/files?${q(path)}`),
  dirs: (path?: string) => call<DirListing>(`/api/dirs${path ? `?${q(path)}` : ''}`),
  get: (id: number) => call<AnalysisRecord>(`/api/analyses/${id}`),
  analyze: (path: string) =>
    call<AnalysisRecord>('/api/analyses', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path }),
    }),
  // Sans content-type, SvelteKit traite le DELETE comme un formulaire et le bloque (CSRF) en production.
  forget: (path: string) =>
    call<{ deleted: number }>(`/api/repos?${q(path)}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
    }),
  projects: () => call<ProjectSummary[]>('/api/projects'),
  project: (id: number) => call<ProjectRecord>(`/api/projects/${id}`),
  saveProject: (project: Project) =>
    call<ProjectVersion>('/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project }),
    }),
  forgetProject: (name: string) =>
    call<{ deleted: number }>(`/api/projects?name=${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
    }),
};
