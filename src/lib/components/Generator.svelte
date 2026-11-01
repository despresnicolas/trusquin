<script lang="ts">
  import { store } from '../state.svelte';
  import Preview from './Preview.svelte';
  import ProjectBar from './ProjectBar.svelte';
  import ProjectForm from './ProjectForm.svelte';
  import ProjectHistory from './ProjectHistory.svelte';
  import RulesEditor from './RulesEditor.svelte';

  let { initial = '', view = 'rules' }: { initial?: string; view?: 'project' | 'rules' | 'export' | 'history' } =
    $props();
  const hasErrors = $derived(store.quality.issues.some((i) => i.severity === 'error'));
</script>

<ProjectBar />

<nav class="views">
  <a href="/generator?view=project" aria-current={view === 'project' ? 'page' : undefined}>Projet</a>
  <a href="/generator" aria-current={view === 'rules' ? 'page' : undefined}>
    Règles <span class="muted">{store.project.rules.length}</span>
  </a>
  <a href="/generator?view=export" aria-current={view === 'export' ? 'page' : undefined}>
    Aperçu & export
    {#if hasErrors}<span class="dot" aria-label="erreurs"></span>{/if}
  </a>
  <a href="/generator?view=history" aria-current={view === 'history' ? 'page' : undefined}>Historique</a>
</nav>

{#if view === 'export'}
  <Preview files={store.files} quality={store.quality} />
{:else if view === 'project'}
  <ProjectForm />
{:else if view === 'history'}
  <ProjectHistory />
{:else}
  {#key initial}
    <RulesEditor {initial} />
  {/key}
{/if}

<style>
  .views {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 16px 0;
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
