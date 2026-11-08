<script lang="ts">
  import { countInstructions } from '#lib/core/quality.ts';
  import type { GeneratedFile, Loading, QualityReport } from '#lib/core/types.ts';
  import { api } from '#lib/history.ts';
  import { issueText, t } from '#lib/i18n.svelte.ts';
  import FileView from './FileView.svelte';
  import ScoreBadge from './ScoreBadge.svelte';

  let { files, quality }: { files: GeneratedFile[]; quality: QualityReport } = $props();

  let selectedPath = $state('CLAUDE.md');
  const selected = $derived(files.find((f) => f.path === selectedPath) ?? files[0]);
  const errors = $derived(quality.issues.filter((i) => i.severity === 'error'));
  const order: Loading[] = ['always', 'on-path', 'on-demand', 'deterministic', 'personal'];
  const fileIssues = $derived(quality.issues.filter((i) => i.file === selected?.path));
</script>

<div class="bar card">
  <ScoreBadge score={quality.score} />
  <span
    ><b>{files.length}</b>
    {t('preview.files')} · <b>{quality.alwaysLoadedInstructions}</b>
    {t('preview.alwaysLoaded')}</span
  >
  {#if errors.length}<span class="sev-error">{t('preview.errors', { n: errors.length })}</span>{/if}
</div>
<p class="muted hint">
  {t('preview.hintZip')} <code>_trusquin-report.md</code>
  {t('preview.hintReport')} <code>~/</code>
  {t('preview.hintHome')} <code>_home/</code>.
</p>

<div class="layout">
  <nav class="card">
    {#each order as loading}
      {@const group = files.filter((f) => f.loading === loading)}
      {#if group.length}
        <h4>{t(`loading.${loading}`)}</h4>
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
        <span class="pill">{t(`loading.${selected.loading}`)}</span>
        <span class="pill">{t('preview.lines', { n: selected.content.split('\n').length - 1 })}</span>
        {#if !selected.path.endsWith('.json')}<span class="pill"
            >{t('preview.instructions', { n: countInstructions(selected.content) })}</span
          >{/if}
        <span class="spacer"></span>
        <button onclick={() => api.copy(selected.content)}>{t('preview.copy')}</button>
      </header>
      <p class="muted">{selected.explanation}</p>
      {#each fileIssues as i}{@const text = issueText(i)}
        <p class="sev-{i.severity}">
          {text.message} <span class="muted">→ {text.fix}</span>
        </p>{/each}
      <FileView path={selected.path} content={selected.content} />
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
    grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 800px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
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
</style>
