<script lang="ts">
  import type { AnalysisRecord } from '#lib/history.ts';
  import ScoreBadge from './ScoreBadge.svelte';

  let { record }: { record: AnalysisRecord } = $props();
  const result = $derived(record.result);

  const groups = [
    { id: 'claude', label: 'Préparation pour Claude Code' },
    { id: 'practices', label: 'Bonnes pratiques du repo (boucles de feedback)' },
  ] as const;
  const icon = { pass: '✓', partial: '◐', fail: '✗', na: '–' };
</script>

<div class="card summary">
  <ScoreBadge score={result.score} label={result.grade} size="lg" />
  <div>
    <b>{record.name}</b> · {record.fileCount} fichiers · mémoire : {result.memoryFiles.join(', ') || 'aucune'}
    <div class="bars">
      {#each groups as g}
        {@const list = result.criteria.filter((c) => c.group === g.id && c.status !== 'na')}
        {@const got = list.reduce((s, c) => s + c.points, 0)}
        {@const max = list.reduce((s, c) => s + c.max, 0)}
        <div class="bar">
          <span>{g.label}</span>
          <meter min="0" {max} value={got}></meter>
          <span class="muted">{got}/{max}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

{#each groups as g}
  <h3>{g.label}</h3>
  <table>
    <tbody>
      {#each result.criteria.filter((c) => c.group === g.id) as c}
        <tr class={c.status}>
          <td class="icon">{icon[c.status]}</td>
          <td
            ><b>{c.label}</b>
            <div class="muted">{c.detail}</div>
            {#if c.fix}<div class="fix">→ {c.fix}</div>{/if}</td
          >
          <td class="pts">{c.status === 'na' ? 'n/a' : `${c.points}/${c.max}`}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/each}

{#if result.memoryIssues.length}
  <h3>Problèmes dans les fichiers mémoire existants</h3>
  <ul>
    {#each result.memoryIssues as i}
      <li class="sev-{i.severity}">
        {#if i.file}<code>{i.file}</code>
        {/if}{i.message} <span class="muted">→ {i.fix}</span>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .summary {
    display: flex;
    gap: 20px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .summary > div {
    flex: 1;
    min-width: 240px;
  }
  .bars {
    display: grid;
    gap: 4px;
    margin-top: 8px;
  }
  .bar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 120px 50px;
    gap: 8px;
    align-items: center;
    font-size: 12px;
  }
  meter {
    width: 100%;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  .icon {
    width: 28px;
    font-weight: 700;
  }
  .pts {
    width: 60px;
    text-align: right;
    font-family: var(--mono);
  }
  .pass .icon {
    color: var(--ok);
  }
  .partial .icon {
    color: var(--warn);
  }
  .fail .icon {
    color: var(--err);
  }
  .na {
    opacity: 0.55;
  }
  .fix {
    font-size: 12px;
    color: var(--accent);
  }
  h3 {
    margin: 24px 0 8px;
    font-size: 15px;
  }
  ul {
    padding-left: 18px;
  }
</style>
