<script lang="ts">
  import { loc, t, type MsgKey } from '../lib/i18n.svelte.ts';
  import { mutate, ui } from '../lib/app.svelte.ts';
  import { actorsById, itemsById } from '../lib/ref.ts';
  import { formatSource, type ChecklistStatus, type Entry } from '../../../engine/src/index.ts';

  interface Props {
    entry: Entry;
    related?: { restates: string[]; diverges: string[]; adds: string[] } | undefined;
  }
  let { entry, related }: Props = $props();

  const STATUSES: ChecklistStatus[] = ['open', 'in_progress', 'done', 'not_applicable', 'accepted_gap'];
  const item = $derived(entry.item);
  const isObligation = $derived(item.nature === 'obligation');
  const isInfo = $derived((item.display ?? 'check') === 'info');
  const uid = $derived(`cl-${item.id.replace(/[^A-Za-z0-9-]/g, '_')}`);

  // Brouillon local pour les statuts qui exigent une justification (journalisés seulement à la validation).
  let draftStatus = $state<ChecklistStatus | null>(null);
  let justification = $state('');
  let decidedBy = $state('');
  let localError = $state('');
  const shownStatus = $derived(draftStatus ?? entry.status);
  const needsJustification = $derived(shownStatus === 'not_applicable' || shownStatus === 'accepted_gap');

  const badge = $derived(
    item.nature === 'obligation' ? t('cl.badge.obligation')
      : item.nature === 'national_obligation' ? t('cl.badge.national', { fw: entry.framework })
        : t('cl.badge.practice', { fw: entry.framework }),
  );
  const ref = (ids: string[]) => ids.map((id) => `${id} (${loc(itemsById[id]?.title)})`).join(' ; ');

  function onStatus(e: Event) {
    const s = (e.currentTarget as HTMLSelectElement).value as ChecklistStatus;
    localError = '';
    if (s === 'not_applicable' || s === 'accepted_gap') {
      draftStatus = s;
      justification = entry.response?.justification ?? '';
      decidedBy = entry.response?.decided_by ?? '';
      return;
    }
    draftStatus = null;
    void mutate((ex) => ex.setChecklist(item.id, s));
  }

  async function record() {
    if (!draftStatus) return;
    if (!justification.trim()) { localError = t('cl.just.required'); return; }
    if (draftStatus === 'accepted_gap' && !decidedBy.trim()) { localError = t('cl.decider.required'); return; }
    const s = draftStatus;
    await mutate((ex) => ex.setChecklist(item.id, s, justification.trim(), decidedBy.trim() || null));
    if (!ui.error) draftStatus = null;
  }
</script>

<article class="item {item.nature}" class:handled={['done', 'not_applicable', 'accepted_gap'].includes(entry.status)} data-item={item.id} data-status={entry.status} aria-labelledby={`${uid}-title`}>
  <header>
    <span class="badge">{badge}</span>
    <span class="ref">{item.id} · {formatSource(item.source)}</span>
  </header>
  <h4 id={`${uid}-title`}>{loc(item.title)}</h4>
  <p class="summary">{loc(item.summary)}</p>

  {#if item.question}
    <p class="question"><strong>{t('cl.question')} :</strong> {loc(item.question)}</p>
  {/if}
  {#if item.evidence}<p class="meta"><strong>{t('cl.evidence')} :</strong> {loc(item.evidence)}</p>{/if}
  <p class="meta">{item.carriers.map((a) => loc(actorsById[a]?.label) || a).join(', ')}</p>

  {#if item.relation?.type === 'diverges'}
    <p class="warn">{t('cl.diverges', { ids: (item.relation.targets ?? []).join(', ') })}{item.relation.note ? ` — ${loc(item.relation.note)}` : ''}</p>
  {:else if item.relation?.type === 'restates'}
    <p class="meta">{t('cl.restates', { ids: (item.relation.targets ?? []).join(', ') })}</p>
  {:else if item.relation?.targets?.length}
    <p class="meta">{t('cl.adds', { ids: item.relation.targets.join(', ') })}{item.relation.note ? ` — ${loc(item.relation.note)}` : ''}</p>
  {/if}
  {#if isObligation && related}
    {#if related.diverges.length}<p class="warn">{t('cl.seealso.diverge', { ids: ref(related.diverges) })}</p>{/if}
    {#if related.restates.length + related.adds.length}<p class="meta">{t('cl.seealso', { ids: [...related.restates, ...related.adds].join(', ') })}</p>{/if}
  {/if}

  {#if entry.stale}<p class="warn">{t('cl.stale', { v: entry.response?.ref_version ?? '' })}</p>{/if}

  {#if isInfo}
    <p class="info">{t('cl.info')}</p>
  {:else}
    <div class="answer">
      <label for={`${uid}-st`}>{t('cl.status')}</label>
      <select id={`${uid}-st`} value={shownStatus} onchange={onStatus}>
        {#each STATUSES as s (s)}<option value={s}>{t(`st.${s}` as MsgKey)}</option>{/each}
      </select>
      {#if !draftStatus && entry.response?.justification}
        <p class="meta">{t('cl.justification')} : {entry.response.justification}{entry.response.decided_by ? ` — ${t('cl.decided_by')} : ${entry.response.decided_by}` : ''}</p>
      {/if}
    </div>
    {#if draftStatus && needsJustification}
      <div class="draft">
        <label for={`${uid}-just`}>{t('cl.justification')}</label>
        <textarea id={`${uid}-just`} rows="2" bind:value={justification}></textarea>
        {#if draftStatus === 'accepted_gap'}
          <label for={`${uid}-dec`}>{t('cl.decided_by')}</label>
          <input id={`${uid}-dec`} bind:value={decidedBy} />
        {/if}
        {#if localError}<p class="err" role="alert">{localError}</p>{/if}
        <div class="row">
          <button type="button" onclick={record}>{t('cl.record')}</button>
          <button type="button" class="ghost" onclick={() => { draftStatus = null; localError = ''; }}>{t('common.back')}</button>
        </div>
      </div>
    {/if}
  {/if}
</article>

<style>
  .item { border: 1px solid var(--border); border-left-width: 4px; border-radius: 8px; padding: 10px 12px; background: var(--surface); }
  .item.obligation { border-left-color: var(--oblig); }
  .item.good_practice { border-left-color: var(--accent); }
  .item.national_obligation { border-left-color: var(--warn); }
  .item.handled { opacity: .78; }
  header { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
  .badge { font-size: .75rem; font-weight: 700; padding: 1px 7px; border-radius: 4px; border: 1px solid currentColor; }
  .obligation .badge { color: var(--oblig); }
  .good_practice .badge { color: var(--accent); }
  .national_obligation .badge { color: var(--warn); }
  .ref { color: var(--muted); font-size: .8rem; }
  h4 { margin: 6px 0 4px; font-size: 1rem; }
  .summary { margin: 0 0 6px; }
  .question { margin: 0 0 6px; background: var(--info-bg); color: var(--info); padding: 6px 8px; border-radius: 6px; }
  .meta { margin: 0 0 4px; color: var(--muted); font-size: .85rem; }
  .warn { margin: 4px 0; color: var(--warn); background: var(--warn-bg); padding: 5px 8px; border-radius: 6px; font-size: .88rem; }
  .info { margin: 6px 0 0; color: var(--info); font-size: .85rem; font-style: italic; }
  .answer { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
  .answer label, .draft label { font-size: .85rem; color: var(--muted); }
  .draft { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
  textarea { font: inherit; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; }
  .row { display: flex; gap: 8px; margin-top: 4px; }
  .err { color: var(--bad); margin: 0; font-size: .88rem; }
</style>
