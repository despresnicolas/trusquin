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

  // Accueil (Home, HowItWorks, GoalChooser, GradeScale)
  'home.title': 'Bien configurer Claude Code',
  'home.lead':
    'Des règles courtes, vérifiables et placées au bon endroit : Claude les suit mieux et elles coûtent moins de contexte.',
  'home.goals': 'Que veux-tu faire ?',
  'home.how': 'Comment ça marche',
  'home.grading': 'La notation',
  'home.gradingText': "L'analyse donne une note sur 100, traduite en lettre de A à E. Objectif :",
  'home.gradingGoal': ', 85 et plus.',
  'loop.analyze': 'Analyser',
  'loop.analyzeText': 'Trusquin note le dépôt sur 100 et liste les propositions, triées par points gagnés.',
  'loop.fix': 'Corriger',
  'loop.fixText': 'Modifier ou créer les fichiers depuis les propositions, ou les écrire dans le générateur.',
  'loop.export': 'Exporter',
  'loop.exportText': 'Vérifier le contrôle qualité, exporter le zip et le décompresser à la racine du dépôt.',
  'loop.reanalyze': 'Ré-analyser',
  'loop.reanalyzeText': 'Committer CLAUDE.md et .claude/, puis ré-analyser pour voir la note monter.',
  'grade.label': 'Note {grade} sur une échelle de A à E',
  'grade.scale': 'Échelle de A à E',

  // Parcours (goals.ts)
  'goal.improve': 'Améliorer un dépôt existant',
  'goal.improveText': 'Noter le dépôt, puis corriger ou créer ses fichiers Claude depuis les propositions.',
  'goal.improveSteps': 'Analyser → Propositions → Ré-analyser',
  'goal.new': 'Créer la configuration d’un projet',
  'goal.newText': 'Partir de zéro : décrire le projet, choisir ses règles, exporter les fichiers.',
  'goal.add': 'Ajouter un élément au projet en cours',
  'goal.addText': 'Un hook, un skill, une commande, une règle… Le guide indique lequel convient.',
  'goal.resume': 'Reprendre un projet enregistré',
  'goal.resumeText': 'Rouvrir une version de l’historique, la compléter puis l’exporter.',
  'step.project': 'Décrire le projet',
  'step.guide': 'Choisir l’élément Claude Code',
  'step.rules': 'Écrire les règles',
  'step.export': 'Vérifier et exporter',
  'step.history': 'Choisir le projet',
};

export type Key = keyof typeof fr;
