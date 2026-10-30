<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { persist, store } from '#lib/state.svelte.ts';

  let { children } = $props();

  const tabs = [
    { href: '/', label: 'Analyse projet' },
    { href: '/rules', label: 'Règles' },
    { href: '/preview', label: 'Aperçu & export' },
    { href: '/guide', label: 'Où mettre quoi ?' },
  ];
  const hasErrors = $derived(store.quality.issues.some((i) => i.severity === 'error'));

  $effect(() => persist($state.snapshot(store.project)));
</script>

<header>
  <div class="brand">
    <strong>SAURON</strong>
    <span class="muted">règles → bons fichiers, au bon endroit</span>
  </div>
  <nav>
    {#each tabs as t}
      <a href={t.href} class:active={page.url.pathname === t.href}>
        {t.label}
        {#if t.href === '/' && hasErrors}<span class="dot" aria-label="erreurs"></span>{/if}
      </a>
    {/each}
  </nav>
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
  .brand span {
    font-size: 12px;
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
    max-width: 1280px;
    margin: 0 auto;
    padding: 20px 16px 60px;
  }
</style>
