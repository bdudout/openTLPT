<script lang="ts">
  import { factValueLabel, formatDate, loc, t, type MsgKey } from '../lib/i18n.svelte.ts';
  import { currentExercise, loadState, lock, mutate, save, todayISO, ui } from '../lib/app.svelte.ts';
  import { actorsById, core, eventsById, phasesOrdered, type UiDeadlineDef } from '../lib/ref.ts';
  import { hasFsa } from '../lib/files.ts';
  import {
    checkEventOrder, computeDeadlines, effectiveFacts, type DeadlineResult, type FactValue,
  } from '../../../engine/src/index.ts';

  const meta = $derived.by(() => { void ui.rev; return currentExercise().meta(); });
  const state = $derived(loadState());
  const results = $derived(computeDeadlines(core, state));
  const facts = $derived(effectiveFacts(core.facts, state.facts));
  const orderIssues = $derived(checkEventOrder(core, state.events));
  const defs = Object.fromEntries(core.deadlines.map((d) => [d.id, d])) as Record<string, UiDeadlineDef>;
  const profile = $derived(core.profiles.find((p) => p.id === meta.profile));
  const fsa = hasFsa();

  const eventLabel = (id: string | undefined) => (id ? loc(eventsById[id]?.label) || id : '');
  const carriers = (d: UiDeadlineDef) => d.carriers.map((a) => loc(actorsById[a]?.label) || a).join(', ');

  const tone: Record<string, string> = {
    overdue: 'bad', min_violated: 'bad', recurring_missing: 'warn', due_soon: 'warn', done_late: 'warn',
    done_on_time: 'ok', min_met: 'ok', recurring_ok: 'ok', upcoming: 'info', running: 'info',
    waiting_anchor: 'muted', not_applicable: 'muted',
  };

  function daysText(r: DeadlineResult): string {
    if (r.daysLeft === undefined || r.state.startsWith('done') || r.state === 'not_applicable') return '';
    if (r.kind === 'min') return r.state === 'min_violated' ? t('dl.min.missing', { n: r.daysLeft }) : '';
    if (r.daysLeft === 0) return t('dl.days.today');
    return r.daysLeft > 0 ? t('dl.days.left', { n: r.daysLeft }) : t('dl.days.late', { n: -r.daysLeft });
  }

  const canMarkDone = (r: DeadlineResult) => r.display === 'check' && (r.kind === 'max' || r.kind === 'before') && r.state !== 'not_applicable';

  function setEvent(id: string, value: string) { void mutate((ex) => ex.setEventDate(id, value || null)); }
  function setDone(id: string, value: string) { void mutate((ex) => ex.setDeadlineDone(id, value || null)); }
  function setFact(id: string, value: FactValue) { void mutate((ex) => ex.setFact(id, value)); }

  function onLock() { lock(); }
</script>

<section class="bar card">
  <div class="ident">
    <h1 data-testid="codename">{meta.codename}</h1>
    <p class="help">
      {t('ex.profile')} : {loc(profile?.label)} · {t('ex.author')} : {currentExercise().author}
      · {t('ex.version')} : {ui.fileVersion} · {ui.fileName}
    </p>
  </div>
  <div class="actions">
    {#if ui.dirty}<span class="dirty" data-testid="dirty">● {t('ex.unsaved')}</span>{/if}
    <button type="button" onclick={() => save()} disabled={!!ui.busy}>{t('ex.save')}</button>
    {#if fsa}<button type="button" class="ghost" onclick={() => save(true)} disabled={!!ui.busy}>{t('ex.saveas')}</button>{/if}
    <button type="button" class="ghost" onclick={onLock}>{t('ex.lock')}</button>
  </div>
</section>

{#if ui.integrityBrokenAt}<p class="alert bad" role="alert">{t('ex.integrity.broken', { seq: ui.integrityBrokenAt })}</p>{/if}
{#if ui.kdfUpgraded}<p class="alert info">{t('ex.kdf.upgraded')}</p>{/if}
{#each orderIssues as i (i.event + i.mustFollow)}
  <p class="alert warn" role="alert">{t('order.issue', { event: eventLabel(i.event), d1: formatDate(i.date), other: eventLabel(i.mustFollow), d2: formatDate(i.otherDate) })}</p>
{/each}

<section class="card block" aria-labelledby="h-deadlines">
  <div class="head">
    <h2 id="h-deadlines">{t('sec.deadlines')}</h2>
    <span class="today">{t('ex.today', { d: formatDate(todayISO()) })}</span>
  </div>
  <p class="help">{t('sec.deadlines.help')}</p>
  <div class="scroll">
    <table class="deadlines">
      <thead>
        <tr>
          <th scope="col">{t('dl.col.deadline')}</th>
          <th scope="col">{t('dl.col.carriers')}</th>
          <th scope="col">{t('dl.col.due')}</th>
          <th scope="col">{t('dl.col.state')}</th>
          <th scope="col">{t('dl.col.done')}</th>
        </tr>
      </thead>
      <tbody>
        {#each results as r (r.id)}
          {@const d = defs[r.id]}
          {#if d}
            <tr data-deadline={r.id} data-state={r.state} class:muted={r.state === 'not_applicable'}>
              <td>
                <span class="badge oblig">{t('dl.badge.obligation')}</span>
                <span class="dl-label">{loc(d.label)}</span>
                <span class="src">{d.id} · {d.sources.join(', ')}{r.display === 'info' ? ` · ${t('dl.info')}` : ''}</span>
                {#if r.overridden}<span class="src">{t('dl.overridden', { why: r.overridden.justification })}</span>{/if}
              </td>
              <td class="carriers" data-label={t('dl.col.carriers')}>{carriers(d)}</td>
              <td class="due" data-label={t('dl.col.due')}>
                <div class="due-val">
                {#if r.state === 'waiting_anchor'}
                  <span class="hint">{t('dl.waiting', { event: eventLabel(r.missingEvent) })}</span>
                {:else if r.kind === 'before' && !r.due}
                  <span class="hint">{t('dl.before', { event: eventLabel(d.anchor) })}</span>
                {:else if r.kind === 'recurring'}
                  <span class="hint">{t('dl.periods', { missing: (r.periods ?? []).filter((p) => !p.covered).length, total: (r.periods ?? []).length })}</span>
                {:else if r.due}
                  <time datetime={r.due}>{formatDate(r.due)}</time>
                  {#if r.kind === 'min'}<span class="hint">{t('dl.min.earliest')}</span>{/if}
                  <span class="days">{daysText(r)}</span>
                {/if}
                </div>
              </td>
              <td data-label={t('dl.col.state')}><span class="badge {tone[r.state]}">{t(`state.${r.state}` as MsgKey)}</span></td>
              <td class="done" data-label={t('dl.col.done')}>
                {#if canMarkDone(r)}
                  <input type="date" aria-label={`${t('dl.col.done')} — ${loc(d.label)}`} value={state.done?.[r.id] ?? ''}
                    onchange={(e) => setDone(r.id, e.currentTarget.value)} />
                {/if}
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
</section>

<div class="cols">
  <section class="card block" aria-labelledby="h-events">
    <h2 id="h-events">{t('sec.events')}</h2>
    <p class="help">{t('sec.events.help')}</p>
    {#each phasesOrdered as ph (ph.id)}
      {@const evs = core.events.filter((e) => e.phase === ph.id)}
      {#if evs.length}
        <fieldset>
          <legend>{loc(ph.label)}</legend>
          {#each evs as ev (ev.id)}
            <div class="ev">
              <label for={`ev-${ev.id}`}>{loc(ev.label)}</label>
              <input id={`ev-${ev.id}`} type="date" value={state.events[ev.id] ?? ''} onchange={(e) => setEvent(ev.id, e.currentTarget.value)} />
            </div>
          {/each}
        </fieldset>
      {/if}
    {/each}
  </section>

  <section class="card block" aria-labelledby="h-facts">
    <h2 id="h-facts">{t('sec.facts')}</h2>
    <p class="help">{t('sec.facts.help')}</p>
    {#each core.facts as f (f.id)}
      <div class="fact">
        {#if f.type === 'boolean'}
          <label class="check">
            <input type="checkbox" checked={facts[f.id] === true} onchange={(e) => setFact(f.id, e.currentTarget.checked)} />
            {loc(f.label)}
          </label>
        {:else if f.type === 'enum'}
          <label for={`fact-${f.id}`}>{loc(f.label)}</label>
          <select id={`fact-${f.id}`} value={String(facts[f.id] ?? '')} onchange={(e) => setFact(f.id, e.currentTarget.value)}>
            {#each f.values ?? [] as v (v)}<option value={v}>{factValueLabel(f.id, v)}</option>{/each}
          </select>
        {/if}
        {#if f.help}<p class="help">{loc(f.help)}</p>{/if}
      </div>
    {/each}
  </section>
</div>

<style>
  .bar { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
  .bar h1 { margin: 0; }
  .actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .dirty { color: var(--warn); font-weight: 600; font-size: .9rem; }
  .alert { padding: 10px 12px; border-radius: 8px; margin: 0 0 12px; }
  .alert.bad { background: var(--bad-bg); color: var(--bad); }
  .alert.warn { background: var(--warn-bg); color: var(--warn); }
  .alert.info { background: var(--info-bg); color: var(--info); }
  .block { margin-bottom: 14px; }
  .head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .today { color: var(--muted); font-size: .9rem; }
  .scroll { overflow-x: auto; margin-top: 10px; }
  table { border-collapse: collapse; width: 100%; min-width: 760px; }
  th, td { text-align: left; vertical-align: top; padding: 9px 8px; border-bottom: 1px solid var(--border); }
  th { font-size: .82rem; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .03em; }
  tr.muted td { opacity: .55; }
  .dl-label { display: block; font-weight: 600; margin-top: 4px; }
  .src { display: block; color: var(--muted); font-size: .8rem; }
  .carriers { font-size: .88rem; color: var(--muted); max-width: 180px; }
  .due time { font-weight: 600; white-space: nowrap; }
  .hint, .days { display: block; color: var(--muted); font-size: .85rem; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: .78rem; font-weight: 600; white-space: nowrap; border: 1px solid transparent; }
  .badge.oblig { border-radius: 4px; background: transparent; border-color: var(--oblig); color: var(--oblig); }
  .badge.ok { background: var(--ok-bg); color: var(--ok); }
  .badge.warn { background: var(--warn-bg); color: var(--warn); }
  .badge.bad { background: var(--bad-bg); color: var(--bad); }
  .badge.info { background: var(--info-bg); color: var(--info); }
  .badge.muted { background: transparent; color: var(--muted); border-color: var(--border); }
  /* Mobile : chaque échéance devient une carte (pas de défilement horizontal). */
  @media (max-width: 700px) {
    table { min-width: 0; }
    thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    tr { display: block; border-bottom: 1px solid var(--border); padding: 8px 0; }
    td { display: flex; justify-content: space-between; gap: 12px; border: 0; padding: 4px 0; }
    td:first-child { display: block; }
    td[data-label]::before { content: attr(data-label); color: var(--muted); font-size: .8rem; text-transform: uppercase; letter-spacing: .03em; }
    td.done:empty, td.done:not(:has(input)) { display: none; }
    .carriers { max-width: none; text-align: right; }
    .due-val { text-align: right; }
  }
  .cols { display: grid; grid-template-columns: 3fr 2fr; gap: 14px; }
  @media (max-width: 860px) { .cols { grid-template-columns: 1fr; } }
  fieldset { border: 1px solid var(--border); border-radius: 8px; margin: 12px 0 0; padding: 8px 12px 10px; }
  legend { font-weight: 600; padding: 0 4px; }
  .ev { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 5px 0; }
  .ev label { flex: 1; }
  .fact { margin-top: 12px; display: flex; flex-direction: column; gap: 4px; }
  .check { display: flex; gap: 8px; align-items: center; }
</style>
