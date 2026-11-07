/** Étapes du générateur (paramètre `view` de /generator). */
export type StepView = 'project' | 'guide' | 'rules' | 'export' | 'history';
export type Goal = 'new' | 'add' | 'resume';

export const STEP_TITLES: Record<StepView, string> = {
  project: 'Décrire le projet',
  guide: 'Choisir l’élément Claude Code',
  rules: 'Écrire les règles',
  export: 'Vérifier et exporter',
  history: 'Choisir le projet',
};

/** Parcours du générateur : chacun enchaîne quelques étapes dans l'ordre. */
export const GOALS: Record<Goal, { title: string; text: string; steps: StepView[] }> = {
  new: {
    title: 'Créer la configuration d’un projet',
    text: 'Partir de zéro : décrire le projet, choisir ses règles, exporter les fichiers.',
    steps: ['project', 'guide', 'rules', 'export'],
  },
  add: {
    title: 'Ajouter un élément au projet en cours',
    text: 'Un hook, un skill, une commande, une règle… Le guide indique lequel convient.',
    steps: ['guide', 'rules', 'export'],
  },
  resume: {
    title: 'Reprendre un projet enregistré',
    text: 'Rouvrir une version de l’historique, la compléter puis l’exporter.',
    steps: ['history', 'rules', 'export'],
  },
};

export const isGoal = (v: string | null): v is Goal => v !== null && v in GOALS;

/** Lien vers une étape d'un parcours : le parcours voyage dans l'URL. */
export const stepHref = (goal: Goal, view: StepView | 'start') => `/generator?goal=${goal}&view=${view}`;
