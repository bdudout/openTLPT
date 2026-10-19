<script lang="ts">
  import { i18n, t, toggleLang } from './lib/i18n.svelte.ts';
  import { ui } from './lib/app.svelte.ts';
  import Home from './screens/Home.svelte';
  import NewExercise from './screens/NewExercise.svelte';
  import OpenExercise from './screens/OpenExercise.svelte';
  import ExerciseView from './screens/ExerciseView.svelte';

  // Avertissement natif avant de quitter avec des modifications non enregistrées.
  $effect(() => {
    const onUnload = (e: BeforeUnloadEvent) => { if (ui.dirty) e.preventDefault(); };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  });
</script>

<header class="topbar">
  <div class="brand">
    <span class="logo" aria-hidden="true">◆</span>
    <span class="name">openTLPT</span>
    <span class="tagline">{t('app.tagline')}</span>
  </div>
  <button type="button" class="ghost" onclick={toggleLang} lang={i18n.lang === 'fr' ? 'en' : 'fr'}>{t('lang.switch')}</button>
</header>

<main id="main">
  <div class="status" role="status" aria-live="polite">
    {#if ui.busy}<p class="busy"><span class="spinner" aria-hidden="true"></span>{ui.busy}</p>{/if}
    {#if ui.notice}<p class="notice">{ui.notice}</p>{/if}
  </div>
  {#if ui.error}<p class="error" role="alert">{ui.error}</p>{/if}

  {#if ui.screen === 'home'}<Home />
  {:else if ui.screen === 'new'}<NewExercise />
  {:else if ui.screen === 'open'}<OpenExercise />
  {:else}<ExerciseView />{/if}
</main>

<style>
  :global(:root) {
    --bg: #f6f7f9; --surface: #ffffff; --text: #1b1f24; --muted: #5a6370; --border: #d9dee5;
    --accent: #1f4e8c; --accent-text: #ffffff; --focus: #f2a900;
    --ok: #17663a; --ok-bg: #e7f4ec; --warn: #8a5300; --warn-bg: #fff4dc; --bad: #a3122a; --bad-bg: #fde8ec;
    --info: #3d4b5c; --info-bg: #eef1f5; --oblig: #7a0019;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) {
      --bg: #12161b; --surface: #1b2128; --text: #e7ebf0; --muted: #a0aab6; --border: #33404d;
      --accent: #6ea8ff; --accent-text: #0b1520; --focus: #ffc94d;
      --ok: #7fd6a2; --ok-bg: #173325; --warn: #ffcb6b; --warn-bg: #3a2c10; --bad: #ff8fa0; --bad-bg: #3d1820;
      --info: #c3ccd7; --info-bg: #26303b; --oblig: #ff8fa0;
      color-scheme: dark;
    }
  }
  :global(body) { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif; }
  :global(*:focus-visible) { outline: 3px solid var(--focus); outline-offset: 2px; }
  :global(button) { font: inherit; cursor: pointer; border-radius: 6px; border: 1px solid var(--accent); background: var(--accent); color: var(--accent-text); padding: 8px 14px; }
  :global(button:disabled) { opacity: .5; cursor: not-allowed; }
  :global(button.ghost) { background: transparent; color: var(--accent); }
  :global(input, select) { font: inherit; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 7px 9px; }
  :global(h1) { font-size: 1.5rem; margin: .2rem 0 1rem; }
  :global(h2) { font-size: 1.15rem; margin: 0 0 .25rem; }
  :global(.help) { color: var(--muted); font-size: .88rem; margin: .15rem 0 0; }
  :global(.card) { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px; }
  .topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; background: var(--surface); border-bottom: 1px solid var(--border); }
  .brand { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .logo { color: var(--accent); }
  .name { font-weight: 700; font-size: 1.1rem; }
  .tagline { color: var(--muted); font-size: .9rem; }
  main { max-width: 1120px; margin: 0 auto; padding: 16px; }
  .status:empty { display: none; }
  .busy, .notice, .error { padding: 10px 12px; border-radius: 8px; margin: 0 0 12px; }
  .busy { background: var(--info-bg); color: var(--info); display: flex; align-items: center; gap: 10px; }
  .notice { background: var(--ok-bg); color: var(--ok); }
  .error { background: var(--bad-bg); color: var(--bad); }
  .spinner { width: 14px; height: 14px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
</style>
