<script lang="ts">
  import type { Rule } from '#lib/core/types.ts';
  import type { Backup } from '#lib/bindings/sauron/models.ts';
  import { api, type AnalysisRecord, type AnalysisRun, type RepoSummary } from '#lib/history.ts';
  import AnalysisReport from './AnalysisReport.svelte';
  import Proposals from './Proposals.svelte';
  import RepoFiles from './RepoFiles.svelte';
  import HowItWorks from './HowItWorks.svelte';
  import ScoreBadge from './ScoreBadge.svelte';
  import { untrack } from 'svelte';

  type View = 'report' | 'proposals' | 'files' | 'history';
  // Lien profond (/analyze?path=…&view=…) : ouvre la dernière analyse de ce dépôt sur l'onglet voulu.
  let { initialPath = '', initialView = 'report' }: { initialPath?: string; initialView?: View } = $props();

  let path = $state('');
  let repos = $state<RepoSummary[]>([]);
  let runs = $state<AnalysisRun[]>([]);
  let record = $state<AnalysisRecord | null>(null);
  // Propositions conçues dans la modale, à enregistrer dans un nouveau projet (rien n'est écrit sur le disque).
  let drafts = $state<{ criterion: string; rule: Rule }[]>([]);
  let view = $state<View>('report');
  let loading = $state(false);
  const proposals = $derived(
    record ? record.result.criteria.filter((c) => c.fix).length + record.result.memoryIssues.length : 0,
  );
  let failure = $state('');
  // Sauvegardes des fichiers écrasés depuis les propositions : affichées jusqu'au prochain enregistrement.
  let backups = $state<string[]>([]);
  // Sauvegardes du dépôt affiché, restaurables depuis l'onglet Historique.
  let saved = $state<Backup[]>([]);
  let toast = $state<{ run: AnalysisRun; delta: number | null } | null>(null);
  let toastTimer: ReturnType<typeof setTimeout>;

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

  // Tant que la liste n'est pas lue, on n'affiche pas l'état vide (évite un flash au chargement).
  let ready = $state(false);
  const refresh = async () => {
    repos = await api.repos();
    ready = true;
  };

  const pick = () =>
    attempt(async () => {
      const chosen = await api.pickDir(path);
      if (!chosen) return;
      path = chosen;
      await analyze(chosen);
    });

  async function show(next: AnalysisRecord) {
    if (next.path !== record?.path) drafts = [];
    record = next;
    path = next.path;
    runs = await api.runs(next.path);
    saved = await api.backups(next.path).catch(() => []);
    view = 'report';
  }

  const analyze = (target: string) =>
    attempt(async () => {
      const fresh = await api.analyze(target);
      await show(fresh);
      toast = { run: fresh, delta: runs[1] ? fresh.score - runs[1].score : null };
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => (toast = null), 5000);
      await refresh();
    });

  const restore = (b: Backup) =>
    attempt(async () => {
      if (!(await api.ask(`Remettre la version de ${b.rel} du ${date(b.savedAt)} ?`, 'Restaurer'))) return;
      const replaced = await api.restore(record!.path, b.path);
      backups = replaced ? [replaced] : [];
      await analyze(record!.path);
    });

  const open = (id: number) => attempt(async () => show(await api.get(id)));

  const forget = (target: string) =>
    attempt(async () => {
      if (!(await api.ask(`Retirer ${target} de SAURON ? Ses analyses sont supprimées, le dossier n'est pas touché.`)))
        return;
      await api.forget(target);
      if (record?.path === target) {
        record = null;
        runs = [];
      }
      await refresh();
    });

  $effect(() => {
    const target = untrack(() => initialPath);
    const tab = untrack(() => initialView);
    attempt(async () => {
      await refresh();
      const repo = repos.find((r) => r.last.path === target);
      if (!repo) return;
      await show(await api.get(repo.last.id));
      view = tab;
    });
  });
</script>

{#if failure}<p class="sev-error">{failure}</p>{/if}
{#if backups.length}
  <p class="muted">
    Ancienne version sauvegardée, restaurable dans l’onglet Historique : {#each backups as b (b)}<code>{b}</code>
    {/each}
    <button class="ghost" aria-label="Masquer" onclick={() => (backups = [])}>×</button>
  </p>
{/if}

{#if ready && !repos.length}
  <div class="empty">
    <h1>Analyser un dépôt</h1>
    <p class="lead">
      SAURON note un dossier sur sa préparation pour Claude Code (A à E) et liste les corrections, triées par points
      gagnés. Rien n'est modifié dans le dépôt sans ton accord.
    </p>
    <button class="primary" onclick={pick} disabled={loading}>{loading ? 'Analyse…' : 'Choisir un dossier…'}</button>
  </div>
  <HowItWorks />
{:else}
  <div class="layout">
    <aside>
      <div class="aside-head">
        <h3>Dépôts</h3>
        <button class="add" onclick={pick} disabled={loading} aria-label="Ajouter un dépôt" title="Ajouter un dépôt"
          >{loading ? '…' : '+'}</button
        >
      </div>
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
            <button
              class="ghost remove"
              onclick={() => forget(repo.last.path)}
              disabled={loading}
              aria-label="Retirer {repo.last.name}"
              title="Retirer ce dépôt et ses analyses (le dossier n'est pas touché)">Supprimer</button
            >
          </li>
        {/each}
      </ul>
    </aside>

    <section>
      {#if !record}
        <p class="muted">Choisis un dépôt dans la liste, ou ajoutes-en un avec +.</p>
      {:else}
        <div class="title">
          <h2>{record.name} <ScoreBadge score={record.score} label={record.grade} /></h2>
          <code class="muted path" title={record.path}>{record.path}</code>
        </div>
        <!-- La boucle de travail, appliquée à ce dépôt : chaque étape dit où on en est et y mène. -->
        <ol class="steps" aria-label="Étapes">
          <li class="done static">
            <span class="num">✓</span>
            <span class="label"><b>Analysé</b><small class="muted">{date(record.createdAt)}</small></span>
          </li>
          <li class:done={!proposals}>
            <button class="ghost" onclick={() => (view = 'proposals')}>
              <span class="num">{proposals ? 2 : '✓'}</span>
              <span class="label"
                ><b>Corriger</b><small class="muted"
                  >{proposals ? `${proposals} proposition${proposals > 1 ? 's' : ''}` : 'Rien à corriger'}</small
                ></span
              >
            </button>
          </li>
          <li class:done={!drafts.length}>
            <button class="ghost" onclick={() => (view = 'files')}>
              <span class="num">{drafts.length ? 3 : '✓'}</span>
              <span class="label"
                ><b>Exporter</b><small class="muted"
                  >{drafts.length
                    ? `${drafts.length} règle${drafts.length > 1 ? 's' : ''} à exporter`
                    : 'Rien en attente'}</small
                ></span
              >
            </button>
          </li>
          <li>
            <button
              class="ghost"
              onclick={() => analyze(record!.path)}
              disabled={loading}
              title="Relit le dépôt après tes changements : l'onglet Historique montre l'évolution de la note."
            >
              <span class="num">4</span>
              <span class="label"
                ><b>{loading ? 'Analyse…' : 'Ré-analyser'}</b><small class="muted">Voir la note monter</small></span
              >
            </button>
          </li>
        </ol>
        <div class="views" role="tablist">
          <button role="tab" aria-selected={view === 'report'} onclick={() => (view = 'report')}>Rapport</button>
          <button
            role="tab"
            aria-selected={view === 'proposals'}
            title="Ce qu'il faut corriger, trié par points gagnés"
            onclick={() => (view = 'proposals')}
          >
            Propositions <span class="muted">{proposals}</span>
          </button>
          <button role="tab" aria-selected={view === 'files'} onclick={() => (view = 'files')}>
            Fichiers Claude
            {#if drafts.length}<span class="pill">{drafts.length} nouveau{drafts.length > 1 ? 'x' : ''}</span>{/if}
          </button>
          <button role="tab" aria-selected={view === 'history'} onclick={() => (view = 'history')}>
            Historique <span class="muted">{runs.length}</span>
          </button>
        </div>
        {#if view === 'report'}
          {#key record.id}
            <AnalysisReport {record} />
          {/key}
        {:else if view === 'proposals'}
          <Proposals
            root={record.path}
            result={record.result}
            onsaved={(list) => {
              backups = list;
              analyze(record!.path);
            }}
            sent={drafts.map((d) => d.criterion)}
            onadd={(criterion, rule) => {
              drafts = [...drafts.filter((d) => d.criterion !== criterion), { criterion, rule }];
              view = 'files';
            }}
          />
        {:else if view === 'files'}
          {#key record.path}
            <RepoFiles
              path={record.path}
              name={record.name}
              drafts={drafts.map((d) => d.rule)}
              onremove={(id) => (drafts = drafts.filter((d) => d.rule.id !== id))}
            />
          {/key}
        {:else}
          <div class="scroll-x">
            <table class="history">
              <tbody>
                {#each runs as r, i (r.id)}
                  {@const delta = runs[i + 1] ? r.score - runs[i + 1].score : 0}
                  <tr class:active={r.id === record.id}>
                    <td>
                      <button class="ghost" onclick={() => open(r.id)}>{date(r.createdAt)}</button>
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
          </div>
          <h4>Sauvegardes <span class="muted">{saved.length}</span></h4>
          {#if !saved.length}
            <p class="muted">
              Aucune : une copie est gardée chaque fois qu'un fichier du dépôt est écrasé depuis SAURON.
            </p>
          {:else}
            <div class="scroll-x">
              <table class="history">
                <tbody>
                  {#each saved as b (b.path)}
                    <tr>
                      <td><code>{b.rel}</code></td>
                      <td class="muted">{date(b.savedAt)}</td>
                      <td><button onclick={() => restore(b)} disabled={loading}>Restaurer</button></td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        {/if}
      {/if}
    </section>
  </div>
{/if}

<div class="toast-zone" role="status" aria-live="polite">
  {#if toast}
    <div class="toast card">
      <span>Analyse terminée · <b>{toast.run.name}</b></span>
      <ScoreBadge score={toast.run.score} label={toast.run.grade} />
      {#if toast.delta}<span class={toast.delta > 0 ? 'up' : 'down'}
          >{toast.delta > 0 ? '▲' : '▼'} {Math.abs(toast.delta)}</span
        >{/if}
      <span class="muted">{toast.run.fileCount} fichiers</span>
      <button class="ghost" aria-label="Fermer" onclick={() => (toast = null)}>×</button>
    </div>
  {/if}
</div>

<style>
  h1 {
    margin: 0 0 8px;
    font-size: 28px;
  }
  .lead {
    max-width: 62ch;
    margin: 0 auto 20px;
    font-size: 16px;
    line-height: 1.55;
    color: var(--muted);
  }
  .empty {
    padding: 48px 0 40px;
    text-align: center;
  }
  .aside-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .add {
    width: 28px;
    height: 28px;
    padding: 0;
    font-size: 18px;
    line-height: 1;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 900px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  aside h3 {
    margin: 0;
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
  .repos li {
    position: relative;
  }
  .remove {
    position: absolute;
    right: 6px;
    bottom: 4px;
    padding: 2px 6px;
    font-size: 12px;
    color: var(--muted);
  }
  .remove:hover,
  .remove:focus-visible {
    color: var(--err);
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
  .title {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
    margin: 14px 0 0;
    padding: 0;
    list-style: none;
  }
  .steps li {
    display: flex;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .steps .static,
  .steps button {
    display: flex;
    flex: 1;
    gap: 10px;
    align-items: center;
    padding: 8px 10px;
    text-align: left;
  }
  .steps .label {
    display: grid;
    line-height: 1.3;
  }
  .steps small {
    font-size: 12px;
  }
  .steps .num {
    display: grid;
    flex-shrink: 0;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--on-accent);
    font-size: 13px;
    font-weight: 700;
  }
  .steps .done .num {
    background: var(--ok);
  }
  .title h2 {
    display: flex;
    gap: 10px;
    align-items: center;
    margin: 0;
    font-size: 20px;
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
  .toast-zone {
    position: fixed;
    right: 20px;
    bottom: calc(20px + env(safe-area-inset-bottom, 0px));
    z-index: 10;
  }
  .toast {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 10px 8px 10px 16px;
    box-shadow: 0 6px 24px rgb(0 0 0 / 0.18);
  }
  .views {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 14px 0;
    border-bottom: 1px solid var(--border);
  }
  .views button {
    border: 0;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    background: none;
    color: var(--muted);
  }
  .views button[aria-selected='true'] {
    border-bottom-color: var(--accent);
    color: var(--text);
  }
</style>
