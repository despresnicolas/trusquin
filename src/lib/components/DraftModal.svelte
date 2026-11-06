<script lang="ts">
  import { generate } from '#lib/core/placement.ts';
  import { newRule, starterProject, type Template } from '#lib/core/presets.ts';
  import { checkProject } from '#lib/core/quality.ts';
  import type { Criterion, Rule } from '#lib/core/types.ts';
  import RuleForm from './RuleForm.svelte';
  import { untrack } from 'svelte';

  let {
    criterion,
    template,
    onadd,
    onclose,
  }: { criterion: Criterion; template: Template; onadd: (rule: Rule) => void; onclose: () => void } = $props();

  // Copie éditable du modèle : rien n'est envoyé tant que l'utilisateur ne valide pas.
  let rule = $state(newRule(untrack(() => template.rule)));
  const project = $derived({ ...starterProject(), permissions: { allow: [], deny: [] }, rules: [rule] });
  const files = $derived(generate(project));
  const issues = $derived(checkProject(project, files).issues.filter((i) => i.ruleId === rule.id));
  let dialog: HTMLDialogElement;

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

  <footer>
    <button class="ghost" onclick={() => dialog.close()}>Annuler</button>
    <button
      class="primary"
      onclick={() => {
        onadd($state.snapshot(rule));
        dialog.close();
      }}>Ajouter aux fichiers Claude</button
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
  h3 {
    margin: 0;
  }
  .hint {
    font-size: 13px;
    color: var(--accent);
  }
</style>
