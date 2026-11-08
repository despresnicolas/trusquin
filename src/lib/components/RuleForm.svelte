<script lang="ts">
  import { CATEGORY_LABELS } from '#lib/core/placement.ts';
  import { HOOK_EVENTS } from '#lib/core/quality.ts';
  import type { GeneratedFile, Issue, Kind, Rule, Scope } from '#lib/core/types.ts';
  import { t, type Key } from '#lib/i18n.svelte.ts';
  import Hint from './Hint.svelte';

  let { rule, files, issues, onremove }: { rule: Rule; files: GeneratedFile[]; issues: Issue[]; onremove: () => void } =
    $props();

  const destinations = $derived(files.filter((f) => f.sources.includes(rule.id)));
  const named = $derived(rule.kind === 'command' || rule.kind === 'skill' || rule.kind === 'agent');

  const KINDS: Kind[] = ['rule', 'command', 'skill', 'agent', 'hook'];
  const SCOPES: Scope[] = ['project', 'topic', 'path', 'directory', 'local', 'user'];

  function setTargets(value: string) {
    rule.targets = value
      .split(/[\n,]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
</script>

<div class="form card">
  <div class="row">
    <label class="grow"
      >{t('rule.title')}
      <Hint text={t('rule.titleHint')} /><input
        bind:value={rule.title}
        placeholder={t('rule.titlePlaceholder')}
      /></label
    >
    <label
      >{t('rule.type')}
      <Hint text={t(`kindHint.${rule.kind}`)} />
      <select bind:value={rule.kind}>
        {#each KINDS as value (value)}<option {value}>{t(`kind.${value}`)}</option>{/each}
      </select>
    </label>
    <label class="toggle"
      ><input type="checkbox" bind:checked={rule.enabled} />
      {t('rule.enabled')}
      <Hint text={t('rule.enabledHint')} /></label
    >
  </div>

  {#if rule.kind === 'rule'}
    <div class="row">
      <label class="grow"
        >{t('rule.appliesTo')}
        <Hint text={t(`scopeHint.${rule.scope}`)} />
        <select bind:value={rule.scope}>
          {#each SCOPES as value (value)}<option {value}>{t(`scope.${value}`)}</option>{/each}
        </select>
      </label>
      <label
        >{t('rule.category')}
        <Hint text={t('rule.categoryHint')} />
        <select bind:value={rule.category}>
          <!-- Libellés de CATEGORY_LABELS (core) : ils titrent aussi les sections générées, d'où la clé par catégorie. -->
          {#each Object.keys(CATEGORY_LABELS) as value (value)}<option {value}>{t(`category.${value}` as Key)}</option
            >{/each}
        </select>
      </label>
      {#if rule.scope === 'project'}
        <label class="toggle"
          ><input type="checkbox" bind:checked={rule.critical} />
          {t('rule.critical')}
          <Hint text={t('rule.criticalHint')} /></label
        >
      {/if}
    </div>
    {#if rule.scope === 'path'}
      <label
        >{t('rule.globs')}
        <Hint text={t('rule.globsHint')} />
        <textarea
          rows="2"
          value={rule.targets.join('\n')}
          oninput={(e) => setTargets(e.currentTarget.value)}
          placeholder="src/api/**/*.ts"></textarea>
      </label>
    {:else if rule.scope === 'directory'}
      <label
        >{t('rule.directory')}
        <Hint text={t('rule.directoryHint')} />
        <input
          value={rule.targets[0] ?? ''}
          oninput={(e) => (rule.targets = [e.currentTarget.value.trim()])}
          placeholder="apps/api"
        />
      </label>
    {/if}
  {/if}

  {#if named}
    <div class="row">
      <label
        >{t('rule.name')}
        <Hint text={t('rule.nameHint')} /><input bind:value={rule.name} placeholder="release" /></label
      >
      {#if rule.kind === 'agent'}
        <label
          >{t('rule.model')}
          <select bind:value={rule.model}>
            <option value={undefined}>{t('rule.modelDefault')}</option><option>inherit</option><option>sonnet</option
            ><option>opus</option><option>haiku</option>
          </select>
        </label>
      {/if}
      {#if rule.kind === 'command'}
        <label>Argument hint<input bind:value={rule.argumentHint} placeholder={t('rule.argumentPlaceholder')} /></label>
      {/if}
    </div>
    <label
      >{t('rule.description')}
      <Hint text={t(rule.kind === 'skill' ? 'rule.descriptionSkillHint' : 'rule.descriptionHint')} />
      <textarea rows="2" bind:value={rule.description}></textarea>
    </label>
    {#if rule.kind !== 'skill'}
      <label
        >{t('rule.tools')}
        <Hint text={t('rule.toolsHint')} /><input
          bind:value={rule.tools}
          placeholder="Read, Grep, Bash(git diff:*)"
        /></label
      >
    {/if}
  {/if}

  {#if rule.kind === 'hook'}
    <div class="row">
      <label
        >{t('rule.event')}
        <Hint text={t('rule.eventHint')} />
        <select bind:value={rule.event}
          >{#each HOOK_EVENTS as e}<option>{e}</option>{/each}</select
        >
      </label>
      <label class="grow"
        >{t('rule.matcher')}
        <Hint text={t('rule.matcherHint')} /><input bind:value={rule.matcher} placeholder="Edit|Write" /></label
      >
    </div>
    <label
      >{t('rule.command')}
      <textarea rows="3" bind:value={rule.command}></textarea>
    </label>
  {:else}
    <label
      >{t(rule.kind === 'rule' ? 'rule.instructions' : 'rule.content')}
      <Hint
        text={t(
          rule.kind === 'rule'
            ? 'rule.instructionsHint'
            : rule.kind === 'skill'
              ? 'rule.skillBodyHint'
              : 'rule.bodyHint',
        )}
      />
      <textarea rows="9" bind:value={rule.body}></textarea>
    </label>
  {/if}

  <div class="dest">
    <span class="muted">{t('rule.destination')} <Hint text={t('rule.destinationHint')} />:</span>
    {#each destinations as f}
      <code title={f.explanation}>{f.path}</code>
    {:else}
      <span class="muted">{rule.enabled ? '—' : t('rule.disabled')}</span>
    {/each}
  </div>

  {#if issues.length}
    <ul class="issues">
      {#each issues as i}
        <li class="sev-{i.severity}">{i.message} <span class="muted">→ {i.fix}</span></li>
      {/each}
    </ul>
  {/if}

  <div><button class="ghost sev-error" onclick={onremove}>{t('common.delete')}</button></div>
</div>

<style>
  .form {
    display: grid;
    gap: 12px;
  }
  .row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: end;
  }
  .row > label {
    min-width: 140px;
  }
  .grow {
    flex: 1;
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-bottom: 6px;
  }
  .toggle input {
    width: auto;
  }
  .dest {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .dest code {
    background: var(--accent-soft);
    color: var(--accent);
    padding: 2px 8px;
    border-radius: 4px;
  }
  .issues {
    margin: 0;
    padding-left: 18px;
    font-size: 13px;
  }
</style>
