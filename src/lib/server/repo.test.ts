import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { allowedRoots, listDirs, resolveRepoPath, snapshot } from './repo.ts';

const root = realpathSync(mkdtempSync(join(tmpdir(), 'sauron-')));
const repo = join(root, 'mon-repo');
mkdirSync(join(repo, 'node_modules/x'), { recursive: true });
mkdirSync(join(repo, 'src'));
writeFileSync(join(repo, 'CLAUDE.md'), '# Projet');
writeFileSync(join(repo, 'src/index.ts'), '');
writeFileSync(join(repo, 'node_modules/x/index.js'), '');
writeFileSync(join(root, 'fichier.txt'), '');
mkdirSync(join(repo, '.git'));
mkdirSync(join(root, '.cache'));

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('snapshot', () => {
  it('liste les fichiers hors dossiers ignorés et lit les fichiers mémoire', () => {
    const snap = snapshot(repo);
    expect(snap.paths).toEqual(['CLAUDE.md', 'src/index.ts']);
    expect(snap.contents['CLAUDE.md']).toBe('# Projet');
  });
});

describe('resolveRepoPath', () => {
  it('accepte un dossier absolu existant', () => {
    expect(resolveRepoPath(`  ${repo}/  `)).toBe(repo);
  });

  it('refuse un chemin relatif, absent ou qui n’est pas un dossier', () => {
    expect(() => resolveRepoPath('mon-repo')).toThrow('Chemin absolu attendu');
    expect(() => resolveRepoPath(join(root, 'absent'))).toThrow('Dossier introuvable');
    expect(() => resolveRepoPath(join(root, 'fichier.txt'))).toThrow("Ce n'est pas un dossier");
  });

  it('limite aux racines autorisées', () => {
    expect(resolveRepoPath(repo, [root])).toBe(repo);
    expect(resolveRepoPath(repo, [repo])).toBe(repo);
    expect(() => resolveRepoPath(root, [repo])).toThrow('hors des racines autorisées');
    expect(() => resolveRepoPath(`${repo}/../`, [repo])).toThrow('hors des racines autorisées');
  });

  it('lit SAURON_ROOTS séparé par « : »', () => {
    expect(allowedRoots('/a:/b')).toEqual(['/a', '/b']);
    expect(allowedRoots(undefined)).toEqual([]);
  });
});

describe('listDirs', () => {
  it('liste les sous-dossiers visibles, repère les repos git', () => {
    const listing = listDirs(root);
    expect(listing.path).toBe(root);
    expect(listing.dirs).toEqual([{ name: 'mon-repo', path: repo, isRepo: true }]);
    expect(listDirs(repo).dirs.map((d) => d.name)).toEqual(['src']);
  });

  it('part de la première racine et ne remonte pas au-dessus', () => {
    const listing = listDirs(null, [root]);
    expect(listing.path).toBe(root);
    expect(listing.parent).toBeNull();
    expect(listDirs(repo, [root]).parent).toBe(root);
    expect(() => listDirs(root, [repo])).toThrow('hors des racines autorisées');
  });
});
