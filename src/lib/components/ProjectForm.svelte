<script lang="ts">
  import { store } from '../state.svelte';

  const project = $derived(store.project);
</script>

<div class="card project">
  <label>Nom du projet<input bind:value={project.name} /></label>
  <label>Description (le quoi, en une phrase)<textarea rows="2" bind:value={project.description}></textarea></label>
  <label>Stack<input bind:value={project.stack} placeholder="SvelteKit, Fastify, PostgreSQL, pnpm" /></label>
  <label class="check"
    ><input type="checkbox" bind:checked={project.useAgentsMd} /> Écrire dans AGENTS.md (multi-outils) + import dans CLAUDE.md</label
  >
  <h4>Permissions <span class="muted">(.claude/settings.json)</span></h4>
  <div class="perms">
    <label
      >Autoriser (une par ligne)
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
      >Refuser (une par ligne)
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
