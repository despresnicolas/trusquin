<script lang="ts">
  import { goto } from '$app/navigation';
  import { importContext, importedPath, importRules } from '#lib/core/analyze.ts';
  import { newId, starterProject } from '#lib/core/presets.ts';
  import { exportZip, zipName } from '#lib/export.ts';
  import { api } from '#lib/history.ts';
  import { archive, store } from '#lib/state.svelte.ts';
  import Hint from './Hint.svelte';
  import ScoreBadge from './ScoreBadge.svelte';

  let notice = $state('');
  let resetting = $state(false);
  const errors = $derived(store.errors);
  // Ce qui bloque l'export, avec la règle concernée quand il y en a une.
  const blocking = $derived(store.quality.issues.filter((i) => i.severity === 'error'));
  const titleOf = (id: string) => store.project.rules.find((r) => r.id === id)?.title || 'Sans titre';

  /** Les .md (CLAUDE.md, règles) et settings.json (hooks) ajoutent des règles au projet en cours. */
  async function importFiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const contents: Record<string, string> = {};
    for (const file of input.files ?? []) {
      contents[importedPath(file.name)] = await file.text();
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
    await api.saveFile(zipName(store.project), await exportZip(store.files, store.quality));
  }

  async function reset() {
    resetting = false;
    try {
      // Avec des erreurs bloquantes (dont « aucune règle »), rien n'est enregistré.
      if (!errors) await archive();
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
  {#if store.empty}<span class="pill">à démarrer</span>{:else}<ScoreBadge score={store.quality.score} />{/if}
  <span class="spacer"></span>
  <button onclick={() => (resetting = true)}>Nouveau projet</button>
  <Hint
    text="Repart d'un projet vide. Le projet en cours est enregistré dans l'historique, sauf s'il a des erreurs bloquantes."
  />
  <label class="file"
    >Importer (.md, settings.json)<input type="file" accept=".md,.json" multiple onchange={importFiles} /></label
  >
  <Hint
    text="CLAUDE.md / AGENTS.md : une règle par section ##. Un autre .md devient une règle .claude/rules/. settings.json : ses hooks. Les règles s'ajoutent au projet en cours."
  />
  <button
    onclick={save}
    disabled={errors > 0}
    title={errors ? `${errors} erreur(s) bloquante(s) à corriger avant d'enregistrer` : undefined}>Enregistrer</button
  >
  <Hint
    text="Ajoute une version dans l'onglet Historique (en base). Rien n'est ajouté si rien n'a changé ; refusé tant qu'il reste des erreurs bloquantes."
  />
  <button
    class="primary"
    onclick={exportCurrent}
    disabled={errors > 0}
    title={errors ? 'Export possible une fois les points ci-dessous réglés' : undefined}>Exporter le zip</button
  >
  <Hint
    text="Fichiers prêts à décompresser à la racine du dépôt, plus un rapport de qualité. Disponible quand il ne reste aucune erreur bloquante."
  />
</div>

{#if resetting}
  <div class="card confirm" role="alert">
    {#if store.empty}
      <span>Le projet en cours est vide : rien à enregistrer.</span>
    {:else if errors}
      <span class="sev-error"
        >Le projet en cours a {errors} erreur(s) bloquante(s) : il ne sera pas enregistré et sera perdu.</span
      >
    {:else}
      <span>Le projet en cours sera enregistré dans l'historique puis remplacé.</span>
    {/if}
    <button class="primary" onclick={reset}>Nouveau projet</button>
    <button class="ghost" onclick={() => (resetting = false)}>Annuler</button>
  </div>
{/if}
{#if store.empty}
  <p class="card todo">
    Projet vide : ajoute une première règle pour pouvoir exporter.
    <a href="/generator?view=guide">Choisir un élément avec le guide</a> ou importer un CLAUDE.md existant.
  </p>
{:else if blocking.length}
  <div class="card todo" role="status">
    <b>Pour exporter, il reste {blocking.length} point{blocking.length > 1 ? 's' : ''} à régler :</b>
    <ul>
      {#each blocking as i, n (n)}
        <li>
          {i.message} <span class="muted">→ {i.fix}</span>
          {#if i.ruleId}<a href="/generator?rule={i.ruleId}">Ouvrir « {titleOf(i.ruleId)} »</a>{/if}
        </li>
      {/each}
    </ul>
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
  .todo {
    margin-top: 8px;
    padding: 10px 14px;
  }
  .todo ul {
    margin: 4px 0 0;
    padding-left: 20px;
  }
  .notice {
    margin: 8px 2px 0;
  }
</style>
