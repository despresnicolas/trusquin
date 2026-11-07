<script lang="ts">
  import { generate } from '#lib/core/placement.ts';
  import { newRule, starterProject, type Template } from '#lib/core/presets.ts';
  import { checkProject } from '#lib/core/quality.ts';
  import type { Criterion, Rule } from '#lib/core/types.ts';
  import { api } from '#lib/history.ts';
  import RuleForm from './RuleForm.svelte';
  import { untrack } from 'svelte';

  let {
    criterion,
    template,
    root,
    existing,
    onadd,
    onsaved,
    onclose,
  }: {
    criterion: Criterion;
    template: Template;
    root: string;
    existing: string[];
    onadd: (rule: Rule) => void;
    onsaved: () => void;
    onclose: () => void;
  } = $props();

  // Copie éditable du modèle : rien n'est envoyé tant que l'utilisateur ne valide pas.
  let rule = $state(newRule(untrack(() => template.rule)));
  const project = $derived({ ...starterProject(), permissions: { allow: [], deny: [] }, rules: [rule] });
  const files = $derived(generate(project));
  const issues = $derived(checkProject(project, files).issues.filter((i) => i.ruleId === rule.id));
  // Fichiers que produit cette règle : écrits tels quels seulement s'ils n'existent pas (sinon on écraserait le reste du fichier).
  const own = $derived(files.filter((f) => f.sources.includes(rule.id)));
  const clashes = $derived(own.filter((f) => existing.includes(f.path)).map((f) => f.path));
  let failure = $state('');
  let dialog: HTMLDialogElement;

  async function write() {
    failure = '';
    try {
      for (const f of own) await api.writeRepoFile(root, f.path, f.content);
      onsaved();
      dialog.close();
    } catch (e) {
      failure = (e as Error).message;
    }
  }

  $effect(() => {
    dialog.showModal();
  });
</script>

<dialog bind:this={dialog} {onclose} aria-labelledby="draft-title">
  <header>
    <h3 id="draft-title">{criterion.label}</h3>
    <button class="ghost" aria-label="Fermer" onclick={() => dialog.close()}>×</button>
  </header>
  <p class="muted">{criterion.detail} → {criterion.fix}</p>
  <p class="hint">Modèle « {template.label} » : {template.hint} Adapter le contenu au dépôt avant de l'ajouter.</p>

  <RuleForm {rule} {files} {issues} onremove={() => dialog.close()} />

  {#if failure}<p class="sev-error">{failure}</p>{/if}
  <footer>
    {#if clashes.length}
      <span class="muted">{clashes.join(', ')} existe déjà : passer par les fichiers Claude pour le compléter.</span>
    {/if}
    <button class="ghost" onclick={() => dialog.close()}>Annuler</button>
    <button
      onclick={() => {
        onadd($state.snapshot(rule));
        dialog.close();
      }}>Ajouter aux fichiers Claude</button
    >
    <button
      class="primary"
      onclick={write}
      disabled={!own.length || clashes.length > 0}
      title={own.map((f) => f.path).join(', ')}>Créer dans le dépôt</button
    >
  </footer>
</dialog>

<style>
  dialog {
    width: min(900px, calc(100vw - 32px));
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
    justify-content: flex-end;
    margin-top: 12px;
  }
  footer .muted {
    flex: 1;
    font-size: 12px;
  }
  h3 {
    margin: 0;
  }
  .hint {
    font-size: 13px;
    color: var(--accent);
  }
</style>
