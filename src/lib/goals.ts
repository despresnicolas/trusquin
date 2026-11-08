import type { Key } from './i18n/fr';

/** Étapes du générateur (paramètre `view` de /generator). */
export type StepView = 'project' | 'guide' | 'rules' | 'export' | 'history';
export type Goal = 'new' | 'add' | 'resume';

/** Clés de traduction (i18n/fr.ts) : les titres passent par `t()` à l'affichage. */
export const STEP_TITLES: Record<StepView, Key> = {
  project: 'step.project',
  guide: 'step.guide',
  rules: 'step.rules',
  export: 'step.export',
  history: 'step.history',
};

/** Parcours du générateur : chacun enchaîne quelques étapes dans l'ordre. */
export const GOALS: Record<Goal, { title: Key; text: Key; steps: StepView[] }> = {
  new: {
    title: 'goal.new',
    text: 'goal.newText',
    steps: ['project', 'guide', 'rules', 'export'],
  },
  add: {
    title: 'goal.add',
    text: 'goal.addText',
    steps: ['guide', 'rules', 'export'],
  },
  resume: {
    title: 'goal.resume',
    text: 'goal.resumeText',
    steps: ['history', 'rules', 'export'],
  },
};

export const isGoal = (v: string | null): v is Goal => v !== null && v in GOALS;

/** Lien vers une étape d'un parcours : le parcours voyage dans l'URL. */
export const stepHref = (goal: Goal, view: StepView | 'start') => `/generator?goal=${goal}&view=${view}`;
