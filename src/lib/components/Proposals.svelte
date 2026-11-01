<script lang="ts">
  import { templateForCriterion } from '../core/presets';
  import type { Criterion, RepoAnalysis, Rule } from '../core/types';
  import DraftModal from './DraftModal.svelte';
  import Hint from './Hint.svelte';

  let {
    result,
    sent,
    onadd,
  }: { result: RepoAnalysis; sent: string[]; onadd: (criterionId: string, rule: Rule) => void } = $props();
  let designing = $state<Criterion | null>(null);
  const designTemplate = $derived(designing && templateForCriterion(designing.id));
  // Les critères qui rapportent le plus de points d'abord.
  const criteria = $derived(result.criteria.filter((c) => c.fix).sort((a, b) => b.max - b.points - (a.max - a.points)));
</script>

{#if !criteria.length && !result.memoryIssues.length}
  <p class="card muted">Pas de proposition : rien à améliorer pour ce dépôt.</p>
{:else}
  <ol class="list">
    {#each criteria as c (c.id)}
      <li class="card">
        <div class="head">
          <b>{c.fix}</b>
          <span class="gain"
            >+{c.max - c.points} pts <Hint
              text="Points gagnés sur la note du dépôt une fois le critère corrigé."
            /></span
          >
        </div>
        <div class="muted">{c.label} · {c.detail}</div>
        {#if templateForCriterion(c.id)}
          <div class="act">
            {#if sent.includes(c.id)}<span class="pill">Dans Fichiers Claude</span>{/if}
            <button onclick={() => (designing = c)}
              >{sent.includes(c.id) ? 'Concevoir à nouveau…' : 'Concevoir…'}</button
            >
            <Hint
              text="Ouvre un modèle à adapter au dépôt, avec sa destination et ses défauts en direct. Une fois ajouté, il apparaît dans Fichiers Claude comme nouveau fichier à enregistrer dans le projet."
            />
          </div>
        {/if}
      </li>
    {/each}
    {#each result.memoryIssues as i, n (n)}
      <li class="card">
        <div class="head">
          <b>{i.fix}</b>
          <span class="sev-{i.severity}"
            >{i.severity === 'error' ? 'erreur' : i.severity === 'warning' ? 'avertissement' : 'suggestion'}</span
          >
        </div>
        <div class="muted">
          {#if i.file}<code>{i.file}</code> ·
          {/if}{i.message}
        </div>
      </li>
    {/each}
  </ol>
{/if}

{#if designing && designTemplate}
  <DraftModal
    criterion={designing}
    template={designTemplate}
    onadd={(rule) => onadd(designing!.id, rule)}
    onclose={() => (designing = null)}
  />
{/if}

<style>
  .list {
    display: grid;
    gap: 8px;
    padding: 0;
    margin: 0;
    list-style: none;
  }
  .list li {
    padding: 10px 14px;
  }
  .head {
    display: flex;
    gap: 12px;
    justify-content: space-between;
    align-items: baseline;
  }
  .act {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: flex-end;
    margin-top: 6px;
  }
  .gain {
    color: var(--ok);
    font-family: var(--mono);
    white-space: nowrap;
  }
</style>
