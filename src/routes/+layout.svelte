<script lang="ts">
  import Settings from '#lib/components/Settings.svelte';
  import { i18n, t } from '#lib/i18n.svelte.ts';
  import { en } from '#lib/i18n/en.ts';
  import { fr } from '#lib/i18n/fr.ts';
  import { persist, store } from '#lib/state.svelte.ts';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { Events } from '@wailsio/runtime';
  import '../app.css';

  let { children } = $props();
  let settings: Settings;

  // macOS : la barre de titre est masquée (main.go), le haut de la colonne garde la place des boutons de fenêtre.
  const mac = navigator.userAgent.includes('Mac');

  /** Le parcours, dans l'ordre : choisir, noter un dépôt, écrire ses fichiers. Mêmes raccourcis que le menu Aller. */
  const SECTIONS = [
    { href: '/', label: 'nav.home', hint: 'nav.homeHint', key: '⌘1', icon: 'M4 11l8-7 8 7v9h-5v-6h-6v6H4z' },
    {
      href: '/analyze',
      label: 'nav.analyze',
      hint: 'nav.analyzeHint',
      key: '⌘2',
      icon: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M16 16l4 4',
    },
    {
      href: '/generator',
      label: 'nav.generator',
      hint: 'nav.generatorHint',
      key: '⌘3',
      icon: 'M6 4h9l4 4v12H6zM14 4v5h5M9 13h7M9 17h5',
    },
    {
      href: '/practices',
      label: 'nav.practices',
      hint: 'nav.practicesHint',
      key: '⌘4',
      icon: 'M5 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H5zM19 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z',
    },
    {
      href: '/reference',
      label: 'nav.reference',
      hint: 'nav.referenceHint',
      key: '⌘5',
      icon: 'M5 5h14M5 10h14M5 15h9M5 20h6',
    },
  ] as const;
  const hasErrors = $derived(store.errors > 0 && !store.empty);

  $effect(() => persist($state.snapshot(store.project)));
  $effect(() => {
    document.documentElement.lang = i18n.locale;
  });
  // Le nom par défaut, jamais modifié, suit la langue de l'interface (y compris pour un projet déjà enregistré).
  const DEFAULT_NAMES = [fr['common.defaultProject'], en['common.defaultProject']];
  $effect(() => {
    if (DEFAULT_NAMES.includes(store.project.name)) store.project.name = t('common.defaultProject');
  });
  // Menu « Aller » (menu.go, ⌘1 à ⌘5).
  $effect(() => Events.On('navigate', (e) => goto(String(e.data))));
</script>

<div class="app">
  <!-- Glisser la colonne déplace la fenêtre (runtime Wails) ; les liens restent cliquables. -->
  <aside class:mac>
    <nav aria-label={t('nav.label')}>
      {#each SECTIONS as s (s.href)}
        <a href={s.href} aria-current={page.url.pathname === s.href ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={s.icon} /></svg>
          <span class="text">
            <b>
              {t(s.label)}
              {#if s.href === '/generator' && hasErrors}<span class="dot" aria-label={t('nav.errors')}></span>{/if}
            </b>
            <small>{t(s.hint)}</small>
          </span>
          <kbd>{s.key}</kbd>
        </a>
      {/each}
    </nav>
    <button class="ghost settings" onclick={() => settings.show()}>
      <svg viewBox="0 0 24 24" aria-hidden="true"
        ><path
          d="M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"
        /></svg
      >
      <span class="text"><b>{t('settings.title')}</b></span>
      <kbd>⌘,</kbd>
    </button>
  </aside>

  <main>
    {@render children()}
  </main>
</div>
<Settings bind:this={settings} />

<style>
  .app {
    display: grid;
    grid-template-columns: 230px minmax(0, 1fr);
    min-height: 100vh;
  }
  aside {
    position: sticky;
    top: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    height: 100vh;
    padding: 16px 10px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    --wails-draggable: drag;
  }
  aside.mac {
    padding-top: 44px;
  }
  aside :global(:is(a, button)) {
    --wails-draggable: no-drag;
  }
  nav {
    display: grid;
    gap: 2px;
  }
  nav a,
  .settings {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 8px 10px;
    border-radius: 6px;
    color: var(--text);
    text-decoration: none;
    text-align: left;
  }
  nav a:hover,
  .settings:hover {
    background: var(--surface-2);
  }
  nav a[aria-current='page'] {
    background: var(--accent-soft);
    color: var(--accent);
  }
  .settings {
    width: 100%;
    margin-top: auto;
    border: 0;
  }
  svg {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .text {
    display: grid;
    flex: 1;
    line-height: 1.3;
  }
  small,
  kbd {
    color: var(--muted);
    font-family: inherit;
    font-size: 12px;
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
  main {
    min-width: 0;
    padding: 28px 24px 60px;
  }
  /* Fenêtre étroite : la colonne devient une barre en haut, sans sous-titres ni raccourcis. */
  @media (max-width: 760px) {
    .app {
      grid-template-columns: minmax(0, 1fr);
    }
    aside {
      position: static;
      flex-direction: row;
      height: auto;
      padding: 8px;
      border-right: 0;
      border-bottom: 1px solid var(--border);
    }
    aside.mac {
      padding: 8px 8px 8px 84px;
    }
    nav {
      display: flex;
      flex: 1;
    }
    small,
    kbd {
      display: none;
    }
    .settings {
      width: auto;
      margin: 0;
    }
  }
</style>
