<script lang="ts">
  import { loc, t } from '../lib/i18n.svelte.ts';
  import { currentExercise, loadState, ui } from '../lib/app.svelte.ts';
  import { REF_VERSION, core, packs, phasesById, phasesOrdered, themesOrdered } from '../lib/ref.ts';
  import { buildChecklist, effectiveFacts, stepwiseProgress, totalProgress, type Entry, type Progress } from '../../../engine/src/index.ts';
  import ChecklistItem from './ChecklistItem.svelte';

  const STANDING = 'standing';
  // Vue courante partagée (le tableau de bord peut ouvrir directement une étape).
  const view = $derived(ui.checklistView);
  let hideHandled = $state(false);

  const result = $derived.by(() => {
    void ui.rev;
    const ex = currentExercise();
    return buildChecklist({
      packs, profiles: core.profiles, profile: ex.meta().profile ?? 'entity',
      facts: effectiveFacts(core.facts, loadState().facts), responses: ex.checklistResponses(), refVersion: REF_VERSION,
    });
  });
  const isStanding = $derived(view === STANDING);
  const current = $derived(isStanding ? result.standing : result.phases[view]);
  const obligations = $derived(current?.obligations ?? []);
  const practices = $derived(current?.practices ?? []);
  const progress = $derived(current?.progress);

  const handled = (e: Entry) => e.status === 'done' || e.status === 'not_applicable' || e.status === 'accepted_gap';
  const visible = (es: Entry[]) => (hideHandled ? es.filter((e) => !handled(e)) : es);
  const pct = (p: Progress | undefined) => (p && p.total ? Math.round((100 * p.handled) / p.total) : 0);
  const frac = (p: Progress) => `${p.handled}/${p.total}`;
  const byTheme = $derived(themesOrdered
    .map((th) => ({ th, entries: visible(obligations.filter((e) => e.item.theme === th.id)) }))
    .filter((g) => g.entries.length));
</script>

<section class="card" aria-labelledby="h-cl">
  <h2 id="h-cl">{t('cl.title')}</h2>
  <p class="summary" data-testid="cl-summary">
    {t('cl.summary', { s: frac(result.standing.progress), w: frac(stepwiseProgress(result)), t: frac(totalProgress(result)) })}
  </p>
  <div class="phases" role="tablist" aria-label={t('cl.title')}>
    <button type="button" role="tab" id="tab-standing" aria-selected={isStanding} aria-controls="cl-panel"
      class="phase standing" class:active={isStanding} onclick={() => (ui.checklistView = STANDING)}>
      <span>{t('cl.standing.tab')}</span>
      <span class="count">{frac(result.standing.progress)}</span>
    </button>
    <span class="sep" aria-hidden="true"></span>
    {#each phasesOrdered as ph (ph.id)}
      {@const p = result.phases[ph.id]?.progress}
      <button type="button" role="tab" id={`tab-${ph.id}`} aria-selected={view === ph.id} aria-controls="cl-panel"
        class="phase" class:active={view === ph.id} onclick={() => (ui.checklistView = ph.id)}>
        <span>{loc(ph.label)}</span>
        {#if p && p.total}<span class="count">{frac(p)}</span>{/if}
      </button>
    {/each}
  </div>
  <label class="check"><input type="checkbox" bind:checked={hideHandled} /> {t('cl.hide.handled')}</label>
  {#if result.orphanResponses.length}
    <p class="note">{t('cl.orphans', { n: result.orphanResponses.length, ids: result.orphanResponses.join(', ') })}</p>
  {/if}
</section>

<div id="cl-panel" role="tabpanel" aria-labelledby={`tab-${view}`} class="cols">
  <section class="card col" class:standing-col={isStanding} aria-labelledby="h-obl" data-testid="obligations">
    {#if isStanding}
      <h3 id="h-obl">{t('cl.standing.title')}</h3>
      <p class="help">{t('cl.standing.help')}</p>
    {:else}
      <h3 id="h-obl">{t('cl.stepwise.title', { phase: loc(phasesById[view]?.label) })}</h3>
      <p class="help">{t('cl.stepwise.help')}</p>
    {/if}
    <p class="help">{t('cl.obligations')}</p>
    {#if progress && progress.total}
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax={progress.total} aria-valuenow={progress.handled}
        aria-label={t('cl.progress', { handled: progress.handled, total: progress.total })}>
        <div class="bar" style:width={`${pct(progress)}%`}></div>
      </div>
      <p class="help" data-testid="cl-progress">{t('cl.progress', { handled: progress.handled, total: progress.total })}</p>
    {/if}

    {#if isStanding}
      {#each byTheme as g (g.th.id)}
        <h4 class="theme" data-theme={g.th.id}>{loc(g.th.label)}</h4>
        <div class="list">
          {#each g.entries as e (e.item.id)}<ChecklistItem entry={e} related={result.related[e.item.id]} />{/each}
        </div>
      {:else}
        <p class="help">{obligations.length ? t('cl.allhandled') : t('cl.none')}</p>
      {/each}
    {:else}
      <div class="list">
        {#each visible(obligations) as e (e.item.id)}
          <ChecklistItem entry={e} related={result.related[e.item.id]} />
        {:else}
          <p class="help">{obligations.length ? t('cl.allhandled') : t('cl.none')}</p>
        {/each}
      </div>
    {/if}
  </section>

  <section class="card col practices" aria-labelledby="h-bp" data-testid="practices">
    <h3 id="h-bp">{isStanding ? t('cl.standing.practices') : t('cl.practices')}</h3>
    <p class="help">{t('cl.practices.help')}</p>
    <div class="list">
      {#each visible(practices) as e (e.item.id)}
        <ChecklistItem entry={e} />
      {:else}
        <p class="help">{practices.length ? t('cl.allhandled') : t('cl.none')}</p>
      {/each}
    </div>
  </section>
</div>

<style>
  .summary { margin: 4px 0 0; font-weight: 600; }
  .phases { display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0; align-items: center; }
  .phase { background: transparent; color: var(--text); border: 1px solid var(--border); display: flex; gap: 8px; align-items: center; }
  .phase.standing { border-color: var(--oblig); color: var(--oblig); font-weight: 600; }
  .phase.active { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
  .phase.standing.active { background: var(--oblig); color: #fff; border-color: var(--oblig); }
  .sep { width: 1px; align-self: stretch; background: var(--border); margin: 0 4px; }
  .count { font-size: .8rem; opacity: .85; }
  .check { display: flex; gap: 8px; align-items: center; }
  .note { background: var(--info-bg); color: var(--info); padding: 8px 10px; border-radius: 8px; font-size: .9rem; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; align-items: start; }
  @media (max-width: 960px) { .cols { grid-template-columns: 1fr; } }
  h3 { margin: 0; font-size: 1.05rem; }
  .theme { margin: 18px 0 0; font-size: .95rem; color: var(--oblig); border-bottom: 1px solid var(--border); padding-bottom: 4px; }
  .standing-col { border-top: 3px solid var(--oblig); }
  .practices { background: color-mix(in srgb, var(--surface) 92%, var(--accent)); }
  .list { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
  .progress { height: 8px; background: var(--border); border-radius: 999px; overflow: hidden; margin-top: 8px; }
  .bar { height: 100%; background: var(--ok); }
</style>
