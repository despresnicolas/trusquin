<script lang="ts">
  import { store } from '../state.svelte';
  import Preview from './Preview.svelte';
  import RulesEditor from './RulesEditor.svelte';

  let { initial = '', view = 'rules' }: { initial?: string; view?: 'rules' | 'export' } = $props();
  const hasErrors = $derived(store.quality.issues.some((i) => i.severity === 'error'));
</script>

<nav class="views">
  <a href="/generator" aria-current={view === 'rules' ? 'page' : undefined}>Règles</a>
  <a href="/generator?view=export" aria-current={view === 'export' ? 'page' : undefined}>
    Aperçu & export
    {#if hasErrors}<span class="dot" aria-label="erreurs"></span>{/if}
  </a>
</nav>

{#if view === 'export'}
  <Preview files={store.files} quality={store.quality} />
{:else}
  {#key initial}
    <RulesEditor {initial} />
  {/key}
{/if}

<style>
  .views {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--border);
  }
  .views a {
    padding: 6px 12px;
    border-bottom: 2px solid transparent;
    color: var(--muted);
    text-decoration: none;
  }
  .views a[aria-current='page'] {
    border-bottom-color: var(--accent);
    color: var(--text);
  }
  .dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-left: 4px;
    border-radius: 50%;
    background: var(--err);
    vertical-align: middle;
  }
</style>
