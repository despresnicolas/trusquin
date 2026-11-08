import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newRule } from './lib/core/presets';
import type { Kind } from './lib/core/types';
import Analysis from './lib/components/Analysis.svelte';
import Generator from './lib/components/Generator.svelte';
import Home from './lib/components/Home.svelte';
import Practices from './lib/components/Practices.svelte';
import Reference from './lib/components/Reference.svelte';
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
  return [...new Set(visibleTexts(html).filter((s) => FRENCH.test(s)))];
}

const KINDS: Kind[] = ['rule', 'command', 'skill', 'agent', 'hook'];

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
};

/**
 * Écrans pas encore traduits. Le test échoue si l'un d'eux devient propre : le retirer de la liste.
 */
const TODO = new Set(['analyze']);

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
