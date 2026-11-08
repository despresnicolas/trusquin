import { coreEn } from './i18n/core-en';
import { en } from './i18n/en';
import { fr, type Key } from './i18n/fr';

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
  return DICTS[i18n.locale][key].replace(/\{(\w+)\}/g, (m, name: string) => String(params[name] ?? m));
}

/** Texte venant de core (guide, modèles), écrit en français : traduit via i18n/core-en.ts, inchangé sinon. */
export function tc(text: string): string {
  return i18n.locale === 'en' ? (coreEn[text] ?? text) : text;
}
