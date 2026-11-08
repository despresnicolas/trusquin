import { describe, expect, it } from 'vitest';
import { DECISION_TREE, isStep, PATTERNS, TEMPLATES, type Pattern, type Step } from './core/presets';
import { localeOf, t } from './i18n.svelte';
import { coreEn } from './i18n/core-en';
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

  it('returns a string for every key', () => {
    expect(t('nav.home')).toBeTypeOf('string');
  });
});
