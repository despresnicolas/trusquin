import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, isAbsolute, join, relative, sep } from 'node:path';
import { isIgnored, needsContent } from '../core/analyze.ts';
import type { DirListing } from '../history.ts';
import type { RepoSnapshot } from '../core/types.ts';

const MAX_SIZE = 256 * 1024;

/** Lit un dossier local : chemins relatifs + contenu des fichiers utiles à l'analyse. */
export function snapshot(root: string): RepoSnapshot {
  const paths: string[] = [];
  const contents: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      const rel = relative(root, abs).split('\\').join('/');
      if (isIgnored(rel)) continue;
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile()) {
        paths.push(rel);
        if (needsContent(rel) && statSync(abs).size <= MAX_SIZE) contents[rel] = readFileSync(abs, 'utf8');
      }
    }
  };
  walk(root);
  return { paths: paths.sort(), contents };
}

/** Dossiers autorisés pour l'analyse via l'API (`SAURON_ROOTS`, séparés par `:`). Vide : tout est permis. */
export function allowedRoots(env = process.env.SAURON_ROOTS): string[] {
  return (env ?? '').split(delimiter).filter(Boolean);
}

/**
 * Valide un chemin saisi par l'utilisateur et renvoie sa forme canonique.
 * Lève une erreur au message affichable si le chemin est invalide ou hors des racines autorisées.
 */
export function resolveRepoPath(input: string, roots: string[] = []): string {
  const raw = input.trim().replace(/^~(?=$|\/)/, homedir());
  if (!isAbsolute(raw)) throw new Error(`Chemin absolu attendu : « ${input} »`);
  let path: string;
  try {
    path = realpathSync(raw);
  } catch {
    throw new Error(`Dossier introuvable : ${raw}`);
  }
  if (!statSync(path).isDirectory()) throw new Error(`Ce n'est pas un dossier : ${path}`);
  const inside = (root: string) => {
    const rel = relative(realpathSync(root), path);
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel) && !rel.startsWith(sep));
  };
  if (roots.length && !roots.some((r) => inside(r)))
    throw new Error(`Dossier hors des racines autorisées (${roots.join(', ')}) : ${path}`);
  return path;
}

/**
 * Sous-dossiers d'un dossier du serveur, pour choisir un dépôt à analyser.
 * Sans chemin : première racine autorisée, sinon le dossier personnel.
 * Les dossiers cachés et ignorés par l'analyse ne sont pas listés.
 */
export function listDirs(input: string | null, roots: string[] = []): DirListing {
  const path = resolveRepoPath(input?.trim() || roots[0] || homedir(), roots);
  const dirs = readdirSync(path, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !isIgnored(e.name))
    .map((e) => ({ name: e.name, path: join(path, e.name), isRepo: existsSync(join(path, e.name, '.git')) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  let parent: string | null = dirname(path);
  try {
    parent = parent === path ? null : resolveRepoPath(parent, roots);
  } catch {
    parent = null;
  }
  return { path, parent, isRepo: existsSync(join(path, '.git')), dirs };
}
