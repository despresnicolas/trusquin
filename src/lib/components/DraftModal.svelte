<script lang="ts">
  import { generate } from '#lib/core/placement.ts';
  import { newRule, starterProject, type Template } from '#lib/core/presets.ts';
  import { checkProject } from '#lib/core/quality.ts';
  import type { Criterion, Rule } from '#lib/core/types.ts';
  import { api } from '#lib/history.ts';
  import { criterionText, t, tc } from '#lib/i18n.svelte.ts';
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
    onsaved: (backups: string[]) => void;
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
  const text = $derived(criterionText(criterion));
  let failure = $state('');
  let dialog: HTMLDialogElement;

  async function write() {
    failure = '';
    try {
      const backups: string[] = [];
      for (const f of own) backups.push(await api.writeRepoFile(root, f.path, f.content));
      onsaved(backups.filter(Boolean));
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
    <h3 id="draft-title">{text.label}</h3>
    <button class="ghost" aria-label={t('settings.close')} onclick={() => dialog.close()}>×</button>
  </header>
  <p class="muted">{text.detail} → {text.fix}</p>
  <p class="hint">{t('draft.template', { label: tc(template.label), hint: tc(template.hint) })}</p>

  <RuleForm {rule} {files} {issues} onremove={() => dialog.close()} />

  {#if failure}<p class="sev-error">{failure}</p>{/if}
  <footer>
    {#if clashes.length}
      <span class="muted">{t('draft.clash', { files: clashes.join(', ') })}</span>
    {/if}
    <button class="ghost" onclick={() => dialog.close()}>{t('common.cancel')}</button>
    <button
      onclick={() => {
        onadd($state.snapshot(rule));
        dialog.close();
      }}>{t('draft.addToFiles')}</button
    >
    <button
      class="primary"
      onclick={write}
      disabled={!own.length || clashes.length > 0}
      title={own.map((f) => f.path).join(', ')}>{t('draft.create')}</button
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
