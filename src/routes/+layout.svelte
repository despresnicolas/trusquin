<script lang="ts">
  import Settings from '#lib/components/Settings.svelte';
  import { persist, store } from '#lib/state.svelte.ts';
  import { goto } from '$app/navigation';
  import { Events } from '@wailsio/runtime';
  import '../app.css';

  let { children } = $props();

  // macOS : la barre de titre est masquée (main.go), une bande garde la place des boutons de fenêtre.
  const mac = navigator.userAgent.includes('Mac');

  $effect(() => persist($state.snapshot(store.project)));
  // Navigation par le menu « Aller » (menu.go, ⌘1 à ⌘3) : pas d'onglets dans la fenêtre.
  $effect(() => Events.On('navigate', (e) => goto(String(e.data))));
</script>

<!-- macOS : bande vide sous les boutons de fenêtre ; la glisser déplace la fenêtre (runtime Wails). -->
{#if mac}<header></header>{/if}
<Settings />

<main>
  {@render children()}
</main>

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 2;
    height: 28px;
    background: var(--bg);
    --wails-draggable: drag;
  }
  main {
    padding: 20px 20px 60px;
  }
</style>
