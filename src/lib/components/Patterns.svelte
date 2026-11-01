<script lang="ts">
  import { goto } from '$app/navigation';
  import { newRule, PATTERNS, templatesFor, type Template } from '../core/presets';
  import { store } from '../state.svelte';

  function use(t: Template) {
    const rule = newRule(t.rule);
    store.project.rules.push(rule);
    goto(`/generator?rule=${rule.id}`);
  }
</script>

<h2>Patterns</h2>
<p class="muted">Une situation, l'élément Claude Code qui y répond, et des modèles à ajouter au projet.</p>

<div class="patterns">
  {#each PATTERNS as p (p.question)}
    <section class="card pattern">
      <p class="question">{p.question}</p>
      <p><b>{p.answer}</b> · <code>{p.where}</code></p>
      {#each templatesFor(p) as t (t.label)}
        <div class="template">
          <div>
            <b>{t.label}</b>
            <div class="muted">{t.hint}</div>
          </div>
          <button onclick={() => use(t)}>Ajouter au projet</button>
        </div>
      {:else}
        {#if !p.kind}
          <a href="/generator?view=project">Régler dans Générateur › Projet</a>
        {:else}
          <p class="muted">Pas de modèle : partir d'une règle vide.</p>
        {/if}
      {/each}
    </section>
  {/each}
</div>

<style>
  h2 {
    margin: 0 0 4px;
    font-size: 18px;
  }
  .patterns {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
    gap: 12px;
    margin: 12px 0 24px;
  }
  .pattern p {
    margin: 0 0 8px;
  }
  .question {
    font-weight: 600;
  }
  .template {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-top: 1px solid var(--border);
  }
  .template .muted {
    font-size: 12px;
  }
  .template button {
    flex-shrink: 0;
  }
</style>
