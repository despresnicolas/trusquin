<script lang="ts">
  import { Events } from '@wailsio/runtime';

  type Theme = 'light' | 'dark' | 'system';
  type Lang = 'system' | 'fr' | 'en';
  const THEME_KEY = 'sauron:theme';
  const LANG_KEY = 'sauron:lang';
  const THEMES: { id: Theme; label: string }[] = [
    { id: 'light', label: 'Clair' },
    { id: 'dark', label: 'Sombre' },
    { id: 'system', label: 'Système' },
  ];

  // Catégories de la colonne de gauche ; l'icône est un tracé SVG 24×24 au trait.
  const CATEGORIES = [
    { id: 'appearance', label: 'Apparence', icon: 'M14 4l6 6-9 9H5v-6zM11 7l6 6' },
    {
      id: 'language',
      label: 'Langue',
      icon: 'M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18',
    },
  ] as const;

  let dialog: HTMLDialogElement;
  let category = $state<(typeof CATEGORIES)[number]['id']>('appearance');
  // Choix enregistrés ; le thème est posé par app.html avant le rendu.
  let theme = $state<Theme>(read(THEME_KEY, ['light', 'dark'], 'system'));
  let lang = $state<Lang>(read(LANG_KEY, ['fr', 'en'], 'system'));
  // Choix en cours dans le dialogue : le thème s'applique à la volée, « Enregistrer » le conserve.
  let draftTheme = $state<Theme>('system');
  let draftLang = $state<Lang>('system');

  function read<T extends string>(key: string, allowed: string[], fallback: T): T {
    try {
      const value = localStorage.getItem(key);
      return value && allowed.includes(value) ? (value as T) : fallback;
    } catch {
      return fallback;
    }
  }

  function store(key: string, value: string) {
    try {
      if (value === 'system') localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // stockage indisponible : le choix vaut pour la session
    }
  }

  function show() {
    draftTheme = theme;
    draftLang = lang;
    dialog.showModal();
  }

  function apply(value: Theme) {
    if (value === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = value;
  }

  function save() {
    theme = draftTheme;
    lang = draftLang;
    store(THEME_KEY, theme);
    store(LANG_KEY, lang);
    dialog.close();
  }

  // « Réglages… » (⌘,) du menu SAURON (menu.go).
  $effect(() => Events.On('settings', show));
</script>

<!-- Échap, Annuler ou un clic à côté ferme sans rien conserver : le thème enregistré revient. -->
<dialog
  bind:this={dialog}
  onclose={() => apply(theme)}
  aria-labelledby="settings-title"
  onclick={(e) => {
    // Le fond (::backdrop) renvoie aussi le dialogue comme cible : on ferme seulement hors du cadre.
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  }}
>
  <header>
    <h3 id="settings-title">Réglages</h3>
    <button class="ghost" aria-label="Fermer" onclick={() => dialog.close()}>×</button>
  </header>

  <div class="layout">
    <nav aria-label="Catégories">
      {#each CATEGORIES as c (c.id)}
        <button class="ghost" aria-current={category === c.id ? 'page' : undefined} onclick={() => (category = c.id)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={c.icon} /></svg>
          {c.label}
        </button>
      {/each}
    </nav>

    {#if category === 'appearance'}
      <section>
        <h4 id="theme-title">Thème</h4>
        <div class="themes" role="radiogroup" aria-labelledby="theme-title">
          {#each THEMES as t (t.id)}
            <label class="theme" class:selected={draftTheme === t.id}>
              <!-- Aperçu façon diff : color-scheme fait résoudre les variables light-dark() d'app.css dans le thème montré ;
               « Système » superpose le sombre sur la moitié droite. -->
              <span class="preview" aria-hidden="true">
                {#each t.id === 'system' ? ['light', 'dark'] : [t.id] as scheme (scheme)}
                  <span class="screen {scheme}" style="color-scheme: {scheme}">
                    <span class="bar">
                      {#each [1, 2, 3] as n (n)}<span class="tab"></span>{/each}
                    </span>
                    <span class="side">
                      <span class="line"></span>
                      <span class="line"></span>
                      <span class="line"></span>
                      <span class="foot">
                        <span class="field"></span>
                        <span class="field"></span>
                        <span class="button"></span>
                      </span>
                    </span>
                    <span class="main">
                      <span class="band add"
                        ><span class="line" style="width: 40%"></span><span class="line" style="width: 70%"
                        ></span></span
                      >
                      <span class="band del"
                        ><span class="line" style="width: 30%"></span><span class="line" style="width: 50%"
                        ></span></span
                      >
                    </span>
                  </span>
                {/each}
              </span>
              <span class="choice">
                <input
                  type="radio"
                  name="theme"
                  value={t.id}
                  bind:group={draftTheme}
                  onchange={() => apply(draftTheme)}
                />
                {t.label}
              </span>
            </label>
          {/each}
        </div>
      </section>
    {:else}
      <section>
        <label class="lang"
          ><span>Langue de l'interface</span>
          <select bind:value={draftLang}>
            <option value="system">Système</option>
            <option value="fr">Français</option>
            <option value="en" disabled>English (bientôt)</option>
          </select>
        </label>
        <p class="muted">« Système » suit la langue de macOS. L'interface n'existe pour l'instant qu'en français.</p>
      </section>
    {/if}
  </div>

  <footer>
    <button onclick={() => dialog.close()}>Annuler</button>
    <button class="primary" onclick={save}>Enregistrer</button>
  </footer>
</dialog>

<style>
  dialog {
    width: min(820px, calc(100vw - 32px));
    padding: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 6px 24px rgb(0 0 0 / 0.18);
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.3);
  }
  header,
  footer {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 12px 20px;
  }
  header {
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
  }
  footer {
    justify-content: flex-end;
    border-top: 1px solid var(--border);
  }
  footer button {
    min-width: 110px;
  }
  h3,
  h4 {
    margin: 0;
  }
  .layout {
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr);
    min-height: 360px;
  }
  nav {
    display: grid;
    align-content: start;
    gap: 4px;
    padding: 16px 12px;
    border-right: 1px solid var(--border);
  }
  nav button {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 8px 12px;
    text-align: left;
    font-size: 15px;
  }
  nav button[aria-current='page'] {
    background: var(--accent);
    color: var(--on-accent);
  }
  nav svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  section {
    display: grid;
    align-content: start;
    gap: 12px;
    padding: 20px 24px;
  }
  section p {
    margin: 0;
  }
  .themes {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .theme {
    display: grid;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-size: 14px;
    cursor: pointer;
  }
  .theme.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }
  .theme:has(input:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .preview {
    position: relative;
    display: block;
    height: 96px;
    border-bottom: 1px solid var(--border);
  }
  .screen {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template: 14px 1fr / 30% 1fr;
    background: var(--bg);
  }
  .screen.dark:not(:first-child) {
    clip-path: inset(0 0 0 50%);
  }
  .bar {
    grid-column: 1 / -1;
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 0 6px;
    background: var(--surface-2);
    border-bottom: 1px solid var(--border);
  }
  .tab {
    width: 22px;
    height: 3px;
    border-radius: 2px;
    background: var(--muted);
    opacity: 0.6;
  }
  .tab::before {
    content: '';
    display: block;
    width: 3px;
    height: 3px;
    margin-left: -6px;
    border-radius: 50%;
    background: inherit;
  }
  .side {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 5px 4px 4px;
    background: var(--surface);
    border-right: 1px solid var(--border);
  }
  .side .line {
    height: 3px;
    border-radius: 2px;
    background: var(--muted);
    opacity: 0.5;
  }
  .foot {
    display: grid;
    gap: 3px;
    margin-top: auto;
  }
  .field {
    height: 6px;
    border: 1px solid var(--border);
    border-radius: 2px;
    background: var(--bg);
  }
  .button {
    height: 4px;
    border-radius: 2px;
    background: var(--accent);
  }
  .main {
    display: flex;
    flex-direction: column;
  }
  .band {
    display: grid;
    gap: 4px;
    padding: 4px 6px;
  }
  .band .line {
    height: 4px;
    border-radius: 2px;
  }
  .add {
    background: color-mix(in srgb, var(--ok) 18%, var(--bg));
  }
  .add .line {
    background: var(--ok);
  }
  .del {
    background: color-mix(in srgb, var(--err) 18%, var(--bg));
  }
  .del .line {
    background: var(--err);
  }
  .choice {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
    font-size: 15px;
  }
  .choice input {
    width: auto;
    margin: 0;
    accent-color: var(--accent);
  }
  .lang {
    font-size: 14px;
    color: var(--text);
  }
</style>
