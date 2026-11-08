<script lang="ts">
  import { t } from '#lib/i18n.svelte.ts';
  import GoalChooser from './GoalChooser.svelte';
  import HowItWorks from './HowItWorks.svelte';
</script>

<div class="home">
  <header>
    <h1>{t('home.title')}</h1>
    <p class="lead">{t('home.lead')}</p>
  </header>

  <HowItWorks />

  <section>
    <h2>{t('home.goals')}</h2>
    <GoalChooser />
  </section>
</div>

<style>
  .home {
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
    margin: 0 0 14px;
    font-size: 20px;
  }
</style>
