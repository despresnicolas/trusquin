<script lang="ts">
  import { t } from '#lib/i18n.svelte.ts';
  import { store } from '#lib/state.svelte.ts';
  import Hint from './Hint.svelte';

  const project = $derived(store.project);
</script>

<div class="card project">
  <label>{t('form.name')} <Hint text={t('form.nameHint')} /><input bind:value={project.name} /></label>
  <label
    >{t('form.description')}
    <Hint text={t('form.descriptionHint')} /><textarea rows="2" bind:value={project.description}></textarea></label
  >
  <label
    >{t('form.stack')}
    <Hint text={t('form.stackHint')} /><input
      bind:value={project.stack}
      placeholder="SvelteKit, Fastify, PostgreSQL, pnpm"
    /></label
  >
  <label class="check"
    ><input type="checkbox" bind:checked={project.useAgentsMd} />
    {t('form.agentsMd')}
    <Hint text={t('form.agentsMdHint')} /></label
  >
  <h4>
    {t('form.permissions')} <span class="muted">(.claude/settings.json)</span>
    <Hint text={t('form.permissionsHint')} />
  </h4>
  <div class="perms">
    <label
      >{t('form.allow')}
      <textarea
        rows="3"
        value={project.permissions.allow.join('\n')}
        oninput={(e) =>
          (project.permissions.allow = e.currentTarget.value
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean))}></textarea>
    </label>
    <label
      >{t('form.deny')}
      <textarea
        rows="3"
        value={project.permissions.deny.join('\n')}
        oninput={(e) =>
          (project.permissions.deny = e.currentTarget.value
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean))}></textarea>
    </label>
  </div>
</div>

<style>
  .project {
    display: grid;
    gap: 12px;
    max-width: 900px;
  }
  .check {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .check input {
    width: auto;
  }
  h4 {
    margin: 8px 0 0;
  }
  .perms {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 12px;
  }
</style>
