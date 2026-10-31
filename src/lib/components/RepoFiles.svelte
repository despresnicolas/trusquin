<script lang="ts">
  import { CLAUDE_FILE_LABELS } from '../core/analyze';
  import type { ClaudeFile, ClaudeFileGroup } from '../core/types';
  import { api } from '../history';
  import FileView from './FileView.svelte';

  let { path }: { path: string } = $props();
  let files = $state<ClaudeFile[] | null>(null);
  let failure = $state('');
  let selectedPath = $state('');
  const selected = $derived(files?.find((f) => f.path === selectedPath) ?? files?.[0]);
  const groups = Object.keys(CLAUDE_FILE_LABELS) as ClaudeFileGroup[];

  $effect(() => {
    api.files(path).then(
      (list) => (files = list),
      (e: Error) => (failure = e.message),
    );
  });
</script>

{#if failure}
  <p class="sev-error">{failure}</p>
{:else if !files}
  <p class="muted">Lecture du dépôt…</p>
{:else if !files.length}
  <p class="muted">Aucun fichier Claude Code (CLAUDE.md, .claude/…) dans ce dépôt.</p>
{:else}
  <div class="layout">
    <nav class="card">
      {#each groups as group}
        {@const list = files.filter((f) => f.group === group)}
        {#if list.length}
          <h4>{CLAUDE_FILE_LABELS[group]} <span class="muted">{list.length}</span></h4>
          {#each list as f (f.path)}
            <button class="ghost" class:active={f.path === selected?.path} onclick={() => (selectedPath = f.path)}>
              <code>{f.path}</code>
            </button>
          {/each}
        {/if}
      {/each}
    </nav>
    {#if selected}
      <article class="card">
        <header>
          <code class="path">{selected.path}</code>
          <span class="pill">{selected.content.split('\n').length} lignes</span>
        </header>
        <FileView path={selected.path} content={selected.content} />
      </article>
    {/if}
  </div>
{/if}

<style>
  .layout {
    display: grid;
    grid-template-columns: minmax(200px, 280px) minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }
  @media (max-width: 1000px) {
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
  header {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }
  .path {
    font-weight: 600;
  }
</style>
