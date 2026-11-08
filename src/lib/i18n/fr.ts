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

  // Générateur (Generator.svelte)
  'generator.chooseGoal': 'Choisis un objectif : Trusquin t’accompagne ensuite étape par étape.',

  // Commun
  'common.cancel': 'Annuler',
  'common.save': 'Enregistrer',
  'common.delete': 'Supprimer',
  'common.untitled': 'Sans titre',
  'common.unnamed': 'Sans nom',
  'hint.label': 'Aide : {text}',

  // Étapes du générateur (Generator.svelte)
  'gen.steps': 'Étapes : {goal}',
  'gen.changeGoal': '↺ Changer d’objectif',
  'gen.stepOf': 'Étape {n} sur {total} · {title}',
  'gen.reanalyze': 'Ré-analyser le dépôt →',
  'gen.projectWhy':
    'Ces informations ouvrent le CLAUDE.md : Claude les lit au début de chaque session pour comprendre le dépôt.',
  'gen.projectTodo1': 'Un nom, puis une phrase sur ce que fait le dépôt.',
  'gen.projectTodo2': 'La stack : langages, frameworks, gestionnaire de paquets.',
  'gen.projectTodo3': 'Facultatif : les commandes autorisées sans confirmation et les fichiers interdits (.env).',
  'gen.projectNoName': 'Il manque le nom du projet.',
  'gen.projectNoDescription': 'Ajoute une description : elle aide Claude à trancher les cas ambigus.',
  'gen.guideWhy':
    'Règle, hook, skill, sous-agent ou commande : chacun est chargé à un moment différent. Le bon choix évite d’alourdir le contexte.',
  'gen.guideTodo1': 'Réponds aux questions : le guide indique l’élément adapté et où il sera placé.',
  'gen.guideTodo2': '« Ajouter au projet » sur un modèle : il s’ouvre à l’étape suivante pour l’adapter.',
  'gen.guideTodo3': 'Tu sais déjà ce que tu veux ? Passe directement à l’étape suivante.',
  'gen.rulesWhy':
    'Chaque règle dit quoi faire et à quoi elle s’applique ; Trusquin en déduit le fichier et son emplacement.',
  'gen.rulesTodo1': 'Pour chaque règle : une consigne précise, vérifiable, formulée en positif.',
  'gen.rulesTodo2': 'Les pastilles rouges et orange signalent ce qui est à corriger.',
  'gen.rulesTodo3': 'Une autre règle à ajouter ? « Via le guide » ou « Règle vide ».',
  'gen.rulesNone': 'Aucune règle pour l’instant : ajoute au moins une règle.',
  'gen.exportWhy':
    'Le contrôle qualité repère ce qui ferait déraper Claude : secrets, consignes vagues, CLAUDE.md trop long.',
  'gen.exportTodo1': 'Corrige les erreurs bloquantes (un clic mène à la règle concernée).',
  'gen.exportTodo2': 'Relis chaque fichier dans l’aperçu.',
  'gen.exportTodo3':
    '« Exporter le zip » en haut, puis décompresse-le à la racine du dépôt et committe CLAUDE.md et .claude/.',
  'gen.exportErrors': '{n} erreur(s) bloquante(s) à corriger avant d’exporter.',
  'gen.historyWhy':
    'Chaque enregistrement crée une version : rouvrir l’une d’elles remplace le projet en cours, après l’avoir enregistré.',
  'gen.historyTodo1': 'Clique sur « Ouvrir » à côté du projet à reprendre : tu passes aux règles.',

  // Guide (Guide.svelte)
  'guide.intro':
    "Réponds à quelques questions : le guide indique l'élément Claude Code adapté, où il sera placé, et les modèles à ajouter au projet.",
  'guide.changeAnswer': 'Changer cette réponse',
  'guide.add': 'Ajouter au projet',
  'guide.setInProject': "Régler à l'étape « Décrire le projet »",
  'guide.noTemplate': "Pas de modèle : partir d'une règle vide.",
  'guide.restart': '↺ Recommencer',
  'guide.allCases': 'Tous les cas',
  'guide.situation': 'Situation',
  'guide.item': 'Élément',
  'guide.location': 'Emplacement',

  // Barre du projet (ProjectBar.svelte)
  'bar.imported': '{n} règle(s) importée(s).',
  'bar.noneFound': 'Aucune règle trouvée dans ces fichiers.',
  'bar.saved': "« {name} » enregistré dans l'historique.",
  'bar.notSaved': 'Non enregistré : {error}',
  'bar.resetFailed': "Projet non enregistré dans l'historique, rien n'est remplacé : {error}",
  'bar.toStart': 'à démarrer',
  'bar.new': 'Nouveau projet',
  'bar.newHint':
    "Repart d'un projet vide. Le projet en cours est enregistré dans l'historique, sauf s'il a des erreurs bloquantes.",
  'bar.import': 'Importer (.md, settings.json)',
  'bar.importHint':
    "CLAUDE.md / AGENTS.md : une règle par section ##. Un autre .md devient une règle .claude/rules/. settings.json : ses hooks. Les règles s'ajoutent au projet en cours.",
  'bar.saveBlocked': "{n} erreur(s) bloquante(s) à corriger avant d'enregistrer",
  'bar.saveHint':
    "Ajoute une version dans l'onglet Historique (en base). Rien n'est ajouté si rien n'a changé ; refusé tant qu'il reste des erreurs bloquantes.",
  'bar.noFiles': 'Aucun fichier à exporter',
  'bar.exportBlocked': 'Export possible une fois les points ci-dessous réglés',
  'bar.export': 'Exporter le zip',
  'bar.exportHint':
    'Fichiers prêts à décompresser à la racine du dépôt, plus un rapport de qualité. Disponible quand il ne reste aucune erreur bloquante.',
  'bar.resetEmpty': 'Le projet en cours est vide : rien à enregistrer.',
  'bar.resetLost': 'Le projet en cours a {n} erreur(s) bloquante(s) : il ne sera pas enregistré et sera perdu.',
  'bar.resetSaved': "Le projet en cours sera enregistré dans l'historique puis remplacé.",
  'bar.emptyTodo': 'Projet vide : ajoute une première règle pour pouvoir exporter.',
  'bar.emptyGuide': 'Choisir un élément avec le guide',
  'bar.emptyImport': 'ou importer un CLAUDE.md existant.',
  'bar.blockingOne': 'Pour exporter, il reste {n} point à régler :',
  'bar.blockingMany': 'Pour exporter, il reste {n} points à régler :',
  'bar.openRule': 'Ouvrir « {title} »',

  // Projet (ProjectForm.svelte)
  'form.name': 'Nom du projet',
  'form.nameHint':
    "Titre du CLAUDE.md et nom dans l'historique : deux projets du même nom partagent le même historique.",
  'form.description': 'Description (le quoi, en une phrase)',
  'form.descriptionHint':
    'Une phrase sur ce que fait le dépôt, en tête du CLAUDE.md. Aide Claude à trancher les cas ambigus.',
  'form.stack': 'Stack',
  'form.stackHint':
    'Langages, frameworks, base, gestionnaire de paquets. Évite que Claude propose npm dans un projet pnpm.',
  'form.agentsMd': 'Écrire dans AGENTS.md (multi-outils) + import dans CLAUDE.md',
  'form.agentsMdHint':
    "À cocher si l'équipe utilise aussi Codex, Cursor… : la mémoire va dans AGENTS.md, que CLAUDE.md importe.",
  'form.permissions': 'Permissions',
  'form.permissionsHint':
    "Autoriser évite les confirmations pour les commandes sûres (Bash(pnpm test:*)). Refuser protège les secrets (Read(./.env)). Un refus l'emporte toujours.",
  'form.allow': 'Autoriser (une par ligne)',
  'form.deny': 'Refuser (une par ligne)',

  // Historique (ProjectHistory.svelte)
  'history.askOpen': 'Le projet en cours a {n} erreur(s) bloquante(s) et ne sera pas enregistré. Ouvrir quand même ?',
  'history.askDelete': 'Supprimer toutes les versions de « {name} » ?',
  'history.empty': "Aucun projet enregistré. « Enregistrer » et « Nouveau projet » (en haut) l'ajoutent ici.",
  'history.rule': '{n} règle',
  'history.rules': '{n} règles',
  'history.version': '{n} version',
  'history.versions': '{n} versions',
  'history.open': 'Ouvrir',
  'history.openTitle': "Charge la dernière version. Le projet en cours est d'abord enregistré.",

  // Règles (RulesEditor.svelte, RuleForm.svelte)
  'rules.critical': 'critique',
  'rules.addEmpty': '+ Règle vide',
  'rules.viaGuide': '+ Via le guide',
  'rules.empty': "Ajoute une règle ou pars d'un modèle.",
  'rule.title': 'Titre',
  'rule.titleHint':
    "Sert de titre de section (## Titre) dans le fichier généré. Court et parlant : Claude s'en sert pour situer la règle.",
  'rule.titlePlaceholder': 'Ex. Endpoints API',
  'rule.type': 'Type',
  'rule.enabled': 'Actif',
  'rule.enabledHint':
    "Décoché : la règle reste dans le projet mais n'est pas exportée. Utile pour tester sans supprimer.",
  'rule.appliesTo': "S'applique à",
  'rule.category': 'Catégorie',
  'rule.categoryHint':
    'Regroupe les règles en sections, et nomme le fichier .claude/rules/<catégorie>.md pour la portée « Thème ».',
  'rule.critical': 'Critique',
  'rule.criticalHint':
    'Pour les consignes les plus souvent oubliées (tests avant de rendre la main, format des commits) : placée en tête du CLAUDE.md et rappelée à la fin, là où Claude y prête le plus attention. 3 au maximum.',
  'rule.globs': 'Globs (un par ligne)',
  'rule.globsHint':
    "Motifs de chemins relatifs à la racine : src/api/**/*.ts, **/*.test.ts. La règle n'est chargée que si Claude lit ou modifie un fichier qui correspond.",
  'rule.directory': 'Dossier',
  'rule.directoryHint': 'Chemin du sous-dossier (ex. apps/api) : la règle va dans apps/api/CLAUDE.md.',
  'rule.name': 'Nom (kebab-case)',
  'rule.nameHint': "Identifiant du fichier et de l'appel (/release, agent test-runner). Minuscules et tirets.",
  'rule.model': 'Modèle',
  'rule.modelDefault': 'par défaut',
  'rule.argumentPlaceholder': '[fichier]',
  'rule.description': "Description — quoi ET quand (c'est ce que Claude lit pour décider)",
  'rule.descriptionSkillHint':
    "Seule la description est lue tant que la skill ne sert pas. Dire ce qu'elle produit ET quand (« Use when… »), avec les mots qu'emploierait l'utilisateur même sans citer la skill. 1024 caractères max.",
  'rule.descriptionHint':
    "Ex. « Prépare une release : changelog, version, tag. Use when the user asks to release. » Sans le « quand », Claude ne saura pas l'utiliser au bon moment.",
  'rule.tools': 'Outils autorisés',
  'rule.toolsHint':
    "Limite ce que l'élément peut faire. Vide = outils par défaut. Restreindre (Read, Grep) rend un agent de revue plus sûr.",
  'rule.event': 'Événement',
  'rule.eventHint':
    'PostToolUse : après une action (formatter). PreToolUse : avant, peut bloquer (exit 2). Stop : quand Claude rend la main (lancer les tests).',
  'rule.matcher': 'Matcher (outils)',
  'rule.matcherHint': 'Outils concernés, séparés par | : Edit|Write pour les modifications de fichiers. Vide = tous.',
  'rule.command': "Commande (reçoit le JSON de l'événement sur stdin ; exit 2 = bloquer)",
  'rule.instructions': 'Instructions (une par ligne, concrètes et vérifiables)',
  'rule.content': 'Contenu (markdown)',
  'rule.instructionsHint':
    'Une instruction par ligne, vérifiable : « pnpm test avant de rendre la main » plutôt que « bien tester ». Éviter de recopier du code ou ce que le linter fait déjà.',
  'rule.skillBodyHint':
    'Principe en une ligne, erreurs fréquentes avec leur raison, étapes numérotées, vérification en dernier. Moins de 500 lignes : le détail va dans des fichiers de référence que Claude ouvre quand une étape le demande.',
  'rule.bodyHint': "Les étapes à suivre, en markdown. Rester concis : ce contenu est chargé quand l'élément sert.",
  'rule.destination': 'Destination',
  'rule.destinationHint':
    'Fichier où la règle sera écrite, déduit du type et de la portée. Survoler le chemin pour savoir quand il est chargé.',
  'rule.disabled': 'désactivé, non exporté',

  // Types, portées, chargement et catégories (ex-KIND_LABELS, SCOPE_LABELS, KIND_HINTS, SCOPE_HINTS, LOADING_LABELS)
  'kind.rule': 'Règle',
  'kind.command': 'Slash command',
  'kind.skill': 'Skill',
  'kind.agent': 'Sous-agent',
  'kind.hook': 'Hook',
  'kindHint.rule':
    'Une consigne que Claude doit connaître. Concrète et vérifiable (« lancer pnpm test avant de rendre la main »), pas un souhait vague.',
  'kindHint.command':
    'Un prompt réutilisable lancé à la main par /nom. Pour une tâche répétée que tu déclenches toi-même (revue, release).',
  'kindHint.skill':
    "Un savoir-faire chargé seulement quand la description correspond à la demande. Idéal pour une procédure longue rarement utile : ne coûte rien tant qu'elle ne sert pas.",
  'kindHint.agent':
    'Un sous-agent avec son propre contexte et ses outils. Pour une tâche isolable (tests, revue) dont seul le résumé compte.',
  'kindHint.hook':
    "Une commande exécutée automatiquement par Claude Code sur un événement. Pour ce qui doit arriver à coup sûr (format, lint, blocage d'un fichier) : ne dépend pas de la bonne volonté du modèle.",
  'scope.project': 'Projet (CLAUDE.md racine)',
  'scope.topic': 'Thème (.claude/rules/, toujours chargé)',
  'scope.path': 'Chemins (.claude/rules/ + paths)',
  'scope.directory': 'Dossier (<dossier>/CLAUDE.md)',
  'scope.local': 'Perso projet (CLAUDE.local.md)',
  'scope.user': 'Perso global (~/.claude/CLAUDE.md)',
  'scopeHint.project':
    'Chargé à chaque session. Réserver aux essentiels (commandes, architecture) : viser moins de 100 lignes au total.',
  'scopeHint.topic': 'Fichier séparé par thème, toujours chargé. Range la mémoire sans alléger le contexte.',
  'scopeHint.path':
    'Chargé seulement quand Claude touche des fichiers qui correspondent aux globs. Le meilleur choix pour une règle propre à une partie du code : elle ne coûte rien ailleurs.',
  'scopeHint.directory':
    'CLAUDE.md dans un sous-dossier, chargé quand Claude y travaille. Pratique en monorepo (apps/api, apps/web).',
  'scopeHint.local': 'Tes préférences pour ce dépôt, non versionnées (CLAUDE.local.md à mettre dans .gitignore).',
  'scopeHint.user': 'Tes préférences pour tous tes projets (~/.claude/CLAUDE.md). Rien de propre à ce dépôt.',
  'loading.always': 'Toujours chargé',
  'loading.on-path': 'Chargé selon les fichiers touchés',
  'loading.on-demand': 'À la demande',
  'loading.personal': 'Personnel, non versionné',
  'loading.deterministic': 'Exécuté par le harness',
  'category.overview': 'Vue d’ensemble',
  'category.commands': 'Commandes',
  'category.architecture': 'Architecture',
  'category.conventions': 'Conventions',
  'category.testing': 'Tests',
  'category.security': 'Sécurité',
  'category.git': 'Git & workflow',
  'category.domain': 'Glossaire métier',
  'category.workflow': 'Méthode de travail',
  'category.other': 'Divers',

  // Aperçu (Preview.svelte)
  'preview.files': 'fichiers',
  'preview.alwaysLoaded': 'instructions toujours chargées',
  'preview.errors': '{n} erreur(s) bloquante(s)',
  'preview.hintZip': '« Exporter le zip » (en haut) : décompresser à la racine du repo. Le zip contient aussi',
  'preview.hintReport': '(rapport, à ne pas committer). Les fichiers',
  'preview.hintHome': 'sont rangés dans',
  'preview.lines': '{n} lignes',
  'preview.instructions': '{n} instructions',
  'preview.copy': 'Copier',
};

export type Key = keyof typeof fr;
