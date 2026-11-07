<script lang="ts">
  import Settings from '#lib/components/Settings.svelte';
  import { persist, store } from '#lib/state.svelte.ts';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { Events } from '@wailsio/runtime';
  import '../app.css';

  let { children } = $props();

  const tabs = [
    { href: '/', label: 'Accueil' },
    { href: '/analyze', label: 'Analyse de dépôt' },
    { href: '/generator', label: 'Générateur' },
  ];
  const hasErrors = $derived(store.errors > 0 && !store.empty);

  $effect(() => persist($state.snapshot(store.project)));
  // Menu « Aller » de la barre macOS (menu.go).
  $effect(() => Events.On('navigate', (e) => goto(String(e.data))));
</script>

<header>
  <div class="brand">
    <a href="/"><strong>SAURON</strong></a>
  </div>
  <nav>
    {#each tabs as t}
      <a href={t.href} class:active={page.url.pathname === t.href}>
        {t.label}
        {#if t.href === '/generator' && hasErrors}<span class="dot" aria-label="erreurs"></span>{/if}
      </a>
    {/each}
  </nav>
  <Settings />
</header>

<main>
  {@render children()}
</main>

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 10px 20px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  .brand {
    display: grid;
    line-height: 1.2;
  }
  .brand a {
    color: inherit;
    text-decoration: none;
  }
  nav {
    display: flex;
    gap: 2px;
    flex: 1;
    flex-wrap: wrap;
  }
  a {
    color: inherit;
    text-decoration: none;
  }
  nav a {
    padding: 6px 12px;
    border-radius: 6px;
  }
  nav a:hover {
    background: var(--surface-2);
  }
  nav a.active {
    background: var(--accent-soft);
    color: var(--accent);
  }
  .dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--err);
    margin-left: 4px;
    vertical-align: middle;
  }
  main {
    padding: 20px 20px 60px;
  }
</style>
