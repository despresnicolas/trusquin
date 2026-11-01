#!/usr/bin/env -S pnpm exec tsx
/**
 * sauron CLI : mêmes règles que l'interface, sur des dossiers locaux.
 *
 *   analyze  <dossier>              (enregistré en base si DATABASE_URL est défini)
 */
import { basename, resolve } from 'node:path';
import { analyzeRepo } from '../src/lib/core/analyze.ts';
import type { Issue } from '../src/lib/core/types.ts';
import { connect, databaseUrl, migrate, saveAnalysis } from '../src/lib/server/db.ts';
import { resolveRepoPath, snapshot } from '../src/lib/server/repo.ts';

const [command, ...rest] = process.argv.slice(2);
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

function usage(): never {
  console.log(`Usage :
  sauron analyze <dossier>`);
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
} else {
  usage();
}
