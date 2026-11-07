import { generate } from './core/placement';
import { starterProject } from './core/presets';
import { checkProject } from './core/quality';
import type { Project } from './core/types';
import { api } from './history';

const KEY = 'trusquin:project';
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
  /** Erreurs bloquantes : elles empêchent l'export sans confirmation et l'enregistrement. */
  errors = $derived(this.quality.issues.filter((i) => i.severity === 'error').length);
  /** Aucune règle active : projet pas encore commencé, pas en erreur aux yeux de l'utilisateur. */
  empty = $derived(!this.project.rules.some((r) => r.enabled));
  /** Incrémenté à chaque enregistrement dans l'historique, pour rafraîchir la liste. */
  saved = $state(0);
}

export const store = new Kit();

export function persist(project: Project): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(project));
  } catch {
    // ignoré : la persistance locale est un confort
  }
}

/** Enregistre le projet en cours dans l'historique (SQLite), avant de le remplacer. */
export async function archive() {
  const project = $state.snapshot(store.project);
  const version = await api.saveProject({ ...project, name: project.name.trim() || 'Sans nom' });
  store.saved++;
  return version;
}
