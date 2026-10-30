#!/usr/bin/env -S pnpm exec tsx
/**
 * sauron CLI : mêmes règles que l'interface, sur des dossiers locaux.
 *
 *   analyze  <dossier>              (enregistré en base si DATABASE_URL est défini)
 *   check    <sauron.json>
 *   generate <sauron.json> <dossier> [--dry-run] [--force]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { analyzeRepo } from '../src/lib/core/analyze.ts';
import { USER_PREFIX, generate } from '../src/lib/core/placement.ts';
import { checkProject } from '../src/lib/core/quality.ts';
import type { Issue, Project } from '../src/lib/core/types.ts';
import { connect, databaseUrl, migrate, saveAnalysis } from '../src/lib/server/db.ts';
import { resolveRepoPath, snapshot } from '../src/lib/server/repo.ts';

const [command, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((a) => a.startsWith('--')));
const positional = rest.filter((a) => !a.startsWith('--'));

const color = (code: number) => (s: string) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = color(31);
const yellow = color(33);
const green = color(32);
const dim = color(2);

function printIssues(issues: Issue[]) {
  for (const i of issues) {
    const tag = i.severity === 'error' ? red('error  ') : i.severity === 'warning' ? yellow('warning') : dim('info   ');
    console.log(`${tag} ${i.file ? `${i.file}: ` : ''}${i.message}`);
    console.log(dim(`        → ${i.fix}`));
  }
}

function loadProject(path: string): Project {
  return JSON.parse(readFileSync(path, 'utf8')) as Project;
}

function usage(): never {
  console.log(`Usage :
  sauron analyze  <dossier>
  sauron check    <sauron.json>
  sauron generate <sauron.json> <dossier> [--dry-run] [--force]`);
  process.exit(1);
}

if (command === 'analyze') {
  const root = resolveRepoPath(resolve(positional[0] ?? '.'));
  const repo = snapshot(root);
  const result = analyzeRepo(repo);
  console.log(`\n${root}\nScore : ${result.score}/100 (${result.grade})\n`);
  for (const c of result.criteria) {
    const mark =
      c.status === 'pass'
        ? green('✓')
        : c.status === 'partial'
          ? yellow('◐')
          : c.status === 'fail'
            ? red('✗')
            : dim('–');
    console.log(`${mark} ${c.label.padEnd(50)} ${c.status === 'na' ? dim('n/a') : `${c.points}/${c.max}`}`);
    if (c.fix) console.log(dim(`    → ${c.fix}`));
  }
  if (result.memoryIssues.length) {
    console.log('\nFichiers mémoire :');
    printIssues(result.memoryIssues);
  }
  const url = databaseUrl();
  if (url) {
    const sql = connect(url);
    try {
      await migrate(sql);
      const saved = await saveAnalysis(sql, { path: root, name: basename(root), fileCount: repo.paths.length, result });
      console.log(dim(`\nEnregistré dans l'historique (analyse #${saved.id})`));
    } finally {
      await sql.end();
    }
  }
} else if (command === 'check') {
  if (!positional[0]) usage();
  const report = checkProject(loadProject(positional[0]));
  printIssues(report.issues);
  console.log(
    `\nScore qualité : ${report.score}/100 · ${report.alwaysLoadedInstructions} instructions toujours chargées`,
  );
  process.exit(report.issues.some((i) => i.severity === 'error') ? 1 : 0);
} else if (command === 'generate') {
  if (!positional[0] || !positional[1]) usage();
  const project = loadProject(positional[0]);
  const root = resolve(positional[1]);
  const files = generate(project);
  const report = checkProject(project, files);
  if (report.issues.some((i) => i.severity === 'error') && !flags.has('--force')) {
    printIssues(report.issues.filter((i) => i.severity === 'error'));
    console.log(red('\nErreurs qualité : génération annulée (--force pour passer outre).'));
    process.exit(1);
  }
  for (const file of files) {
    if (file.path.startsWith(USER_PREFIX)) {
      console.log(dim(`skip  ${file.path} (fichier utilisateur, à fusionner à la main)`));
      continue;
    }
    const target = join(root, file.path);
    const exists = existsSync(target);
    if (exists && readFileSync(target, 'utf8') === file.content) {
      console.log(dim(`same  ${file.path}`));
      continue;
    }
    if (exists && !flags.has('--force')) {
      console.log(yellow(`keep  ${file.path} (existe déjà, --force pour écraser)`));
      continue;
    }
    console.log(`${exists ? 'write' : 'new  '} ${file.path}`);
    if (!flags.has('--dry-run')) {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, file.content);
    }
  }
  console.log(`\nScore qualité : ${report.score}/100${flags.has('--dry-run') ? ' (dry-run, rien écrit)' : ''}`);
} else {
  usage();
}
