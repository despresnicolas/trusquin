<script lang="ts">
  import { t } from '#lib/i18n.svelte.ts';
  import type { Loading } from '#lib/core/types.ts';

  const GROUPS = ['contenu', 'placement', 'entretien'] as const;

  /** Principes d'une bonne règle : contre-exemple, version réussie et contrôle qui le vérifie (textes : pr.<id>.* dans i18n, check vide = pas de contrôle). */
  const PRINCIPLES = [
    { group: 'contenu', id: 'checkable' },
    { group: 'contenu', id: 'positive' },
    { group: 'contenu', id: 'notObvious' },
    { group: 'contenu', id: 'example' },
    { group: 'contenu', id: 'point' },
    { group: 'placement', id: 'hook' },
    { group: 'placement', id: 'place' },
    { group: 'placement', id: 'critical' },
    { group: 'entretien', id: 'safe' },
    { group: 'entretien', id: 'living' },
  ] as const;

  const FILES = [
    { id: 'claude', path: 'CLAUDE.md', loading: 'always' },
    { id: 'agents', path: 'AGENTS.md', loading: 'always' },
    { id: 'topic', path: '.claude/rules/testing.md', loading: 'always' },
    { id: 'paths', path: '.claude/rules/api.md', loading: 'on-path' },
    { id: 'directory', path: 'apps/api/CLAUDE.md', loading: 'on-path' },
    { id: 'skill', path: '.claude/skills/release/SKILL.md', loading: 'on-demand' },
    { id: 'command', path: '.claude/commands/review.md', loading: 'on-demand' },
    { id: 'agent', path: '.claude/agents/test-runner.md', loading: 'on-demand' },
    { id: 'settings', path: '.claude/settings.json', loading: 'deterministic' },
    { id: 'local', path: 'CLAUDE.local.md', loading: 'personal' },
    { id: 'user', path: '~/.claude/CLAUDE.md', loading: 'personal' },
  ] as const satisfies readonly { id: string; path: string; loading: Loading }[];
</script>

<div class="page">
  <header>
    <h1>{t('nav.practices')}</h1>
    <p class="lead">{t('practices.lead')}</p>
  </header>

  <section>
    <h2>{t('practices.goodRule')}</h2>
    <div class="groups">
      {#each GROUPS as g (g)}
        <div>
          <h3>{t(`group.${g}.title`)}</h3>
          <p class="muted">{t(`group.${g}.lead`)}</p>
          <ul class="principles">
            {#each PRINCIPLES.filter((p) => p.group === g) as p (p.id)}
              <li>
                <details>
                  <summary><b>{t(`pr.${p.id}.title`)}</b><span class="muted">{t(`pr.${p.id}.why`)}</span></summary>
                  <dl>
                    <dt class="bad"><span aria-hidden="true">✗</span> {t('practices.avoid')}</dt>
                    <dd>{t(`pr.${p.id}.bad`)}</dd>
                    <dt class="good"><span aria-hidden="true">✓</span> {t('practices.prefer')}</dt>
                    <dd>{t(`pr.${p.id}.good`)}</dd>
                  </dl>
                  {#if t(`pr.${p.id}.check`)}<p class="check">
                      {t('practices.checked', { check: t(`pr.${p.id}.check`) })}
                    </p>{/if}
                </details>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </section>

  <section>
    <h2>{t('practices.files')}</h2>
    <div class="table-wrap card">
      <table>
        <thead>
          <tr
            ><th scope="col">{t('practices.file')}</th><th scope="col">{t('practices.loading')}</th><th scope="col"
              >{t('practices.role')}</th
            ></tr
          >
        </thead>
        <tbody>
          {#each FILES as f (f.path)}
            <tr>
              <td><code>{f.path}</code></td>
              <td><span class="pill load-{f.loading}">{t(`loading.${f.loading}`)}</span></td>
              <td>{t(`file.${f.id}`)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>

<style>
  .page {
    display: grid;
    gap: 40px;
    max-width: 1000px;
    line-height: 1.55;
  }
  h1 {
    margin: 0 0 8px;
    font-size: 28px;
  }
  .lead {
    max-width: 62ch;
    margin: 0;
    font-size: 16px;
    color: var(--muted);
  }
  h2 {
    margin: 0 0 14px;
    font-size: 20px;
  }
  h3 {
    margin: 0;
    font-size: 16px;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .groups {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 28px;
  }
  .groups > div > .muted {
    margin: 2px 0 10px;
  }
  .principles {
    display: grid;
    gap: 6px;
  }
  .principles details {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .principles details[open] {
    border-color: var(--accent);
  }
  .principles summary {
    display: grid;
    gap: 2px;
    padding: 10px 12px;
    cursor: pointer;
    list-style: none;
  }
  .principles summary::-webkit-details-marker {
    display: none;
  }
  .principles summary .muted {
    font-size: 13px;
  }
  dl {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 4px 10px;
    margin: 0 12px 10px;
    padding: 8px 10px;
    border-radius: 6px;
    background: var(--surface-2);
    font-size: 13px;
  }
  dt {
    font-weight: 600;
    white-space: nowrap;
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .bad {
    color: var(--err);
  }
  .good {
    color: var(--ok);
  }
  .check {
    margin: 0 12px 10px;
    font-size: 12px;
    color: var(--muted);
  }
  .table-wrap {
    margin-top: 14px;
    padding: 0;
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th,
  td {
    padding: 8px 14px;
    border-bottom: 1px solid var(--border);
    text-align: left;
    vertical-align: top;
  }
  th {
    color: var(--muted);
    font-weight: 600;
  }
  tr:last-child td {
    border-bottom: 0;
  }
  .load-always {
    color: var(--warn);
  }
  .load-on-path,
  .load-on-demand {
    color: var(--ok);
  }
  .load-deterministic {
    color: var(--info);
  }
</style>
