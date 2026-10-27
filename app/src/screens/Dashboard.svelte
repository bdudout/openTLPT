<script lang="ts">
  import { factValueLabel, formatDate, loc, t, type MsgKey } from '../lib/i18n.svelte.ts';
  import { act, currentExercise, loadState, mutate, openChecklist, todayISO, ui } from '../lib/app.svelte.ts';
  import { downloadBlob } from '../lib/files.ts';
  import { leadWeeks, snapshot } from '../lib/snapshot.ts';
  import { buildDeck, committeesFor, type CommitteeKind } from '../lib/deck.ts';
  import { deckToPptx } from '../lib/pptx.ts';
  import { REF_VERSION, actorsById, core, deliverablesById, eventsById, itemsById, packs, phasesById } from '../lib/ref.ts';
  import {
    buildChecklist, buildDashboard, checkEventOrder, computeDeadlinesForProfile, deadlinePhases, deliverableRows, effectiveFacts,
    expandProfile, factIssues,
    type ActionItem, type DashboardPhaseDef, type Progress,
  } from '../../../engine/src/index.ts';

  const phaseOf = deadlinePhases(core.deadlines, (id) => itemsById[id]?.phase);
  const defs = Object.fromEntries(core.deadlines.map((d) => [d.id, d]));

  const data = $derived.by(() => {
    void ui.rev;
    const ex = currentExercise();
    const meta = ex.meta();
    const profile = meta.profile ?? 'entity';
    const st = loadState();
    const facts = effectiveFacts(core.facts, st.facts);
    const deadlines = computeDeadlinesForProfile(core, st, core.profiles, profile);
    const checklist = buildChecklist({ packs, profiles: core.profiles, profile, facts, responses: ex.checklistResponses(), refVersion: REF_VERSION });
    const deliverables = ex.listDeliverables();
    const expected = deliverableRows(core.deliverables as never, deliverables, core.deadlines, deadlines, core.profiles, profile, facts).rows.map((r) => r.def.id);
    const dash = buildDashboard({
      today: st.today, phases: core.phases as unknown as DashboardPhaseDef[], events: core.events, deadlineDefs: core.deadlines,
      deadlines, deadlinePhase: phaseOf, eventDates: st.events, checklist,
      weeklyReports: ex.listWeeklyReports().map((r) => r.report_date), legups: ex.listLegUps(), detections: ex.listDetections(),
      orderIssues: checkEventOrder(core, st.events), expectedDeliverables: expected, deliverables,
      visibleProfiles: expandProfile(core.profiles, profile), factIssues: factIssues(facts),
      plannedDates: st.planned ?? {}, baselineDates: Object.fromEntries(ex.listEventPlans().filter((p) => p.baseline_date).map((p) => [p.event_ref, p.baseline_date as string])),
      leadWeeks,
      horizonDays: ui.horizonWeeks * 7,
    });
    return { meta, facts, dash, journal: ex.journalStats() };
  });
  const k = $derived(data.dash.kpis);

  const pct = (p: Progress) => (p.total ? Math.round((100 * p.handled) / p.total) : 0);
  const frac = (p: Progress) => `${p.handled}/${p.total}`;
  const evLabel = (id: string | undefined) => (id ? loc(eventsById[id]?.label) || id : '');
  const days = (a: ActionItem) => (a.overdue ? t('db.late', { n: -a.daysLeft }) : a.daysLeft === 0 ? t('db.today') : t('db.in', { n: a.daysLeft }));
  const carriers = (id: string) => (defs[id]?.carriers ?? []).map((c) => loc(actorsById[c]?.label) || c).join(', ');
  const stepLabel = (s: string) => (s === 'standing' ? t('db.step.standing') : loc(phasesById[s]?.label));

  const COMMITTEES = $derived(committeesFor(currentExercise().meta().profile ?? 'entity'));
  let deckNotice = $state('');
  let generating = $state<CommitteeKind | null>(null);

  async function generateDeck(kind: CommitteeKind) {
    generating = kind;
    deckNotice = '';
    try {
      const ex = currentExercise();
      const deck = buildDeck(kind, snapshot(ex, loadState(), ui.horizonWeeks));
      const { blob, slides } = await deckToPptx(deck, ex.author);
      const ok = await act((e) => e.recordExport('committee_pptx', { deck: kind, slides }));
      if (!ok) return;
      downloadBlob(`${deck.fileTitle}.pptx`, blob);
      deckNotice = t('pp.done', { k: t(`pp.kind.${kind}` as MsgKey), n: slides });
    } finally {
      generating = null;
    }
  }

  function setEvent(id: string, value: string) { if (value) void mutate((ex) => ex.setEventDate(id, value)); }
  async function anchor() {
    let text = '';
    const ok = await act(async (ex) => { const a = await ex.anchor(); text = `${a.codename} · #${a.seq} · ${a.hash} · ${a.ts}`; });
    if (ok) ui.lastAnchorText = text;
  }
</script>

<!-- Bandeau d'identité -->
<section class="card ident" data-testid="db-ident">
  <div>
    <p class="phase">
      {data.dash.currentPhase ? t('db.phase.current', { p: loc(phasesById[data.dash.currentPhase]?.label) }) : t('db.phase.none')}
      {#if k.dayOfTlpt !== undefined}<span class="pill">{t('db.day', { n: k.dayOfTlpt })}</span>{/if}
    </p>
    <p class="help">
      {#if data.dash.nextMilestone}{t('db.next', { e: evLabel(data.dash.nextMilestone.event), d: formatDate(data.dash.nextMilestone.date) })} · {/if}
      {t('db.framework', { f: `DORA / RTS 2025/1190${data.facts.national_framework && data.facts.national_framework !== 'none' ? ` + ${data.facts.national_framework}` : ''} + TIBER-EU` })}
      · {t('db.testers', { t: factValueLabel('testers', String(data.facts.testers ?? 'external')) })}
    </p>
  </div>
  <div class="trace">
    <p class:bad={!currentExercise().integrityAtOpen.ok}>
      {currentExercise().integrityAtOpen.ok ? `✓ ${t('db.integrity.ok', { n: data.journal.entries })}` : `⚠ ${t('db.integrity.broken', { seq: ui.integrityBrokenAt })}`}
    </p>
    <p class="help">{data.journal.lastAnchor ? t('db.anchor.last', { d: data.journal.lastAnchor.ts.replace('T', ' ').replace('Z', ' UTC') }) : t('db.anchor.none')}</p>
    <button type="button" class="ghost small" onclick={anchor}>{t('db.anchor.do')}</button>
    {#if ui.lastAnchorText}<p class="help">{t('db.anchor.text')}</p><code data-testid="anchor-text">{ui.lastAnchorText}</code>{/if}
  </div>
</section>

<!-- Indicateurs -->
<section class="kpis" aria-label="KPI">
  <div class="kpi" data-kpi="compliance">
    <span class="k-label">{t('kpi.compliance')}</span>
    <span class="k-value">{pct(data.dash.overall.total)} %</span>
    <span class="k-sub">{t('kpi.compliance.sub', { s: frac(data.dash.overall.standing), w: frac(data.dash.overall.stepwise) })}</span>
  </div>
  <div class="kpi" class:bad={k.overdueDeadlines > 0} data-kpi="overdue">
    <span class="k-label">{t('kpi.overdue')}</span>
    <span class="k-value">{k.overdueDeadlines}</span>
  </div>
  {#if k.preparationDaysLeft !== undefined}
    <div class="kpi" class:bad={k.preparationDaysLeft < 0} class:warn={k.preparationDaysLeft >= 0 && k.preparationDaysLeft <= 30} data-kpi="prep">
      <span class="k-label">{t('kpi.prep')}</span>
      <span class="k-value">{k.preparationDaysLeft >= 0 ? t('kpi.days', { n: k.preparationDaysLeft }) : t('kpi.days.late', { n: -k.preparationDaysLeft })}</span>
      <span class="k-sub">{k.preparationDaysLeft >= 0 ? t('kpi.prep.sub') : t('kpi.prep.over', { n: -k.preparationDaysLeft })}</span>
    </div>
  {/if}
  {#if k.activeWeek !== undefined}
    <div class="kpi" data-kpi="active">
      <span class="k-label">{t('kpi.active')}</span>
      <span class="k-value">{t('kpi.active.value', { n: k.activeWeek })}<small> / 12+</small></span>
      {#if k.activeMinEnd}<span class="k-sub">{t('kpi.active.sub', { d: formatDate(k.activeMinEnd) })}</span>{/if}
    </div>
  {:else if k.activeDurationDays !== undefined}
    <div class="kpi" class:bad={k.activeDurationDays < 84} data-kpi="active">
      <span class="k-label">{t('kpi.active')}</span>
      <span class="k-value">{t('kpi.active.done', { w: Math.floor(k.activeDurationDays / 7), d: k.activeDurationDays })}</span>
      <span class="k-sub">{t('kpi.active.done.sub')}</span>
    </div>
  {/if}
  {#if k.closureDaysLeft !== undefined}
    <div class="kpi" class:bad={k.closureDaysLeft < 0} class:warn={k.closureDaysLeft >= 0 && k.closureDaysLeft <= 14} data-kpi="closure">
      <span class="k-label">{t('kpi.closure')}</span>
      <span class="k-value">{k.closureDaysLeft >= 0 ? t('kpi.days', { n: k.closureDaysLeft }) : t('kpi.days.late', { n: -k.closureDaysLeft })}</span>
      <span class="k-sub">{t('kpi.closure.sub')}</span>
    </div>
  {/if}
  {#if k.weekly}
    <div class="kpi" class:warn={k.weekly.covered < k.weekly.total} data-kpi="weekly">
      <span class="k-label">{t('kpi.weekly')}</span>
      <span class="k-value">{k.weekly.covered}/{k.weekly.total}</span>
      <span class="k-sub">{t('kpi.weekly.sub')}</span>
    </div>
  {/if}
  {#if k.deliverables}
    <div class="kpi" data-kpi="deliverables">
      <span class="k-label">{t('kpi.deliverables')}</span>
      <span class="k-value">{k.deliverables.submitted}/{k.deliverables.expected}</span>
      <span class="k-sub">{t('kpi.deliverables.sub', { a: k.deliverables.approved, h: k.deliverables.fingerprinted })}</span>
    </div>
  {/if}
  {#if k.slippage}
    <div class="kpi" class:warn={k.slippage.slipped > 0} data-kpi="planning">
      <span class="k-label">{t('kpi.planning')}</span>
      <span class="k-value">{k.slippage.slipped}/{k.slippage.tracked}</span>
      <span class="k-sub">{t('kpi.planning.sub', { n: k.slippage.maxDays })}</span>
    </div>
  {/if}
  <div class="kpi" class:warn={k.legups.flagged > 0} data-kpi="legups">
    <span class="k-label">{t('kpi.legups')}</span>
    <span class="k-value">{k.legups.total}</span>
    <span class="k-sub">{t('kpi.legups.sub', { u: k.legups.unplanned, f: k.legups.flagged })}</span>
  </div>
  <div class="kpi" class:warn={k.detections.unvalidated > 0} data-kpi="detections">
    <span class="k-label">{t('kpi.detections')}</span>
    <span class="k-value">{k.detections.total}</span>
    <span class="k-sub">{t('kpi.detections.sub', { u: k.detections.unvalidated })}</span>
  </div>
  <div class="kpi" class:warn={k.staleAnswers > 0} data-kpi="answers">
    <span class="k-label">{t('kpi.answers')}</span>
    <span class="k-value small">{t('kpi.answers.value', { g: k.acceptedGaps })}</span>
    <span class="k-sub">{t('kpi.answers.sub', { n: k.notApplicable, s: k.staleAnswers })}</span>
  </div>
</section>

<!-- Supports de comité -->
<section class="card decks" aria-labelledby="h-decks" data-testid="db-decks">
  <h2 id="h-decks">{t('pp.title')}</h2>
  <p class="help">{t('pp.help')}</p>
  <ul>
    {#each COMMITTEES as c (c)}
      <li>
        <div><strong>{t(`pp.kind.${c}` as MsgKey)}</strong><span class="meta">{t(`pp.desc.${c}` as MsgKey)}</span></div>
        <button type="button" class="ghost small" disabled={generating !== null} onclick={() => generateDeck(c)} data-deck={c}
          aria-label={`${t('pp.generate')} — ${t(`pp.kind.${c}` as MsgKey)}`}>{generating === c ? '…' : `${t('pp.generate')} .pptx`}</button>
      </li>
    {/each}
  </ul>
  {#if deckNotice}<p class="deck-notice" role="status">{deckNotice}</p>{/if}
</section>


{#snippet actions(list: ActionItem[], empty: string, testid: string)}
  <ul class="actions" data-testid={testid}>
    {#each list as a (a.kind + a.id)}
      <li class:late={a.overdue} data-action={a.id}>
        <div>
          <strong>{a.kind === 'weekly_report' ? t('db.weekly.item', { d: formatDate(a.due) }) : loc(defs[a.id]?.label)}</strong>
          <span class="meta">{a.id} · {carriers(a.id)}{a.beforeEvent ? ` · ${t('db.before', { e: evLabel(a.beforeEvent) })}` : ''}{a.forecast ? ` · ${t('dl.forecast')}` : ''}</span>
          {#if a.startBy && testid === 'db-tostart'}<span class="meta start">{t('db.startBy', { d: formatDate(a.startBy), w: a.leadWeeks ?? 0, l: loc(deliverablesById[a.deliverable ?? '']?.label) })}</span>{/if}
        </div>
        <div class="when">
          <time datetime={a.due}>{formatDate(a.due)}</time>
          <span class:late-txt={a.overdue}>{days(a)}</span>
        </div>
      </li>
    {:else}<li class="help">{empty}</li>{/each}
  </ul>
{/snippet}

<div class="cols">
  <section class="card" aria-labelledby="h-week">
    <h2 id="h-week">{t('db.week')}</h2>
    {@render actions(data.dash.thisWeek, t('db.week.empty'), 'db-week')}
  </section>
  <section class="card" aria-labelledby="h-up">
    <div class="up-head">
      <h2 id="h-up">{t('db.upstream.title')}</h2>
      <label class="horizon">{t('db.horizon')}
        <select bind:value={ui.horizonWeeks} data-testid="db-horizon">
          {#each [4, 6, 8, 12] as w (w)}<option value={w}>{t('db.weeks', { n: w })}</option>{/each}
        </select>
      </label>
    </div>
    {@render actions(data.dash.upcoming, t('db.upstream.empty'), 'db-upstream')}
    {#if data.dash.toStart.length}
      <h3>{t('db.tostart')}</h3>
      <p class="help">{t('db.tostart.help')}</p>
      {@render actions(data.dash.toStart, '', 'db-tostart')}
    {/if}
    {#if data.dash.expectedEvents.length}
      <h3>{t('db.expected')}</h3>
      <p class="help">{t('db.expected.help')}</p>
      <ul class="expected" data-testid="db-expected">
        {#each data.dash.expectedEvents as e (e.event)}
          <li data-expected={e.event}>
            <label for={`db-ev-${e.event}`}>{evLabel(e.event)} <span class="meta">· {loc(phasesById[e.phase]?.label)}{e.byAuthority ? ` · ${t('db.byAuthority')}` : ''}{e.planned ? ` · ${t('ev.planned.short')} ${formatDate(e.planned)}` : ''}</span></label>
            <input id={`db-ev-${e.event}`} type="date" onchange={(ev) => setEvent(e.event, ev.currentTarget.value)} />
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<section class="card block" aria-labelledby="h-tl">
  <h2 id="h-tl">{t('db.timeline')}</h2>
  <ol class="timeline" data-testid="db-timeline">
    {#each data.dash.timeline as ph (ph.phase)}
      <li class="tl {ph.status}" data-phase={ph.phase} data-status={ph.status}>
        <div class="tl-head">
          <span class="tl-name">{loc(phasesById[ph.phase]?.label)}</span>
          <span class="badge {ph.status}">{t(`ps.${ph.status}` as MsgKey)}</span>
        </div>
        {#if ph.start || ph.end}
          <p class="meta">{ph.start ? formatDate(ph.start) : '…'} → {ph.end ? formatDate(ph.end) : '…'}</p>
        {/if}
        <ul class="tl-events">
          {#each ph.events.filter((e) => e.date || e.planned) as e (e.event)}
            <li class:past={e.past} class:planned={!e.date}>
              <span aria-hidden="true">{e.past ? '●' : '○'}</span> {formatDate(e.date ?? e.planned)}{e.date ? '' : ` (${t('ev.planned.short')})`} — {evLabel(e.event)}
              {#if e.slipDays}<span class="slip" class:late={e.slipDays > 0}>{e.slipDays > 0 ? t('ev.slip.late', { n: e.slipDays }) : t('ev.slip.early', { n: -e.slipDays })}</span>{/if}
            </li>
          {/each}
        </ul>
      </li>
    {/each}
  </ol>
</section>

<div class="cols">
  <section class="card" aria-labelledby="h-comp">
    <h2 id="h-comp">{t('db.compliance')}</h2>
    <p class="help">{t('db.compliance.help')}</p>
    <table class="comp" data-testid="db-compliance">
      <thead><tr><th scope="col">{t('db.col.step')}</th><th scope="col">{t('db.col.progress')}</th><th scope="col">{t('db.col.late')}</th><th scope="col">{t('db.col.soon')}</th><th scope="col"><span class="sr">{t('db.open')}</span></th></tr></thead>
      <tbody>
        {#each data.dash.compliance as c (c.step)}
          <tr data-step={c.step}>
            <th scope="row">{stepLabel(c.step)}</th>
            <td>
              {#if c.progress.total}
                <div class="bar-wrap" aria-hidden="true"><div class="bar" style:width={`${pct(c.progress)}%`}></div></div>
                <span class="frac">{frac(c.progress)}</span>
              {:else}<span class="frac muted-txt" title={t('db.step.none')}>—</span>{/if}
            </td>
            <td class:late-txt={c.overdue > 0}>{c.overdue}</td>
            <td class:warn-txt={c.dueSoon > 0}>{c.dueSoon}</td>
            <td><button type="button" class="ghost small" onclick={() => openChecklist(c.step)} aria-label={`${t('db.open')} — ${stepLabel(c.step)}`}>{t('db.open')}</button></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
  <section class="card" aria-labelledby="h-al">
    <h2 id="h-al">{t('db.alerts')}</h2>
    <ul class="alerts" data-testid="db-alerts">
      {#each data.dash.alerts as a, i (i)}
        <li>
          <span class:bad-txt={a.severity === 'error'}>{a.kind === 'order' ? t('is.event_order', { source: a.label.split('<').map((x) => evLabel(x)).join(' < ') }) : a.kind === 'facts' ? `${a.severity === 'error' ? '⛔ ' : '⚠ '}${t(`is.${a.code}` as MsgKey)} (${a.source})` : `${t(`is.${a.code}` as MsgKey, { source: (a.source ?? '').replace(/^RTS-(\d+)\.(\d+)$/, 'RTS $1($2)') })} — ${a.label}`}</span>
          <button type="button" class="ghost small" onclick={() => (ui.tab = a.kind === 'order' || a.kind === 'facts' ? 'deadlines' : 'registers')}>{t('db.see')}</button>
        </li>
      {:else}<li class="help">{t('db.alerts.empty')}</li>{/each}
    </ul>
  </section>
</div>

<style>
  .ident { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
  .phase { font-size: 1.1rem; font-weight: 700; margin: 0 0 4px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .pill { font-size: .8rem; font-weight: 600; background: var(--info-bg); color: var(--info); padding: 2px 10px; border-radius: 999px; }
  .trace { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; max-width: 100%; }
  .trace p { margin: 0; }
  .trace .bad { color: var(--bad); font-weight: 700; }
  .trace code { font-size: .75rem; word-break: break-all; background: var(--info-bg); padding: 4px 6px; border-radius: 4px; max-width: 520px; text-align: left; }
  .kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; margin-bottom: 12px; }
  .kpi { background: var(--surface); border: 1px solid var(--border); border-left: 4px solid var(--accent); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
  .kpi.warn { border-left-color: var(--warn); }
  .kpi.bad { border-left-color: var(--bad); }
  .k-label { font-size: .78rem; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; font-weight: 600; }
  .k-value { font-size: 1.45rem; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .k-value.small { white-space: normal; }
  .k-value.small { font-size: 1.05rem; }
  .k-value small { font-size: .85rem; color: var(--muted); font-weight: 600; }
  .kpi.bad .k-value { color: var(--bad); }
  .kpi.warn .k-value { color: var(--warn); }
  .k-sub { font-size: .8rem; color: var(--muted); }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; align-items: start; }
  @media (max-width: 860px) { .cols { grid-template-columns: 1fr; } .trace { text-align: left; align-items: flex-start; } }
  h3 { font-size: .98rem; margin: 16px 0 2px; }
  .block { margin-bottom: 12px; }
  .actions, .expected, .alerts { list-style: none; padding: 0; margin: 8px 0 0; }
  .actions li { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0 8px 10px; border-top: 1px solid var(--border); border-left: 3px solid var(--accent); margin-bottom: 2px; }
  .actions li.late { border-left-color: var(--bad); background: color-mix(in srgb, var(--bad-bg) 60%, transparent); }
  .actions li.help { border-left: 0; }
  .meta { display: block; color: var(--muted); font-size: .82rem; }
  .when { text-align: right; white-space: nowrap; font-size: .9rem; }
  .when time { display: block; font-weight: 600; }
  .late-txt { color: var(--bad); font-weight: 700; }
  .warn-txt { color: var(--warn); font-weight: 700; }
  .expected li { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 6px 0; border-top: 1px solid var(--border); }
  .timeline { list-style: none; padding: 0; margin: 10px 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 8px; }
  .tl { border: 1px solid var(--border); border-top: 4px solid var(--border); border-radius: 8px; padding: 8px 10px; }
  .tl.in_progress { border-top-color: var(--accent); background: color-mix(in srgb, var(--surface) 90%, var(--accent)); }
  .tl.done { border-top-color: var(--ok); }
  .tl.permanent { border-top-color: var(--oblig); }
  .tl-head { display: flex; justify-content: space-between; gap: 6px; align-items: baseline; flex-wrap: wrap; }
  .tl-name { font-weight: 700; font-size: .92rem; }
  .badge { font-size: .72rem; font-weight: 700; padding: 1px 7px; border-radius: 999px; background: var(--info-bg); color: var(--info); }
  .badge.done { background: var(--ok-bg); color: var(--ok); }
  .badge.in_progress { background: var(--accent); color: var(--accent-text); }
  .tl-events { list-style: none; padding: 0; margin: 6px 0 0; font-size: .8rem; color: var(--muted); }
  .tl-events li.past { color: var(--text); }
  .comp { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .comp th, .comp td { text-align: left; padding: 7px 6px; border-top: 1px solid var(--border); font-size: .9rem; }
  .comp thead th { font-size: .78rem; color: var(--muted); text-transform: uppercase; border-top: 0; }
  .bar-wrap { display: inline-block; width: 90px; height: 8px; background: var(--border); border-radius: 999px; overflow: hidden; vertical-align: middle; margin-right: 6px; }
  .bar { height: 100%; background: var(--ok); }
  .frac { font-variant-numeric: tabular-nums; }
  .alerts li { display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 7px 0; border-top: 1px solid var(--border); color: var(--warn); }
  .alerts li.help { color: var(--muted); }
  .small { padding: 4px 10px; font-size: .85rem; }
  .muted-txt { color: var(--muted); }
  .bad-txt { color: var(--bad); font-weight: 600; }
  .up-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .horizon { font-size: .82rem; color: var(--muted); display: flex; gap: 6px; align-items: center; }
  .start { color: var(--accent); font-weight: 600; }
  .tl-events li.planned { font-style: italic; }
  .slip { margin-left: 4px; font-weight: 700; color: var(--ok); font-style: normal; }
  .slip.late { color: var(--bad); }
  .decks { margin-bottom: 12px; }
  .decks ul { list-style: none; padding: 0; margin: 8px 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 8px; }
  .decks li { display: flex; justify-content: space-between; gap: 10px; align-items: center; border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; }
  .deck-notice { margin: 8px 0 0; color: var(--ok); font-weight: 600; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
