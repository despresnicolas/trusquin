# Trusquin

Transforme des règles en fichiers Claude Code placés au bon endroit, et note des dépôts existants sur leur préparation pour Claude Code.

## Langage

### Générateur

**Projet** :
La configuration Claude Code d'un nouveau projet, construite dans le générateur : nom, description, stack, règles et permissions. Peut partir de règles importées (fichiers .md ou .json, ou un dépôt analysé).
_À éviter_ : configuration, dépôt

**Export** :
L'ensemble des fichiers que le générateur produit à partir d'un projet.

**Qualité de l'export** :
Le contrôle d'un export avant qu'il soit envoyé à Claude, noté sur 100. Propre au projet, jamais à un dépôt.

### Analyse

**Dépôt** :
Un dossier existant soumis à l'analyse, identifié par son chemin absolu.
_À éviter_ : projet, repo analysé

**Analyse** :
La notation d'un dépôt à un instant donné, selon des critères ; un dépôt accumule un historique d'analyses.

**Critère** :
Un point vérifié lors d'une analyse, qui rapporte une partie de la note du dépôt.
