<script lang="ts">
  import type { Rule } from '../core/types';
  import { api, type AnalysisRecord, type AnalysisRun, type FreshAnalysis, type RepoSummary } from '../history';
  import AnalysisReport from './AnalysisReport.svelte';
  import DirPicker from './DirPicker.svelte';
  import RepoFiles from './RepoFiles.svelte';
  import ScoreBadge from './ScoreBadge.svelte';

  let path = $state('');
  let repos = $state<RepoSummary[]>([]);
  let runs = $state<AnalysisRun[]>([]);
  let record = $state<AnalysisRecord | null>(null);
  let rules = $state<Rule[] | undefined>();
  let context = $state<FreshAnalysis['context'] | undefined>();
  let view = $state<'report' | 'files' | 'history'>('report');
  let loading = $state(false);
  let failure = $state('');
  let picker: DirPicker;

  const date = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

  async function attempt(task: () => Promise<void>) {
    loading = true;
    failure = '';
    try {
      await task();
    } catch (e) {
      failure = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  const refresh = async () => {
    repos = await api.repos();
  };

  async function show(next: AnalysisRecord, fresh?: FreshAnalysis) {
    record = next;
    rules = fresh?.rules;
    context = fresh?.context;
    path = next.path;
    runs = await api.runs(next.path);
  }

  const analyze = (target: string) =>
    attempt(async () => {
      const fresh = await api.analyze(target);
      await show(fresh, fresh);
      await refresh();
    });

  const open = (id: number) => attempt(async () => show(await api.get(id)));

  const forget = (target: string) =>
    attempt(async () => {
      if (!confirm(`Supprimer tout l'historique de ${target} ?`)) return;
      await api.forget(target);
      if (record?.path === target) {
        record = null;
        runs = [];
      }
      await refresh();
    });

  $effect(() => {
    attempt(refresh);
  });
</script>

<div class="card intro">
  <div>
    <h3>Analyser un projet</h3>
  </div>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      analyze(path);
    }}
  >
    <input bind:value={path} placeholder="/Users/moi/Dev/mon-repo" aria-label="Chemin du dossier" required />
    <button type="button" class="primary" disabled={loading} onclick={() => picker.open()}>
      {loading ? 'Analyse…' : 'Ajouter un dépôt'}
    </button>
  </form>
</div>

<DirPicker
  bind:this={picker}
  start={path}
  onpick={(chosen) => {
    path = chosen;
    analyze(chosen);
  }}
/>

{#if failure}<p class="sev-error">{failure}</p>{/if}

<div class="layout">
  <aside>
    <h3>Dépôts</h3>
    {#if !repos.length}
      <p class="muted">Aucun dépôt analysé.</p>
    {/if}
    <ul class="repos">
      {#each repos as repo (repo.last.path)}
        {@const delta = repo.previousScore === null ? null : repo.last.score - repo.previousScore}
        <li class:active={record?.path === repo.last.path}>
          <button class="item" onclick={() => open(repo.last.id)} title={repo.last.path}>
            <span class="head">
              <b>{repo.last.name}</b>
              <ScoreBadge score={repo.last.score} label={repo.last.grade} />
            </span>
            <span class="muted path">{repo.last.path}</span>
            <span class="muted small">
              {date(repo.last.createdAt)} · {repo.runs} analyse{repo.runs > 1 ? 's' : ''}
              {#if delta}<span class={delta > 0 ? 'up' : 'down'}>{delta > 0 ? '▲' : '▼'} {Math.abs(delta)}</span>{/if}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  </aside>

  <section>
    {#if record}
      <div class="toolbar">
        <code class="path">{record.path}</code>
        <button onclick={() => analyze(record!.path)} disabled={loading}>Ré-analyser</button>
      </div>
      <div class="views" role="tablist">
        <button role="tab" aria-selected={view === 'report'} onclick={() => (view = 'report')}>Rapport</button>
        <button role="tab" aria-selected={view === 'files'} onclick={() => (view = 'files')}>Fichiers Claude</button>
        <button role="tab" aria-selected={view === 'history'} onclick={() => (view = 'history')}>
          Historique <span class="muted">{runs.length}</span>
        </button>
      </div>
      {#if view === 'report'}
        {#key record.id}
          <AnalysisReport {record} {rules} {context} />
        {/key}
      {:else if view === 'files'}
        {#key record.path}
          <RepoFiles path={record.path} />
        {/key}
      {:else}
        <table class="history">
          <tbody>
            {#each runs as r, i (r.id)}
              {@const delta = runs[i + 1] ? r.score - runs[i + 1].score : 0}
              <tr class:active={r.id === record.id}>
                <td>
                  <button
                    class="ghost"
                    onclick={async () => {
                      await open(r.id);
                      view = 'report';
                    }}>{date(r.createdAt)}</button
                  >
                </td>
                <td><ScoreBadge score={r.score} label={r.grade} /></td>
                <td>
                  {#if delta}<span class={delta > 0 ? 'up' : 'down'}>{delta > 0 ? '▲' : '▼'} {Math.abs(delta)}</span
                    >{/if}
                </td>
                <td class="muted">{r.fileCount} fichiers</td>
                <td class="muted">{r.id === record.id ? 'affichée' : ''}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <button class="danger" onclick={() => forget(record!.path)} disabled={loading}>Supprimer l'historique</button>
      {/if}
    {/if}
  </section>
</div>

<style>
  .intro {
    display: flex;
    gap: 20px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .intro > div {
    flex: 1;
    min-width: 240px;
  }
  .intro h3 {
    margin: 0 0 4px;
  }
  form {
    display: flex;
    gap: 8px;
    flex: 1;
    min-width: 280px;
  }
  form input {
    flex: 1;
    font-family: var(--mono);
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 760px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  aside h3 {
    margin: 0 0 8px;
    font-size: 15px;
  }
  .repos {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 6px;
  }
  .item {
    display: grid;
    gap: 2px;
    width: 100%;
    text-align: left;
    padding: 8px 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: inherit;
  }
  .active .item {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }
  .small {
    font-size: 12px;
  }
  .up {
    color: var(--ok);
  }
  .down {
    color: var(--err);
  }
  .toolbar {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .toolbar .path {
    flex: 1;
    min-width: 0;
  }
  .danger {
    color: var(--err);
  }
  .history {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .history td {
    padding: 6px 10px;
    border-bottom: 1px solid var(--border);
  }
  .history tr.active {
    background: var(--accent-soft);
  }
</style>
