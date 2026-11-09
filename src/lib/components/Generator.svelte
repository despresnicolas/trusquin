<script lang="ts" module>
  export type View = 'start' | 'project' | 'guide' | 'rules' | 'export' | 'history';
</script>

<script lang="ts">
  import { t, type Key } from '#lib/i18n.svelte.ts';
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
  const STEPS: Record<StepView, { why: Key; todo: Key[]; status: () => string }> = {
    project: {
      why: 'gen.projectWhy',
      todo: ['gen.projectTodo1', 'gen.projectTodo2', 'gen.projectTodo3'],
      status: () =>
        !store.project.name.trim()
          ? t('gen.projectNoName')
          : !store.project.description.trim()
            ? t('gen.projectNoDescription')
            : '',
    },
    guide: {
      why: 'gen.guideWhy',
      todo: ['gen.guideTodo1', 'gen.guideTodo2', 'gen.guideTodo3'],
      status: () => '',
    },
    rules: {
      why: 'gen.rulesWhy',
      todo: ['gen.rulesTodo1', 'gen.rulesTodo2', 'gen.rulesTodo3'],
      status: () => (store.project.rules.length ? '' : t('gen.rulesNone')),
    },
    export: {
      why: 'gen.exportWhy',
      todo: ['gen.exportTodo1', 'gen.exportTodo2', 'gen.exportTodo3'],
      status: () => (store.errors ? t('gen.exportErrors', { n: store.errors }) : ''),
    },
    history: {
      why: 'gen.historyWhy',
      todo: ['gen.historyTodo1'],
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
  <h2>{t('home.goals')}</h2>
  <p class="muted">{t('generator.chooseGoal')}</p>
  <GoalChooser />
{:else if step}
  <ProjectBar />

  <nav class="stepper" aria-label={t('gen.steps', { goal: t(GOALS[current].title) })}>
    <a href={href('start')} class="change">{t('gen.changeGoal')}</a>
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
    <h2>{t('gen.stepOf', { n: index + 1, total: steps.length, title: t(STEP_TITLES[view as StepView]) })}</h2>
    <p>{t(step.why)}</p>
    <ul>
      {#each step.todo as key (key)}<li>{t(key)}</li>{/each}
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
      <a class="button primary" href="/analyze">{t('gen.reanalyze')}</a>
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
