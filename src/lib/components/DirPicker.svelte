<script lang="ts">
  import { api, type DirListing } from '#lib/history.ts';

  let { start = '', onpick }: { start?: string; onpick: (path: string) => void } = $props();

  let dialog: HTMLDialogElement;
  let listing = $state<DirListing | null>(null);
  let loading = $state(false);
  let failure = $state('');

  async function go(path?: string) {
    loading = true;
    failure = '';
    try {
      listing = await api.dirs(path);
    } catch (e) {
      failure = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  export function open() {
    dialog.showModal();
    // Chemin saisi invalide : repartir du dossier par défaut du serveur.
    go(start.trim() || undefined).then(() => {
      if (failure && start.trim()) go();
    });
  }

  function pick(path: string) {
    dialog.close();
    onpick(path);
  }
</script>

<dialog bind:this={dialog} aria-label="Choisir un dossier">
  <header>
    <h3>Ajouter un projet</h3>
    <button type="button" onclick={() => dialog.close()} aria-label="Fermer">✕</button>
  </header>

  {#if listing}
    <div class="current">
      <button type="button" disabled={!listing.parent || loading} onclick={() => go(listing!.parent!)}>
        ↑ Parent
      </button>
      <code title={listing.path}>{listing.path}</code>
      {#if listing.isRepo}<span class="tag">git</span>{/if}
    </div>
  {/if}

  {#if failure}<p class="sev-error">{failure}</p>{/if}

  <ul>
    {#each listing?.dirs ?? [] as d (d.path)}
      <li>
        <button type="button" class="dir" onclick={() => go(d.path)} ondblclick={() => pick(d.path)}>
          <span>📁 {d.name}</span>
          {#if d.isRepo}<span class="tag">git</span>{/if}
        </button>
      </li>
    {:else}
      {#if listing && !loading}<li class="muted empty">Aucun sous-dossier.</li>{/if}
    {/each}
  </ul>

  <footer>
    <span class="muted">Clic : ouvrir · double-clic : ajouter</span>
    <button type="button" onclick={() => dialog.close()}>Annuler</button>
    <button type="button" class="primary" disabled={!listing || loading} onclick={() => pick(listing!.path)}>
      Ajouter ce dossier
    </button>
  </footer>
</dialog>

<style>
  dialog {
    width: min(640px, calc(100vw - 32px));
    max-height: min(640px, calc(100vh - 32px));
    padding: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    color: inherit;
  }
  dialog[open] {
    display: flex;
    flex-direction: column;
  }
  dialog::backdrop {
    background: color-mix(in srgb, var(--bg) 70%, transparent);
  }
  header,
  footer,
  .current {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 10px 14px;
  }
  header {
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
  }
  header h3 {
    margin: 0;
    font-size: 15px;
  }
  .current code {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  p {
    margin: 0 14px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0 14px;
    overflow-y: auto;
    flex: 1;
    min-height: 120px;
  }
  .dir {
    display: flex;
    justify-content: space-between;
    width: 100%;
    text-align: left;
    border: none;
    background: none;
    padding: 6px 8px;
  }
  .dir:hover {
    background: var(--surface-2);
  }
  .empty {
    padding: 6px 8px;
  }
  .tag {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 4px;
    background: var(--accent-soft);
    color: var(--accent);
  }
  footer {
    justify-content: flex-end;
    border-top: 1px solid var(--border);
  }
  footer .muted {
    flex: 1;
    font-size: 12px;
  }
</style>
