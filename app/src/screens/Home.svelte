<script lang="ts">
  import { t } from '../lib/i18n.svelte.ts';
  import { go } from '../lib/app.svelte.ts';
  import { hasFsa, hasWasm } from '../lib/files.ts';

  const wasm = hasWasm();
  const fsa = hasFsa();
</script>

<section class="home card">
  <p class="lead">{t('app.local')}</p>
  {#if !wasm}
    <p class="blocker" role="alert">{t('home.wasm')}</p>
  {:else}
    <div class="actions">
      <button type="button" onclick={() => go('new')}>{t('home.new')}</button>
      <button type="button" class="ghost" onclick={() => go('open')}>{t('home.open')}</button>
    </div>
    {#if !fsa}<p class="help">{t('home.nofsa')}</p>{/if}
  {/if}
</section>

<style>
  .home { max-width: 640px; margin: 24px auto; }
  .lead { margin-top: 0; }
  .actions { display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0 8px; }
  .blocker { background: var(--bad-bg); color: var(--bad); padding: 12px; border-radius: 8px; }
</style>
