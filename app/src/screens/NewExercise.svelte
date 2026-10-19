<script lang="ts">
  import { loc, t } from '../lib/i18n.svelte.ts';
  import { createExercise, go, ui } from '../lib/app.svelte.ts';
  import { core } from '../lib/ref.ts';
  import { MIN_PASSPHRASE_LENGTH, passphraseProblems, type Profile } from '../../../engine/src/index.ts';

  let codename = $state('');
  let profile = $state<Profile>('entity');
  let author = $state('');
  let entityName = $state('');
  let pass1 = $state('');
  let pass2 = $state('');
  let ack = $state(false);

  const passOk = $derived(passphraseProblems(pass1).length === 0);
  const match = $derived(pass1 === pass2);
  const canSubmit = $derived(codename.trim().length >= 2 && author.trim().length > 0 && passOk && match && ack && !ui.busy);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const ok = await createExercise({ codename, profile, author, entityName, passphrase: pass1 });
    if (ok) { pass1 = ''; pass2 = ''; }
  }
</script>

<section class="card form">
  <h1>{t('new.title')}</h1>
  <form onsubmit={submit} novalidate>
    <div class="field">
      <label for="codename">{t('new.codename')} <span class="req">({t('common.required')})</span></label>
      <input id="codename" bind:value={codename} maxlength="40" autocomplete="off" aria-describedby="codename-help" required />
      <p class="help" id="codename-help">{t('new.codename.help')}</p>
    </div>
    <div class="field">
      <label for="profile">{t('new.profile')}</label>
      <select id="profile" bind:value={profile}>
        {#each core.profiles as p (p.id)}<option value={p.id}>{loc(p.label)}</option>{/each}
      </select>
    </div>
    <div class="field">
      <label for="author">{t('common.author')} <span class="req">({t('common.required')})</span></label>
      <input id="author" bind:value={author} autocomplete="name" aria-describedby="author-help" required />
      <p class="help" id="author-help">{t('common.author.help')}</p>
    </div>
    <div class="field">
      <label for="entity">{t('new.entity')}</label>
      <input id="entity" bind:value={entityName} autocomplete="organization" aria-describedby="entity-help" />
      <p class="help" id="entity-help">{t('new.entity.help')}</p>
    </div>
    <div class="field">
      <label for="pass1">{t('common.passphrase')} <span class="req">({t('common.required')})</span></label>
      <input id="pass1" type="password" bind:value={pass1} autocomplete="new-password" aria-describedby="pass-help" required />
      <p class="help" id="pass-help">{t('new.passphrase.help')} <span class:ok={passOk}>{[...pass1].length}/{MIN_PASSPHRASE_LENGTH}</span></p>
    </div>
    <div class="field">
      <label for="pass2">{t('new.passphrase2')}</label>
      <input id="pass2" type="password" bind:value={pass2} autocomplete="new-password" aria-invalid={pass2.length > 0 && !match} required />
      {#if pass2.length > 0 && !match}<p class="help bad">{t('new.mismatch')}</p>{/if}
    </div>
    <label class="check"><input type="checkbox" bind:checked={ack} /> {t('new.norecovery')}</label>
    <div class="actions">
      <button type="submit" disabled={!canSubmit}>{t('new.submit')}</button>
      <button type="button" class="ghost" onclick={() => go('home')}>{t('common.back')}</button>
    </div>
  </form>
</section>

<style>
  .form { max-width: 640px; margin: 16px auto; }
  .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
  .req { color: var(--muted); font-weight: 400; font-size: .85rem; }
  .check { display: flex; gap: 8px; align-items: flex-start; margin: 6px 0 16px; }
  .check input { margin-top: 4px; }
  .actions { display: flex; gap: 12px; }
  .ok { color: var(--ok); font-weight: 600; }
  .bad { color: var(--bad); }
</style>
