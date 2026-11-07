/** Textes de l'interface, langue de référence : en.ts doit avoir les mêmes clés. */
export const fr = {
  // Navigation (+layout.svelte)
  'nav.label': 'Navigation',
  'nav.home': 'Accueil',
  'nav.homeHint': 'Choisir quoi faire',
  'nav.analyze': 'Analyser un dépôt',
  'nav.analyzeHint': 'Note et propositions',
  'nav.generator': 'Générateur',
  'nav.generatorHint': 'Écrire les fichiers',
  'nav.practices': 'Bonnes pratiques',
  'nav.practicesHint': 'Règles et fichiers',
  'nav.reference': 'Référentiel',
  'nav.referenceHint': 'Règles appliquées',
  'nav.errors': 'erreurs à corriger',

  // Réglages (Settings.svelte)
  'settings.title': 'Réglages',
  'settings.close': 'Fermer',
  'settings.categories': 'Catégories',
  'settings.appearance': 'Apparence',
  'settings.language': 'Langue',
  'settings.theme': 'Thème',
  'settings.light': 'Clair',
  'settings.dark': 'Sombre',
  'settings.system': 'Système',
  'settings.uiLanguage': "Langue de l'interface",
  'settings.languageHint': '« Système » suit la langue de macOS, et passe en anglais si ce n’est pas le français.',
  'settings.cancel': 'Annuler',
  'settings.save': 'Enregistrer',
};

export type Key = keyof typeof fr;
