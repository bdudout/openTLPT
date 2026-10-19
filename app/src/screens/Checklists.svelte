<script lang="ts">
  import { loc, t } from '../lib/i18n.svelte.ts';
  import { currentExercise, loadState, ui } from '../lib/app.svelte.ts';
  import { REF_VERSION, core, packs, phasesOrdered } from '../lib/ref.ts';
  import { buildChecklist, effectiveFacts, type Entry } from '../../../engine/src/index.ts';
  import ChecklistItem from './ChecklistItem.svelte';

  let phase = $state('preparation');
  let hideHandled = $state(false);

  const result = $derived.by(() => {
    void ui.rev;
    const ex = currentExercise();
    return buildChecklist({
      packs, profiles: core.profiles, profile: ex.meta().profile ?? 'entity',
      facts: effectiveFacts(core.facts, loadState().facts), responses: ex.checklistResponses(), refVersion: REF_VERSION,
    });
  });
  const current = $derived(result.phases[phase]);
  const handled = (e: Entry) => e.status === 'done' || e.status === 'not_applicable' || e.status === 'accepted_gap';
  const visible = (es: Entry[]) => (hideHandled ? es.filter((e) => !handled(e)) : es);
  const pct = (h: number, n: number) => (n ? Math.round((100 * h) / n) : 0);
</script>

<section class="card" aria-labelledby="h-cl">
  <h2 id="h-cl">{t('cl.title')}</h2>
  <div class="phases" role="tablist" aria-label={t('cl.title')}>
    {#each phasesOrdered as ph (ph.id)}
      {@const p = result.phases[ph.id]?.progress}
      <button type="button" role="tab" id={`tab-${ph.id}`} aria-selected={phase === ph.id} aria-controls="cl-panel"
        class="phase" class:active={phase === ph.id} onclick={() => (phase = ph.id)}>
        <span>{loc(ph.label)}</span>
        {#if p && p.total}<span class="count">{p.handled}/{p.total}</span>{/if}
      </button>
    {/each}
  </div>
  <label class="check"><input type="checkbox" bind:checked={hideHandled} /> {t('cl.hide.handled')}</label>
  {#if result.orphanResponses.length}
    <p class="note">{t('cl.orphans', { n: result.orphanResponses.length, ids: result.orphanResponses.join(', ') })}</p>
  {/if}
</section>

<div id="cl-panel" role="tabpanel" aria-labelledby={`tab-${phase}`} class="cols">
  <section class="card col" aria-labelledby="h-obl" data-testid="obligations">
    <h3 id="h-obl">{t('cl.obligations')}</h3>
    <p class="help">{t('cl.obligations.help')}</p>
    {#if current && current.progress.total}
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax={current.progress.total} aria-valuenow={current.progress.handled}
        aria-label={t('cl.progress', { handled: current.progress.handled, total: current.progress.total })}>
        <div class="bar" style:width={`${pct(current.progress.handled, current.progress.total)}%`}></div>
      </div>
      <p class="help">{t('cl.progress', { handled: current.progress.handled, total: current.progress.total })}</p>
    {/if}
    <div class="list">
      {#each visible(current?.obligations ?? []) as e (e.item.id)}
        <ChecklistItem entry={e} related={result.related[e.item.id]} />
      {:else}
        <p class="help">{(current?.obligations.length ?? 0) ? t('cl.allhandled') : t('cl.none')}</p>
      {/each}
    </div>
  </section>

  <section class="card col practices" aria-labelledby="h-bp" data-testid="practices">
    <h3 id="h-bp">{t('cl.practices')}</h3>
    <p class="help">{t('cl.practices.help')}</p>
    <div class="list">
      {#each visible(current?.practices ?? []) as e (e.item.id)}
        <ChecklistItem entry={e} />
      {:else}
        <p class="help">{(current?.practices.length ?? 0) ? t('cl.allhandled') : t('cl.none')}</p>
      {/each}
    </div>
  </section>
</div>

<style>
  .phases { display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0; }
  .phase { background: transparent; color: var(--text); border: 1px solid var(--border); display: flex; gap: 8px; align-items: center; }
  .phase.active { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
  .count { font-size: .8rem; opacity: .85; }
  .check { display: flex; gap: 8px; align-items: center; }
  .note { background: var(--info-bg); color: var(--info); padding: 8px 10px; border-radius: 8px; font-size: .9rem; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; align-items: start; }
  @media (max-width: 960px) { .cols { grid-template-columns: 1fr; } }
  h3 { margin: 0; font-size: 1.05rem; }
  .practices { background: color-mix(in srgb, var(--surface) 92%, var(--accent)); }
  .list { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
  .progress { height: 8px; background: var(--border); border-radius: 999px; overflow: hidden; margin-top: 8px; }
  .bar { height: 100%; background: var(--ok); }
</style>
