<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    DECISION_TREE,
    isStep,
    KIND_HINTS,
    newRule,
    PATTERNS,
    templatesFor,
    type Pattern,
    type Step,
    type Template,
  } from '#lib/core/presets.ts';
  import { store } from '#lib/state.svelte.ts';

  // Données constantes : pas besoin de proxys profonds.
  let trail = $state.raw<{ step: Step; label: string }[]>([]);
  let node = $state.raw<Step | Pattern>(DECISION_TREE);

  function choose(step: Step, choice: Step['choices'][number]) {
    trail = [...trail, { step, label: choice.label }];
    node = choice.next;
  }

  function backTo(i: number) {
    node = trail[i].step;
    trail = trail.slice(0, i);
  }

  function show(p: Pattern) {
    trail = [];
    node = p;
    scrollTo({ top: 0, behavior: 'smooth' });
  }

  function use(t: Template) {
    const rule = newRule(t.rule);
    store.project.rules.push(rule);
    goto(`/generator?rule=${rule.id}`);
  }
</script>

<h2>Guide</h2>
<p class="muted">Réponds à quelques questions pour savoir quel élément Claude Code utiliser, et où le placer.</p>

<section class="card tree">
  {#if trail.length}
    <ol class="trail">
      {#each trail as t, i (i)}
        <li>
          <button class="ghost" onclick={() => backTo(i)} title="Changer cette réponse">
            <span class="muted">{t.step.question}</span>
            <b>{t.label}</b>
          </button>
        </li>
      {/each}
    </ol>
  {/if}

  {#if isStep(node)}
    {@const step = node}
    <p class="question">{step.question}</p>
    {#if step.hint}<p class="muted">{step.hint}</p>{/if}
    <div class="choices">
      {#each step.choices as c (c.label)}
        <button onclick={() => choose(step, c)}>{c.label}</button>
      {/each}
    </div>
  {:else}
    {@const p = node}
    <div class="result">
      <p class="question">{p.answer}</p>
      <p><code>{p.where}</code></p>
      {#if p.kind}<p class="muted">{KIND_HINTS[p.kind]}</p>{/if}
    </div>
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
  {/if}

  {#if node !== DECISION_TREE}
    <button
      class="ghost restart"
      onclick={() => {
        trail = [];
        node = DECISION_TREE;
      }}>↺ Recommencer</button
    >
  {/if}
</section>

<details>
  <summary>Tous les cas</summary>
  <div class="scroll-x">
    <table>
      <thead><tr><th>Situation</th><th>Élément</th><th>Emplacement</th></tr></thead>
      <tbody>
        {#each PATTERNS as p (p.question)}
          <tr>
            <td>{p.question}</td>
            <td><button class="ghost link" onclick={() => show(p)}>{p.answer}</button></td>
            <td><code>{p.where}</code></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</details>

<style>
  h2 {
    margin: 0 0 4px;
    font-size: 18px;
  }
  .tree {
    max-width: 760px;
    margin: 12px 0 16px;
  }
  .tree p {
    margin: 0 0 8px;
  }
  .question {
    font-size: 16px;
    font-weight: 600;
  }
  .trail {
    display: grid;
    gap: 2px;
    margin: 0 0 12px;
    padding: 0 0 12px;
    list-style: none;
    border-bottom: 1px solid var(--border);
  }
  .trail button {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
    width: 100%;
    text-align: left;
  }
  .trail .muted::after {
    content: ' →';
  }
  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
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
  .restart {
    margin-top: 12px;
  }
  summary {
    cursor: pointer;
    font-weight: 600;
  }
  table {
    width: 100%;
    margin-top: 8px;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--border);
    text-align: left;
    vertical-align: top;
  }
  .link {
    padding: 0;
    color: var(--accent);
    text-align: left;
  }
</style>
