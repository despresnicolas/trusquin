<script lang="ts" module>
  export type View = 'start' | 'project' | 'guide' | 'rules' | 'export' | 'history';
</script>

<script lang="ts">
  import { t } from '#lib/i18n.svelte.ts';
  import { GOALS, STEP_TITLES, stepHref, type Goal, type StepView } from '#lib/goals.ts';
  import { store } from '#lib/state.svelte.ts';
  import GoalChooser from './GoalChooser.svelte';
  import Guide from './Guide.svelte';
  import Preview from './Preview.svelte';
  import ProjectBar from './ProjectBar.svelte';
  import ProjectForm from './ProjectForm.svelte';
  import ProjectHistory from './ProjectHistory.svelte';
  import RulesEditor from './RulesEditor.svelte';

  let { initial = '', view = 'start', goal }: { initial?: string; view?: View; goal?: Goal } = $props();

  /** Ce que l'utilisateur fait à chaque étape, pourquoi, et quand elle est terminée. */
  const STEPS: Record<StepView, { why: string; todo: string[]; status: () => string }> = {
    project: {
      why: 'Ces informations ouvrent le CLAUDE.md : Claude les lit au début de chaque session pour comprendre le dépôt.',
      todo: [
        'Un nom, puis une phrase sur ce que fait le dépôt.',
        'La stack : langages, frameworks, gestionnaire de paquets.',
        'Facultatif : les commandes autorisées sans confirmation et les fichiers interdits (.env).',
      ],
      status: () =>
        !store.project.name.trim()
          ? 'Il manque le nom du projet.'
          : !store.project.description.trim()
            ? 'Ajoute une description : elle aide Claude à trancher les cas ambigus.'
            : '',
    },
    guide: {
      why: 'Règle, hook, skill, sous-agent ou commande : chacun est chargé à un moment différent. Le bon choix évite d’alourdir le contexte.',
      todo: [
        'Réponds aux questions : le guide indique l’élément adapté et où il sera placé.',
        '« Ajouter au projet » sur un modèle : il s’ouvre à l’étape suivante pour l’adapter.',
        'Tu sais déjà ce que tu veux ? Passe directement à l’étape suivante.',
      ],
      status: () => '',
    },
    rules: {
      why: 'Chaque règle dit quoi faire et à quoi elle s’applique ; Trusquin en déduit le fichier et son emplacement.',
      todo: [
        'Pour chaque règle : une consigne précise, vérifiable, formulée en positif.',
        'Les pastilles rouges et orange signalent ce qui est à corriger.',
        'Une autre règle à ajouter ? « Via le guide » ou « Règle vide ».',
      ],
      status: () => (store.project.rules.length ? '' : 'Aucune règle pour l’instant : ajoute au moins une règle.'),
    },
    export: {
      why: 'Le contrôle qualité repère ce qui ferait déraper Claude : secrets, consignes vagues, CLAUDE.md trop long.',
      todo: [
        'Corrige les erreurs bloquantes (un clic mène à la règle concernée).',
        'Relis chaque fichier dans l’aperçu.',
        '« Exporter le zip » en haut, puis décompresse-le à la racine du dépôt et committe CLAUDE.md et .claude/.',
      ],
      status: () => (store.errors ? `${store.errors} erreur(s) bloquante(s) à corriger avant d’exporter.` : ''),
    },
    history: {
      why: 'Chaque enregistrement crée une version : rouvrir l’une d’elles remplace le projet en cours, après l’avoir enregistré.',
      todo: ['Clique sur « Ouvrir » à côté du projet à reprendre : tu passes aux règles.'],
      status: () => '',
    },
  };

  // Le parcours voyage dans l'URL ; un lien sans parcours (?rule=…) garde le dernier, sinon le premier qui contient l'étape.
  let last = $state<Goal>('new');
  $effect(() => {
    if (goal) last = goal;
  });
  const chosen = $derived(goal ?? last);
  const current = $derived(
    view === 'start' || GOALS[chosen].steps.includes(view)
      ? chosen
      : (Object.keys(GOALS) as Goal[]).find((g) => GOALS[g].steps.includes(view as StepView))!,
  );
  const steps = $derived(GOALS[current].steps);
  const index = $derived(view === 'start' ? -1 : steps.indexOf(view));
  const step = $derived(view === 'start' ? undefined : STEPS[view]);
  const href = (v: View) => stepHref(current, v);
</script>

{#if view === 'start'}
  <h2>Que veux-tu faire ?</h2>
  <p class="muted">Choisis un objectif : Trusquin t’accompagne ensuite étape par étape.</p>
  <GoalChooser />
{:else if step}
  <ProjectBar />

  <nav class="stepper" aria-label="Étapes : {t(GOALS[current].title)}">
    <a href={href('start')} class="change">↺ Changer d’objectif</a>
    <ol>
      {#each steps as s, i (s)}
        <li class:done={i < index}>
          <a href={href(s)} aria-current={s === view ? 'step' : undefined}>
            <span class="num">{i < index ? '✓' : i + 1}</span>{t(STEP_TITLES[s])}
          </a>
        </li>
      {/each}
    </ol>
  </nav>

  <section class="card explain">
    <h2>Étape {index + 1} sur {steps.length} · {t(STEP_TITLES[view as StepView])}</h2>
    <p>{step.why}</p>
    <ul>
      {#each step.todo as t (t)}<li>{t}</li>{/each}
    </ul>
    {#if step.status()}<p class="sev-warning" role="status">{step.status()}</p>{/if}
  </section>

  {#if view === 'export'}
    <Preview files={store.files} quality={store.quality} />
  {:else if view === 'project'}
    <ProjectForm />
  {:else if view === 'history'}
    <ProjectHistory />
  {:else if view === 'rules'}
    {#key initial}
      <RulesEditor {initial} />
    {/key}
  {:else}
    <Guide />
  {/if}

  <div class="nav">
    {#if index > 0}
      <a class="button" href={href(steps[index - 1])}>← {t(STEP_TITLES[steps[index - 1]])}</a>
    {/if}
    <span class="spacer"></span>
    {#if index < steps.length - 1}
      <a class="button primary" href={href(steps[index + 1])}>{t(STEP_TITLES[steps[index + 1]])} →</a>
    {:else}
      <!-- Fin du parcours : la boucle continue par la ré-analyse du dépôt une fois le zip décompressé et committé. -->
      <a class="button primary" href="/analyze">Ré-analyser le dépôt →</a>
    {/if}
  </div>
{/if}

<style>
  .stepper {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    align-items: center;
    margin: 16px 0;
  }
  .stepper ol {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .stepper ol a {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 4px 10px;
    border-radius: 6px;
    color: var(--muted);
    text-decoration: none;
  }
  .stepper ol a[aria-current='step'] {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }
  .num {
    display: inline-grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border: 1px solid currentColor;
    border-radius: 50%;
    font-size: 12px;
  }
  .done .num {
    color: var(--ok);
  }
  .change {
    color: var(--muted);
    font-size: 13px;
  }
  .explain {
    max-width: 900px;
    margin-bottom: 16px;
  }
  .explain h2 {
    margin: 0 0 6px;
    font-size: 16px;
  }
  .explain p,
  .explain ul {
    margin: 0 0 6px;
  }
  .explain ul {
    padding-left: 20px;
  }
  .nav {
    display: flex;
    gap: 8px;
    margin-top: 20px;
  }
  .spacer {
    flex: 1;
  }
  .button {
    padding: 8px 16px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    text-decoration: none;
    font-weight: 600;
  }
  .button.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
</style>
