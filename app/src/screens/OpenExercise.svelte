<script lang="ts">
  import { t } from '../lib/i18n.svelte.ts';
  import { go, openExercise, ui } from '../lib/app.svelte.ts';
  import { pickTlpt, type PickedFile } from '../lib/files.ts';

  let file = $state<PickedFile | null>(null);
  let author = $state('');
  let pass = $state('');
  const canSubmit = $derived(!!file && author.trim().length > 0 && pass.length > 0 && !ui.busy);

  async function choose() {
    ui.error = '';
    try { file = (await pickTlpt()) ?? file; } catch (e) { ui.error = String(e); }
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!canSubmit || !file) return;
    const ok = await openExercise(file, author, pass);
    pass = '';
    if (ok) file = null;
  }
</script>

<section class="card form">
  <h1>{t('open.title')}</h1>
  <form onsubmit={submit} novalidate>
    <div class="field">
      <button type="button" class="ghost" onclick={choose} id="choose">{t('open.choose')}</button>
      {#if file}<p class="help" data-testid="chosen">{t('open.chosen', { name: file.name })}</p>{/if}
    </div>
    <div class="field">
      <label for="author">{t('common.author')}</label>
      <input id="author" bind:value={author} autocomplete="name" aria-describedby="author-help" required />
      <p class="help" id="author-help">{t('common.author.help')}</p>
    </div>
    <div class="field">
      <label for="pass">{t('common.passphrase')}</label>
      <input id="pass" type="password" bind:value={pass} autocomplete="current-password" required />
    </div>
    <div class="actions">
      <button type="submit" disabled={!canSubmit}>{t('open.submit')}</button>
      <button type="button" class="ghost" onclick={() => go('home')}>{t('common.back')}</button>
    </div>
  </form>
</section>

<style>
  .form { max-width: 640px; margin: 16px auto; }
  .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; align-items: flex-start; }
  .field input { align-self: stretch; }
  .actions { display: flex; gap: 12px; }
</style>
