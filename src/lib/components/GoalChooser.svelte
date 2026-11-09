<script lang="ts">
  import { t } from '#lib/i18n.svelte.ts';
  import { GOALS, STEP_TITLES, stepHref, type Goal } from '#lib/goals.ts';

  const goals = Object.entries(GOALS) as [Goal, (typeof GOALS)[Goal]][];
</script>

<!-- Point d'entrée des parcours : accueil et « Changer d'objectif » du générateur. -->
<div class="goals">
  <a class="card goal" href="/analyze">
    <b>{t('goal.improve')}</b>
    <span class="muted">{t('goal.improveText')}</span>
    <span class="muted small">{t('goal.improveSteps')}</span>
  </a>
  {#each goals as [id, g] (id)}
    <a class="card goal" href={stepHref(id, g.steps[0])}>
      <b>{t(g.title)}</b>
      <span class="muted">{t(g.text)}</span>
      <span class="muted small">{g.steps.map((s) => t(STEP_TITLES[s])).join(' → ')}</span>
    </a>
  {/each}
</div>

<style>
  .goals {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
  }
  .goal {
    display: grid;
    gap: 6px;
    align-content: start;
    color: var(--text);
    text-decoration: none;
  }
  .goal:hover,
  .goal:focus-visible {
    border-color: var(--accent);
  }
  .small {
    font-size: 12px;
  }
</style>
