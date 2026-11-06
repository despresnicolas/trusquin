<script lang="ts">
  import type { RepoSummary } from '#lib/history.ts';
  import ScoreBadge from './ScoreBadge.svelte';

  let { repos, onclose }: { repos: RepoSummary[]; onclose: () => void } = $props();
  let dialog: HTMLDialogElement;

  $effect(() => {
    dialog.showModal();
  });
</script>

<dialog bind:this={dialog} {onclose} aria-labelledby="chooser-title">
  <header>
    <h3 id="chooser-title">Quel dépôt ?</h3>
    <button class="ghost" aria-label="Fermer" onclick={() => dialog.close()}>×</button>
  </header>
  <p class="muted">Ouvre les propositions de la dernière analyse du dépôt choisi.</p>
  <ul>
    {#each repos as r (r.last.path)}
      <li>
        <a href="/analyze?path={encodeURIComponent(r.last.path)}&view=proposals" onclick={() => dialog.close()}>
          <span class="name"><b>{r.last.name}</b><ScoreBadge score={r.last.score} label={r.last.grade} /></span>
          <span class="muted path">{r.last.path}</span>
        </a>
      </li>
    {/each}
  </ul>
</dialog>

<style>
  dialog {
    width: min(520px, calc(100vw - 32px));
    padding: 16px 20px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--text);
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.4);
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h3 {
    margin: 0;
  }
  ul {
    display: grid;
    gap: 6px;
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
  }
  a {
    display: grid;
    gap: 2px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    color: inherit;
    text-decoration: none;
  }
  a:hover,
  a:focus-visible {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .name {
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
</style>
