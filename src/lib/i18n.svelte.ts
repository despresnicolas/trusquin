import type { Criterion, Issue } from './core/types';
import { coreEn, explanationsEn } from './i18n/core-en';
import { criteriaEn } from './i18n/criteria-en';
import { en } from './i18n/en';
import { fr, type Key } from './i18n/fr';
import { issuesEn, secretKindsEn } from './i18n/issues-en';

export type { Key };
export type Lang = 'system' | 'fr' | 'en';
export type Locale = Exclude<Lang, 'system'>;

export const LANG_KEY = 'trusquin:lang';
const DICTS: Record<Locale, Record<Key, string>> = { fr, en };

/** « Système » suit la première langue de macOS ; toute langue autre que le français retombe sur l'anglais. */
export function localeOf(lang: Lang, system: string | undefined): Locale {
  if (lang !== 'system') return lang;
  return system?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

function saved(): Lang {
  try {
    const value = localStorage.getItem(LANG_KEY);
    if (value === 'fr' || value === 'en') return value;
  } catch {
    // stockage indisponible : on suit le système
  }
  return 'system';
}

/** Langue de l'interface : le choix des réglages (Settings.svelte), sinon celle du système. */
class I18n {
  lang = $state<Lang>(saved());
  locale = $derived(localeOf(this.lang, globalThis.navigator?.language));
}

export const i18n = new I18n();

/** Texte traduit ; `{nom}` est remplacé par `params.nom`. Réactif : lit `i18n.locale`. */
export function t(key: Key, params: Record<string, string | number> = {}): string {
  return fill(DICTS[i18n.locale][key], params);
}

function fill(text: string, params: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, name: string) => String(params[name] ?? m));
}

/** Texte venant de core (guide, modèles), écrit en français : traduit via i18n/core-en.ts, inchangé sinon. */
export function tc(text: string): string {
  return i18n.locale === 'en' ? (coreEn[text] ?? text) : text;
}

/** Message et correction d'un contrôle qualité dans la langue de l'interface ; repli sur le français de core. */
export function issueText(issue: Issue): { message: string; fix: string } {
  const en = issuesEn[issue.code];
  if (i18n.locale !== 'en' || !en) return issue;
  const params = { ...issue.params };
  if (typeof params.kind === 'string') params.kind = secretKindsEn[params.kind] ?? params.kind;
  return { message: fill(en.message, params), fix: fill(en.fix, params) };
}

/** Libellé d'un critère de notation dans la langue de l'interface ; repli sur le français de core. */
export function criterionLabel(criterion: Criterion): string {
  return i18n.locale === 'en' ? (criteriaEn[criterion.id] ?? criterion.label) : criterion.label;
}

/** Explication d'un fichier généré (core/placement.ts) dans la langue de l'interface. */
export function fileExplanation(text: string): string {
  if (i18n.locale !== 'en') return text;
  for (const [pattern, english] of explanationsEn) if (pattern.test(text)) return text.replace(pattern, english);
  return coreEn[text] ?? text;
}
