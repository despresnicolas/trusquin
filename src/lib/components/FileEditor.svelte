<script lang="ts">
  import { lintMemoryText } from '#lib/core/quality.ts';
  import { api } from '#lib/history.ts';
  import { untrack } from 'svelte';

  let {
    root,
    path,
    content,
    onsaved,
    onclose,
  }: { root: string; path: string; content: string; onsaved: () => void; onclose: () => void } = $props();

  let text = $state(untrack(() => content));
  let failure = $state('');
  let saving = $state(false);
  // shortcut: seuls les .md sont contrôlés (comme l'analyse de la mémoire), ajouter lintSkill si on édite des skills.
  const issues = $derived(
    path.endsWith('.md') ? lintMemoryText(path, text, path === 'CLAUDE.md' || path === 'AGENTS.md') : [],
  );
  const changed = $derived(text !== content);
  let dialog: HTMLDialogElement;

  $effect(() => {
    dialog.showModal();
  });

  async function save() {
    saving = true;
    failure = '';
    try {
      await api.writeRepoFile(root, path, text);
      onsaved();
      dialog.close();
    } catch (e) {
      failure = (e as Error).message;
    } finally {
      saving = false;
    }
  }
</script>

<dialog bind:this={dialog} {onclose} aria-labelledby="editor-title">
  <header>
    <h3 id="editor-title"><code>{path}</code> <span class="muted">{content ? 'modifier' : 'créer'}</span></h3>
    <button class="ghost" aria-label="Fermer" onclick={() => dialog.close()}>×</button>
  </header>

  <div class="layout">
    <textarea bind:value={text} rows="22" spellcheck="false" aria-label="Contenu de {path}"></textarea>

    <aside>
      <h4>Assistance</h4>
      {#if issues.length}
        <ul class="issues" aria-live="polite">
          {#each issues as i, n (n)}
            <li>
              <b class="sev-{i.severity}">{i.message}</b>
              <span>{i.fix}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="sev-ok" aria-live="polite">✓ Aucun défaut détecté.</p>
      {/if}
      <h4>Une bonne consigne</h4>
      <ul class="tips">
        <li><b>Vérifiable</b> : une commande, un seuil, un chemin. « Test à côté du code : foo.ts → foo.test.ts ».</li>
        <li><b>En positif</b> : dire quoi faire plutôt qu’interdire seulement.</li>
        <li><b>Un exemple</b> : « suivre <code>src/…</code> » vaut mieux qu’une description de style.</li>
        <li><b>Test de suppression</b> : sans cette ligne, Claude se tromperait-il ? Sinon, la retirer.</li>
      </ul>
    </aside>
  </div>

  {#if failure}<p class="sev-error">{failure}</p>{/if}
  <footer>
    <span class="muted">Écrit dans {root}/{path}, puis le dépôt est ré-analysé.</span>
    <button class="ghost" onclick={() => dialog.close()}>Annuler</button>
    <button class="primary" onclick={save} disabled={saving || !changed || !text.trim()}
      >Enregistrer dans le dépôt</button
    >
  </footer>
</dialog>

<style>
  dialog {
    width: min(1100px, calc(100vw - 32px));
    max-height: calc(100vh - 32px);
    padding: 16px 20px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--text);
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.4);
  }
  header,
  footer {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
  }
  footer {
    margin-top: 12px;
  }
  footer .muted {
    flex: 1;
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  h3 {
    margin: 0;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
    gap: 16px;
    margin-top: 12px;
  }
  @media (max-width: 800px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  h4 {
    margin: 0 0 6px;
  }
  aside ul {
    display: grid;
    gap: 8px;
    margin: 0 0 16px;
    padding-left: 18px;
    font-size: 13px;
  }
  .issues li {
    display: grid;
    gap: 2px;
  }
  .sev-ok {
    color: var(--ok);
  }
</style>
