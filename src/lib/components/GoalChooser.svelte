<script lang="ts">
  import { GOALS, STEP_TITLES, stepHref, type Goal } from '#lib/goals.ts';

  const goals = Object.entries(GOALS) as [Goal, (typeof GOALS)[Goal]][];
</script>

<!-- Point d'entrée des parcours : accueil et « Changer d'objectif » du générateur. -->
<div class="goals">
  <a class="card goal" href="/analyze">
    <b>Améliorer un dépôt existant</b>
    <span class="muted">Noter le dépôt, puis corriger ou créer ses fichiers Claude depuis les propositions.</span>
    <span class="muted small">Analyser → Propositions → Ré-analyser</span>
  </a>
  {#each goals as [id, g] (id)}
    <a class="card goal" href={stepHref(id, g.steps[0])}>
      <b>{g.title}</b>
      <span class="muted">{g.text}</span>
      <span class="muted small">{g.steps.map((s) => STEP_TITLES[s]).join(' → ')}</span>
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
