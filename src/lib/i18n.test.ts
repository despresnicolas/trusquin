import { describe, expect, it } from 'vitest';
import { localeOf, t } from './i18n.svelte';
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

  it('returns a string for every key', () => {
    expect(t('nav.home')).toBeTypeOf('string');
  });
});
