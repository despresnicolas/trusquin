<script lang="ts">
  const KEY = 'sauron:theme';
  let open = $state(false);
  let root: HTMLElement;
  // Thème effectif : choix enregistré (posé par app.html avant le rendu), sinon celui du système.
  let dark = $state(
    (document.documentElement.dataset.theme ??
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark',
  );

  function setDark(value: boolean) {
    dark = value;
    const theme = value ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // stockage indisponible : le choix vaut pour la session
    }
  }
</script>

<svelte:window
  onclick={(e) => {
    if (open && !root.contains(e.target as Node)) open = false;
  }}
  onkeydown={(e) => {
    if (e.key === 'Escape') open = false;
  }}
/>

<div class="settings" bind:this={root}>
  <button
    class="icon"
    aria-label="Réglages"
    aria-expanded={open}
    aria-controls="settings-menu"
    onclick={() => (open = !open)}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true"
      ><!-- Icon from Material Design Light by Pictogrammers - https://github.com/Templarian/MaterialDesignLight/blob/master/LICENSE.md --><path
        fill="currentColor"
        d="m19.59 15.5l-1.82-1.3c.3-1.08.32-2.25 0-3.42l1.82-1.28L18.14 7l-2.03.92c-.79-.8-1.79-1.42-2.96-1.71L12.95 4h-2.9l-.2 2.21c-1.17.29-2.17.91-2.96 1.71L4.86 7L3.41 9.5l1.82 1.28c-.32 1.17-.3 2.34 0 3.42l-1.82 1.3L4.86 18l2.03-.93c.79.79 1.79 1.39 2.96 1.7l.2 2.23h2.9l.2-2.23c1.17-.31 2.17-.91 2.96-1.7l2.03.93zM13.5 3c.27 0 .5.2.5.46l.18 2.04c.76.28 1.44.69 2.05 1.18l1.85-.87c.23-.12.52-.04.66.19l2 3.5c.14.21.06.5-.16.65l-1.67 1.17c.13.8.12 1.59 0 2.36l1.67 1.17c.22.15.3.44.16.65l-2 3.5c-.14.21-.43.29-.66.17l-1.85-.86c-.61.49-1.29.89-2.05 1.19l-.18 2c0 .29-.23.5-.5.5h-4a.5.5 0 0 1-.5-.5l-.18-2c-.76-.3-1.44-.7-2.05-1.19l-1.85.86c-.23.12-.52.04-.66-.17l-2-3.5c-.14-.21-.06-.5.16-.65l1.67-1.17c-.12-.77-.13-1.56 0-2.36l-1.67-1.17c-.22-.15-.3-.44-.16-.65l2-3.5c.14-.23.43-.31.66-.19l1.85.87c.61-.49 1.29-.9 2.05-1.18L9 3.46c0-.26.23-.46.5-.46zm-2 6a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 8 12.5A3.5 3.5 0 0 1 11.5 9m0 1A2.5 2.5 0 0 0 9 12.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5"
      /></svg
    >
  </button>

  {#if open}
    <div id="settings-menu" class="menu" role="group" aria-label="Réglages">
      <div class="row">
        <span id="theme-label">Thème</span>
        <!-- Switch jour/nuit d'après Uiverse.io (JustCode14) : coché = clair. -->
        <label class="switch">
          <input
            type="checkbox"
            role="switch"
            aria-labelledby="theme-label"
            aria-describedby="theme-state"
            checked={!dark}
            onchange={(e) => setDark(!e.currentTarget.checked)}
          />
          <span class="slider">
            <span class="star star_1"></span>
            <span class="star star_2"></span>
            <span class="star star_3"></span>
            <svg viewBox="0 0 16 16" class="cloud" aria-hidden="true">
              <path
                transform="matrix(.77976 0 0 .78395-299.99-418.63)"
                d="m391.84 540.91c-.421-.329-.949-.524-1.523-.524-1.351 0-2.451 1.084-2.485 2.435-1.395.526-2.388 1.88-2.388 3.466 0 1.874 1.385 3.423 3.182 3.667v.034h12.73v-.006c1.775-.104 3.182-1.584 3.182-3.395 0-1.747-1.309-3.186-2.994-3.379.007-.106.011-.214.011-.322 0-2.707-2.271-4.901-5.072-4.901-2.073 0-3.856 1.202-4.643 2.925"
              ></path>
            </svg>
          </span>
        </label>
        <span id="theme-state" class="muted">{dark ? 'Sombre' : 'Clair'}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .settings {
    position: relative;
    margin-left: auto;
  }
  .icon {
    display: grid;
    place-items: center;
    padding: 6px;
    font-size: 22px;
    background: none;
    border: 0;
    border-radius: 6px;
    color: var(--muted);
    cursor: pointer;
  }
  .icon:hover,
  .icon[aria-expanded='true'] {
    background: var(--surface-2);
    color: var(--text);
  }
  .menu {
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    min-width: 220px;
    padding: 6px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 6px 24px rgb(0 0 0 / 0.18);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 8px;
    white-space: nowrap;
  }
  .row #theme-label {
    flex: 1;
  }
  .row .muted {
    width: 4em;
    font-size: 12px;
  }
  .switch {
    font-size: 14px;
    position: relative;
    display: inline-block;
    width: 4em;
    height: 2.2em;
    border-radius: 30px;
    box-shadow: 0 0 10px rgb(0 0 0 / 0.1);
  }
  .switch input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  .slider {
    position: absolute;
    inset: 0;
    cursor: pointer;
    background-color: var(--sky-night);
    transition: 0.4s;
    border-radius: 30px;
    overflow: hidden;
  }
  .slider::before {
    position: absolute;
    content: '';
    height: 1.2em;
    width: 1.2em;
    border-radius: 20px;
    left: 0.5em;
    bottom: 0.5em;
    transition: 0.4s;
    transition-timing-function: cubic-bezier(0.81, -0.04, 0.38, 1.5);
    box-shadow: inset 8px -4px 0 0 var(--sky-white);
  }
  .switch input:checked + .slider {
    background-color: var(--sky-day);
  }
  .switch input:checked + .slider::before {
    transform: translateX(1.8em);
    box-shadow: inset 15px -4px 0 15px var(--sky-sun);
  }
  .switch input:focus-visible + .slider {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .star {
    background-color: var(--sky-white);
    border-radius: 50%;
    position: absolute;
    width: 5px;
    height: 5px;
    transition: all 0.4s;
  }
  .star_1 {
    left: 2.5em;
    top: 0.5em;
  }
  .star_2 {
    left: 2.2em;
    top: 1.2em;
  }
  .star_3 {
    left: 3em;
    top: 0.9em;
  }
  .switch input:checked + .slider .star {
    opacity: 0;
  }
  .cloud {
    width: 3.5em;
    position: absolute;
    bottom: -1.4em;
    left: -1.1em;
    opacity: 0;
    transition: all 0.4s;
  }
  .cloud path {
    fill: var(--sky-white);
  }
  .switch input:checked + .slider .cloud {
    opacity: 1;
  }
</style>
