<script lang="ts">
  import { countInstructions } from '../core/quality';
  import { LOADING_LABELS } from '../core/presets';
  import type { GeneratedFile, Loading, QualityReport } from '../core/types';
  import { download, exportZip } from '../export';
  import { highlight } from '#lib/highlight.ts';
  import { store } from '../state.svelte';
  import ScoreBadge from './ScoreBadge.svelte';

  let { files, quality }: { files: GeneratedFile[]; quality: QualityReport } = $props();

  let selectedPath = $state('CLAUDE.md');
  let confirmed = $state(false);
  const selected = $derived(files.find((f) => f.path === selectedPath) ?? files[0]);
  const errors = $derived(quality.issues.filter((i) => i.severity === 'error'));
  const order: Loading[] = ['always', 'on-path', 'on-demand', 'deterministic', 'personal'];
  const fileIssues = $derived(quality.issues.filter((i) => i.file === selected?.path));
  const lines = $derived(selected ? highlight(selected.path, selected.content) : []);

  async function exportAll() {
    const blob = await exportZip($state.snapshot(store.project), files, quality);
    download(`${store.project.name.replace(/\W+/g, '-').toLowerCase() || 'claude'}-sauron.zip`, blob);
  }
</script>

<div class="bar card">
  <ScoreBadge score={quality.score} />
  <span><b>{files.length}</b> fichiers · <b>{quality.alwaysLoadedInstructions}</b> instructions toujours chargées</span>
  <span class="spacer"></span>
  {#if errors.length && !confirmed}
    <span class="sev-error">{errors.length} erreur(s) bloquante(s)</span>
    <button onclick={() => (confirmed = true)}>Exporter quand même…</button>
  {:else}
    <button class="primary" onclick={exportAll}>Exporter le zip</button>
  {/if}
</div>
<p class="muted hint">
  Décompresser à la racine du repo. Le zip contient aussi <code>sauron.json</code> (source, rechargeable et utilisable en
  CLI) et <code>_sauron-report.md</code> (rapport, à ne pas committer). Les fichiers <code>~/</code>
  sont rangés dans <code>_home/</code>.
</p>

<div class="layout">
  <nav class="card">
    {#each order as loading}
      {@const group = files.filter((f) => f.loading === loading)}
      {#if group.length}
        <h4>{LOADING_LABELS[loading]}</h4>
        {#each group as f}
          <button class="ghost" class:active={f.path === selected?.path} onclick={() => (selectedPath = f.path)}>
            <code>{f.path}</code>
            {#if quality.issues.some((i) => i.file === f.path && i.severity !== 'info')}<span class="sev-warning"
                >●</span
              >{/if}
          </button>
        {/each}
      {/if}
    {/each}
  </nav>

  {#if selected}
    <article class="card">
      <header>
        <code class="path">{selected.path}</code>
        <span class="pill">{LOADING_LABELS[selected.loading]}</span>
        <span class="pill">{selected.content.split('\n').length - 1} lignes</span>
        {#if !selected.path.endsWith('.json')}<span class="pill"
            >{countInstructions(selected.content)} instructions</span
          >{/if}
        <span class="spacer"></span>
        <button onclick={() => navigator.clipboard.writeText(selected.content)}>Copier</button>
      </header>
      <p class="muted">{selected.explanation}</p>
      {#each fileIssues as i}<p class="sev-{i.severity}">{i.message} <span class="muted">→ {i.fix}</span></p>{/each}
      <pre>{#each lines as line}<span class="line {line.cls ?? ''}"
            ><span
              >{#each line.parts as p}{#if p.cls}<span class={p.cls}>{p.text}</span>{:else}{p.text}{/if}{/each}</span
            ></span
          >{/each}</pre>
    </article>
  {/if}
</div>

<style>
  .bar {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }
  .spacer {
    flex: 1;
  }
  .hint {
    font-size: 12px;
    margin: 8px 2px 16px;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(240px, 320px) 1fr;
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 800px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
  nav {
    display: grid;
    gap: 2px;
  }
  nav h4 {
    margin: 12px 0 4px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }
  nav h4:first-child {
    margin-top: 0;
  }
  nav button {
    text-align: left;
    overflow-wrap: anywhere;
  }
  nav button.active {
    background: var(--accent-soft);
  }
  article header {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .path {
    font-weight: 600;
  }
  pre {
    background: var(--surface-2);
    border: 1px solid var(--border);
    padding: 12px 14px 12px 0;
    border-radius: 6px;
    max-height: 70vh;
    overflow: auto;
    font-size: 13px;
    line-height: 1.55;
    tab-size: 2;
    counter-reset: line;
  }
  .line {
    display: grid;
    grid-template-columns: 3.5em 1fr;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .line::before {
    counter-increment: line;
    content: counter(line);
    padding-right: 12px;
    margin-right: 12px;
    text-align: right;
    color: var(--muted);
    border-right: 1px solid var(--border);
    user-select: none;
  }
  .line:hover {
    background: var(--accent-soft);
  }
  /* Coloration produite par highlight.ts */
  .fm,
  .block {
    background: var(--surface);
  }
  .heading {
    font-weight: 700;
  }
  .quote {
    color: var(--muted);
    font-style: italic;
  }
  pre :global(.mark) {
    color: var(--accent);
  }
  pre :global(.key) {
    color: var(--info);
  }
  pre :global(.string),
  pre :global(.value) {
    color: var(--ok);
  }
  pre :global(.code) {
    color: var(--warn);
  }
  pre :global(.strong) {
    font-weight: 700;
  }
  pre :global(.import) {
    color: var(--info);
    text-decoration: underline dotted;
  }
  pre :global(.comment) {
    color: var(--muted);
    font-style: italic;
  }
</style>
