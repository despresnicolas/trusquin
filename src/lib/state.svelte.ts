import { generate } from './core/placement';
import { starterProject } from './core/presets';
import { checkProject } from './core/quality';
import type { Project } from './core/types';
import { api } from './history';

const KEY = 'sauron:project';
const LEGACY_KEYS = ['tars:project', 'claude-kit:project'];

function load(): Project {
  try {
    const saved = [KEY, ...LEGACY_KEYS].map((k) => localStorage.getItem(k)).find((v) => v !== null);
    if (saved) return { ...starterProject(), ...JSON.parse(saved) };
  } catch {
    // stockage indisponible : on repart du projet de départ
  }
  return starterProject();
}

/** État partagé par toutes les pages : le projet et ce qui en découle. */
class Kit {
  project = $state(load());
  files = $derived(generate(this.project));
  quality = $derived(checkProject(this.project, this.files));
}

export const store = new Kit();

export function persist(project: Project): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(project));
  } catch {
    // ignoré : la persistance locale est un confort
  }
}

/** Enregistre le projet en cours dans l'historique (PostgreSQL), avant de le remplacer. */
export const archive = () => api.saveProject($state.snapshot(store.project), store.quality.score);
