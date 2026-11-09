import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { analyzeRepo } from './lib/core/analyze';
import { newRule, TEMPLATES } from './lib/core/presets';
import type { Kind } from './lib/core/types';
import Analysis from './lib/components/Analysis.svelte';
import AnalysisReport from './lib/components/AnalysisReport.svelte';
import DraftModal from './lib/components/DraftModal.svelte';
import FileEditor from './lib/components/FileEditor.svelte';
import Generator from './lib/components/Generator.svelte';
import Home from './lib/components/Home.svelte';
import Practices from './lib/components/Practices.svelte';
import Proposals from './lib/components/Proposals.svelte';
import Reference from './lib/components/Reference.svelte';
import RepoFiles from './lib/components/RepoFiles.svelte';
import RuleForm from './lib/components/RuleForm.svelte';
import Settings from './lib/components/Settings.svelte';
import { i18n } from './lib/i18n.svelte';
import { store } from './lib/state.svelte';

/**
 * Audit des traductions : chaque écran est rendu en anglais et ne doit contenir aucun texte français
 * (texte visible, title, aria-label, placeholder). Le contenu des fichiers générés (<pre>) est exclu : il reste en français.
 */
const FRENCH = /[àâçéèêëîïôûùüÿœæ«»]|\b(?:les|des|une|pour|avec|dans|sans|aucun|aucune|règle|fichier|projet|dépôt)\b/i;

/** Textes visibles d'un rendu SSR : nœuds texte et attributs lus par l'utilisateur. */
function visibleTexts(html: string): string[] {
  const body = html.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  const texts = [...body.matchAll(/>([^<]+)</g)].map((m) => m[1]);
  const attributes = [...body.matchAll(/\s(?:title|aria-label|placeholder|alt)="([^"]*)"/g)].map((m) => m[1]);
  return [...texts, ...attributes].map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function frenchIn(html: string): string[] {
  // Entre “ ” : contenu de l'utilisateur cité (nom de règle, chemin, phrase de son fichier), pas une traduction.
  const unquoted = (s: string) => s.replace(/“[^”]*”/g, '');
  return [...new Set(visibleTexts(html).filter((s) => FRENCH.test(unquoted(s))))];
}

const KINDS: Kind[] = ['rule', 'command', 'skill', 'agent', 'hook'];

/** Dépôts de démonstration : vide, AGENTS.md seul, et un monorepo riche en défauts, pour couvrir les variantes de l'analyse. */
const REPOS: Record<string, Record<string, string>> = {
  empty: {},
  agents: { 'AGENTS.md': '# Projet\n\n- Code propre\n', 'CLAUDE.local.md': 'perso' },
  monorepo: {
    'CLAUDE.md': [
      '# Demo',
      '@docs/missing.md',
      '## Architecture',
      '- `pnpm install` puis `pnpm test`, `pnpm lint`',
      '- Suivre `src/a.ts`',
      '- Ne jamais utiliser any',
      '- Toujours écrire du code de qualité',
      '- password = hunter2hunter2',
    ].join('\n'),
    'src/a.ts': '',
    'src/a.test.ts': '',
    'pnpm-workspace.yaml': 'packages:\n  - apps/*\n',
    'apps/web/package.json': '{}',
    'apps/api/package.json': '{}',
    'apps/api/CLAUDE.md': '# API',
    'apps/api/AGENTS.md': '# API',
    '.claude/rules/api.md': '---\npaths: apps/api/**\n---\n- x',
    '.claude/settings.json': '{ invalid',
    '.claude/skills/release/SKILL.md': '---\ndescription: court\n---\nFaire la release.',
    '.claude/commands/review.md': 'Relire',
    'CLAUDE.local.md': 'perso',
    '.gitignore': 'node_modules',
  },
};
const analysis = (name: string) => {
  const contents = REPOS[name];
  const result = analyzeRepo({ paths: Object.keys(contents), contents });
  const record = {
    id: 1,
    path: `/tmp/${name}`,
    name,
    fileCount: 3,
    score: result.score,
    grade: result.grade,
    createdAt: '2026-11-08T10:00:00Z',
    result,
  };
  return { result, record };
};

/** Écrans à vérifier : nom → rendu HTML en anglais. */
const SCREENS: Record<string, () => string> = {
  home: () => render(Home).body,
  practices: () => render(Practices).body,
  reference: () => render(Reference).body,
  settings: () => render(Settings).body,
  'generator/start': () => render(Generator, { props: { view: 'start' } }).body,
  'generator/project': () => render(Generator, { props: { view: 'project', goal: 'new' } }).body,
  'generator/guide': () => render(Generator, { props: { view: 'guide', goal: 'add' } }).body,
  'generator/rules': () => render(Generator, { props: { view: 'rules', goal: 'new' } }).body,
  'generator/export': () => render(Generator, { props: { view: 'export', goal: 'new' } }).body,
  'generator/history': () => render(Generator, { props: { view: 'history', goal: 'resume' } }).body,
  ...Object.fromEntries(
    KINDS.map((kind) => [
      `rule-form/${kind}`,
      () => {
        // Règle vide : fait aussi apparaître les contrôles qualité sous le formulaire.
        const rule = newRule({ kind, scope: 'path' });
        const issues = store.quality.issues.filter((i) => i.ruleId === rule.id);
        return render(RuleForm as Component<Record<string, unknown>>, {
          props: { rule, files: store.files, issues, onremove: () => {} },
        }).body;
      },
    ]),
  ),
  analyze: () => render(Analysis).body,
  ...Object.fromEntries(
    Object.keys(REPOS).flatMap((name) => [
      [`analyze/report/${name}`, () => render(AnalysisReport, { props: { record: analysis(name).record } }).body],
      [
        `analyze/proposals/${name}`,
        () =>
          render(Proposals, {
            props: { root: '/tmp', result: analysis(name).result, sent: [], onadd: () => {}, onsaved: () => {} },
          }).body,
      ],
    ]),
  ),
  'analyze/files': () => render(RepoFiles, { props: { path: '/tmp/demo', name: 'demo' } }).body,
  'analyze/draft': () => {
    const criterion = analysis('empty').result.criteria.find((c) => c.id === 'root-memory')!;
    return render(DraftModal, {
      props: {
        criterion,
        template: TEMPLATES[0],
        root: '/tmp',
        existing: [],
        onadd: () => {},
        onsaved: () => {},
        onclose: () => {},
      },
    }).body;
  },
  'analyze/editor': () =>
    render(FileEditor, {
      props: {
        root: '/tmp',
        path: 'CLAUDE.md',
        content: '- Code propre\n- Ne jamais utiliser any',
        onsaved: () => {},
        onclose: () => {},
      },
    }).body,
};

/**
 * Écrans pas encore traduits. Le test échoue si l'un d'eux devient propre : le retirer de la liste.
 */
const TODO = new Set<string>();

describe('traductions (rendu anglais)', () => {
  let saved: typeof i18n.lang;
  beforeAll(() => {
    saved = i18n.lang;
    i18n.lang = 'en';
    // Une règle vide de chaque type : l'aperçu, la liste des règles et les contrôles ont du contenu à afficher.
    store.project.rules.push(...KINDS.map((kind) => newRule({ kind, title: `Sample ${kind}` })));
  });
  afterAll(() => {
    store.project.rules = [];
    i18n.lang = saved;
  });

  for (const [name, html] of Object.entries(SCREENS)) {
    if (TODO.has(name)) {
      it(`${name} : encore à traduire`, () => {
        expect(frenchIn(html()), `${name} n'a plus de français : le retirer de TODO`).not.toEqual([]);
      });
    } else {
      it(`${name} : aucun texte français`, () => {
        expect(frenchIn(html())).toEqual([]);
      });
    }
  }
});
