<script lang="ts">
  import { goto } from '$app/navigation';
  import { importContext, importedPath, importRules } from '../core/analyze';
  import { newId, starterProject } from '../core/presets';
  import type { Project } from '../core/types';
  import { download, exportZip, zipName } from '../export';
  import { archive, store } from '../state.svelte';
  import ScoreBadge from './ScoreBadge.svelte';

  let notice = $state('');
  let resetting = $state(false);
  let confirmed = $state(false);
  const errors = $derived(store.quality.issues.filter((i) => i.severity === 'error').length);

  /** sauron.json remplace le projet ; les .md (CLAUDE.md, règles) et settings.json (hooks) ajoutent des règles. */
  async function importFiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const contents: Record<string, string> = {};
    for (const file of input.files ?? []) {
      const text = await file.text();
      if (file.name.endsWith('.json')) {
        try {
          const data = JSON.parse(text);
          if (Array.isArray(data.rules)) {
            store.project = { ...starterProject(), ...data } as Project;
            notice = `Projet chargé depuis ${file.name}.`;
            continue;
          }
        } catch {
          notice = `${file.name} n'est pas un JSON valide.`;
          continue;
        }
      }
      contents[importedPath(file.name)] = text;
    }
    input.value = '';
    const repo = { paths: Object.keys(contents), contents };
    if (!repo.paths.length) return;
    const rules = importRules(repo, newId);
    const context = importContext(repo);
    store.project.description ||= context.description;
    store.project.stack ||= context.stack;
    store.project.rules.push(...rules);
    notice = rules.length ? `${rules.length} règle(s) importée(s).` : 'Aucune règle trouvée dans ces fichiers.';
    if (rules.length) await goto(`/generator?rule=${rules[0].id}`);
  }

  async function save() {
    try {
      notice = `« ${(await archive()).name} » enregistré dans l'historique.`;
    } catch (e) {
      notice = `Non enregistré : ${(e as Error).message}`;
    }
  }

  async function exportCurrent() {
    download(zipName(store.project), await exportZip($state.snapshot(store.project), store.files, store.quality));
  }

  async function reset() {
    resetting = false;
    try {
      // Un projet sans règle n'a rien à garder.
      if (store.project.rules.length) await archive();
    } catch (e) {
      notice = `Projet non enregistré dans l'historique, rien n'est remplacé : ${(e as Error).message}`;
      return;
    }
    store.project = starterProject();
    notice = '';
    await goto('/generator?view=project');
  }
</script>

<div class="bar card">
  <b class="name">{store.project.name || 'Sans nom'}</b>
  <ScoreBadge score={store.quality.score} />
  <span class="spacer"></span>
  <button onclick={() => (resetting = true)}>Nouveau projet</button>
  <label class="file"
    >Importer (.md, .json)<input type="file" accept=".md,.json" multiple onchange={importFiles} /></label
  >
  <button onclick={save}>Enregistrer</button>
  {#if errors && !confirmed}
    <button class="sev-error" onclick={() => (confirmed = true)}>{errors} erreur(s) · exporter quand même…</button>
  {:else}
    <button class="primary" onclick={exportCurrent}>Exporter le zip</button>
  {/if}
</div>

{#if resetting}
  <div class="card confirm" role="alert">
    <span>Le projet en cours sera enregistré dans l'historique puis remplacé.</span>
    <button class="primary" onclick={reset}>Nouveau projet</button>
    <button class="ghost" onclick={() => (resetting = false)}>Annuler</button>
  </div>
{/if}
{#if notice}<p class="muted notice">{notice}</p>{/if}

<style>
  .bar,
  .confirm {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    padding: 10px 14px;
  }
  .confirm {
    margin-top: 8px;
  }
  .name {
    font-size: 16px;
  }
  .spacer {
    flex: 1;
  }
  .file {
    display: block;
    border: 1px dashed var(--border);
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    color: var(--text);
    font-size: 14px;
  }
  .file input {
    display: none;
  }
  .notice {
    margin: 8px 2px 0;
  }
</style>
