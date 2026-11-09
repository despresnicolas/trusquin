<script lang="ts">
  import { t } from '#lib/i18n.svelte.ts';
  import GradeScale from './GradeScale.svelte';

  /** La boucle de travail, en quatre temps (clés i18n/fr.ts). */
  const LOOP = [
    { title: 'loop.analyze', text: 'loop.analyzeText' },
    { title: 'loop.fix', text: 'loop.fixText' },
    { title: 'loop.export', text: 'loop.exportText' },
    { title: 'loop.reanalyze', text: 'loop.reanalyzeText' },
  ] as const;
</script>

<section>
  <h2>{t('home.how')}</h2>
  <ol>
    {#each LOOP as s, i (s.title)}
      <li>
        <span class="num" aria-hidden="true">{i + 1}</span>
        <b>{t(s.title)}</b>
        <p class="muted">{t(s.text)}</p>
      </li>
    {/each}
  </ol>
  <h3>{t('home.grading')}</h3>
  <div class="note">
    <GradeScale grade="A" />
    <p class="muted">{t('home.gradingText')} <b>A</b>{t('home.gradingGoal')}</p>
  </div>
</section>

<style>
  section {
    margin-bottom: 24px;
    line-height: 1.55;
  }
  h2 {
    margin: 0 0 14px;
    font-size: 20px;
  }
  ol {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: grid;
    gap: 6px;
    align-content: start;
  }
  p {
    margin: 0;
  }
  .note {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
  }
  h3 {
    margin: 28px 0 12px;
    font-size: 16px;
  }
  .num {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 700;
  }
</style>
