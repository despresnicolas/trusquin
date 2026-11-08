import { describe, expect, it } from 'vitest';
import { analyzeRepo } from './core/analyze';
import { DECISION_TREE, isStep, PATTERNS, TEMPLATES, type Pattern, type Step } from './core/presets';
import { localeOf, t } from './i18n.svelte';
import { readFileSync } from 'node:fs';
import { coreEn } from './i18n/core-en';
import { criteriaEn } from './i18n/criteria-en';
import { issuesEn } from './i18n/issues-en';
import { en } from './i18n/en';
import { fr } from './i18n/fr';

describe('i18n', () => {
  it('follows the system language, falling back to English', () => {
    expect(localeOf('system', 'fr-FR')).toBe('fr');
    expect(localeOf('system', 'fr')).toBe('fr');
    expect(localeOf('system', 'en-US')).toBe('en');
    expect(localeOf('system', 'de-DE')).toBe('en');
    expect(localeOf('system', undefined)).toBe('en');
  });

  it('lets an explicit choice override the system', () => {
    expect(localeOf('fr', 'en-US')).toBe('fr');
    expect(localeOf('en', 'fr-FR')).toBe('en');
  });

  it('has the same keys in both dictionaries', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  it('translates every guide and template text shown from core', () => {
    const texts: string[] = [];
    const walk = (node: Step | Pattern) => {
      if (!isStep(node)) return;
      texts.push(node.question, ...(node.hint ? [node.hint] : []));
      for (const c of node.choices) {
        texts.push(c.label);
        walk(c.next);
      }
    };
    walk(DECISION_TREE);
    for (const p of PATTERNS) texts.push(p.question, p.answer);
    for (const tpl of TEMPLATES) texts.push(tpl.label, tpl.hint);
    expect(texts.filter((s) => !(s in coreEn))).toEqual([]);
  });

  it('translates every quality check code', () => {
    const source = readFileSync('src/lib/core/quality.ts', 'utf8');
    const codes = [...source.matchAll(/code: '([a-z-]+)'/g)].map((m) => m[1]);
    expect(codes.length).toBeGreaterThan(30);
    expect(codes.filter((c) => !(c in issuesEn))).toEqual([]);
  });

  it('translates every scoring criterion', () => {
    const ids = analyzeRepo({ paths: [], contents: {} }).criteria.map((c) => c.id);
    expect(ids.filter((id) => !(id in criteriaEn))).toEqual([]);
  });

  it('returns a string for every key', () => {
    expect(t('nav.home')).toBeTypeOf('string');
  });
});
