<script lang="ts" module>
  import { LIMITS } from '#lib/core/quality.ts';
  import type { Severity } from '#lib/core/types.ts';

  /** Contrôles qualité (export du générateur) et problèmes des fichiers mémoire (analyse) ; texte : check.<code> (i18n). */
  export const CHECKS: { code: string; severity: Severity; max?: number }[] = [
    { code: 'root-too-long', severity: 'error', max: LIMITS.rootError },
    { code: 'root-long', severity: 'warning', max: LIMITS.rootWarn },
    { code: 'file-long', severity: 'warning', max: LIMITS.otherWarn },
    { code: 'vague', severity: 'warning' },
    { code: 'secret', severity: 'error' },
    { code: 'negative-phrasing', severity: 'info' },
    { code: 'code-copy', severity: 'info' },
    { code: 'no-trigger', severity: 'warning' },
    { code: 'long-skill', severity: 'warning', max: LIMITS.skillLines },
    { code: 'no-workflow', severity: 'info' },
    { code: 'no-verification', severity: 'info' },
    { code: 'empty', severity: 'error' },
    { code: 'no-paths', severity: 'error' },
    { code: 'bad-glob', severity: 'warning' },
    { code: 'no-dir', severity: 'error' },
    { code: 'dir-glob', severity: 'error' },
    { code: 'heavy-rule', severity: 'info' },
    { code: 'linter-job', severity: 'info' },
    { code: 'command-not-exact', severity: 'warning' },
    { code: 'bad-name', severity: 'error' },
    { code: 'no-description', severity: 'error' },
    { code: 'short-description', severity: 'warning' },
    { code: 'long-description', severity: 'error' },
    { code: 'hook-no-command', severity: 'error' },
    { code: 'hook-event', severity: 'error' },
    { code: 'hook-matcher', severity: 'info' },
    { code: 'duplicate', severity: 'warning' },
    { code: 'contradiction', severity: 'warning' },
    { code: 'package-manager', severity: 'warning' },
    { code: 'no-rules', severity: 'error' },
    { code: 'no-commands', severity: 'warning' },
    { code: 'no-context', severity: 'info' },
    { code: 'no-hooks', severity: 'info' },
    { code: 'no-deny', severity: 'info' },
    { code: 'too-many-critical', severity: 'warning', max: LIMITS.criticalRules },
    { code: 'local-gitignore', severity: 'info' },
    { code: 'collision', severity: 'error' },
    { code: 'instruction-budget', severity: 'warning', max: LIMITS.alwaysInstructions },
    { code: 'broken-import', severity: 'error' },
    { code: 'agents-not-imported', severity: 'warning' },
    { code: 'settings-json', severity: 'error' },
  ];
</script>

<script lang="ts">
  import { analyzeRepo } from '#lib/core/analyze.ts';
  import { criterionLabel, t, type Key } from '#lib/i18n.svelte.ts';

  // Un dépôt vide passe par tous les critères : la liste reste celle que la notation utilise vraiment.
  const CRITERIA = analyzeRepo({ paths: [], contents: {} }).criteria;
  const GROUPS = [
    { id: 'claude', label: 'ref.groupClaude' },
    { id: 'practices', label: 'ref.groupPractices' },
  ] as const;
  const LEVELS = [
    { severity: 'info', label: 'ref.infos' },
    { severity: 'warning', label: 'ref.warnings' },
    { severity: 'error', label: 'ref.errors' },
  ] as const;
</script>

<div class="reference">
  <header>
    <h1>{t('nav.reference')}</h1>
    <p class="lead">{t('ref.lead')}</p>
  </header>

  <section>
    <h2>{t('ref.checks')}</h2>
    <p class="muted">{t('ref.checksLead')}</p>
    {#each LEVELS as level (level.severity)}
      {@const list = CHECKS.filter((c) => c.severity === level.severity)}
      <h3 class={level.severity}>{t(level.label)} <span class="muted">{list.length}</span></h3>
      <table>
        <tbody>
          {#each list as c (c.code)}
            <tr>
              <td class="code"><code>{c.code}</code></td>
              <td>{t(`check.${c.code}` as Key, { max: c.max ?? '' })}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/each}
  </section>

  <section>
    <h2>{t('ref.criteria')}</h2>
    <p class="muted">{t('ref.criteriaLead')}</p>
    {#each GROUPS as g (g.id)}
      {@const list = CRITERIA.filter((c) => c.group === g.id)}
      <h3>{t(g.label)} <span class="muted">{list.reduce((s, c) => s + c.max, 0)} pts</span></h3>
      <table>
        <tbody>
          {#each list as c (c.id)}
            <tr>
              <td>{criterionLabel(c)}</td>
              <td class="pts">{c.max} pts</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/each}
  </section>
</div>

<style>
  .reference {
    display: grid;
    gap: 40px;
    line-height: 1.55;
  }
  h1 {
    margin: 0 0 8px;
    font-size: 28px;
  }
  .lead {
    margin: 0;
    font-size: 16px;
    color: var(--muted);
  }
  h2 {
    margin: 0 0 12px;
    font-size: 20px;
  }
  h3 {
    margin: 20px 0 8px;
    font-size: 15px;
  }
  section > p {
    margin: 0 0 8px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  td {
    padding: 6px 12px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  .pts {
    width: 80px;
    text-align: right;
    font-family: var(--mono);
  }
  .code {
    width: 220px;
    white-space: nowrap;
  }
  .error {
    color: var(--err);
  }
  .warning {
    color: var(--warn);
  }
  .info {
    color: var(--info);
  }
</style>
