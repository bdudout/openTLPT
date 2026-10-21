<script lang="ts">
  import { factValueLabel, formatDate, i18n, loc, t, type MsgKey } from '../lib/i18n.svelte.ts';
  import { act, currentExercise, loadState, openChecklist, todayISO, ui } from '../lib/app.svelte.ts';
  import { REF_VERSION, actorsById, core, deliverablesById, packs, phasesById, phasesOrdered, themesOrdered } from '../lib/ref.ts';
  import { downloadText } from '../lib/files.ts';
  import {
    buildRequirements, computeDeadlines, effectiveFacts, filterRequirements, formatSource, toCsv,
    type Condition, type Count, type Family, type RequirementFilter, type RequirementRow, type RequirementStatus,
  } from '../../../engine/src/index.ts';

  const data = $derived.by(() => {
    void ui.rev;
    const ex = currentExercise();
    const st = loadState();
    const meta = ex.meta();
    return {
      meta,
      journal: ex.journalStats(),
      res: buildRequirements({
        packs, profiles: core.profiles, profile: meta.profile ?? 'entity', facts: effectiveFacts(core.facts, st.facts),
        responses: ex.checklistResponses(), refVersion: REF_VERSION, deadlines: computeDeadlines(core, st),
        deliverables: ex.listDeliverables(), lastAnswers: ex.lastAnswers(),
      }),
    };
  });

  let f = $state<RequirementFilter>({ q: '', family: '', group: '', status: '', carrier: '', textKey: '', overdueOnly: false, staleOnly: false });
  let notice = $state('');
  const ref = (r: RequirementRow) => formatSource(r.item.source);
  const shown = $derived(filterRequirements(data.res.rows, f, ref));
  const excluded = $derived(data.res.rows.filter((r) => !r.applicable));

  const STATUSES: RequirementStatus[] = ['open', 'in_progress', 'done', 'not_applicable', 'accepted_gap'];
  const pct = (c: Count) => (c.total ? Math.round((100 * c.handled) / c.total) : 0);
  const groupLabel = (r: RequirementRow) => r.family === 'standing'
    ? loc(themesOrdered.find((th) => th.id === r.group)?.label) : loc(phasesById[r.group]?.label);
  const familyLabel = (fam: Family) => t(fam === 'standing' ? 'rq.family.standing' : 'rq.family.stepwise');
  const statusLabel = (s: RequirementStatus) => t(`st.${s}` as MsgKey);
  const carriers = (r: RequirementRow) => r.item.carriers.map((a) => loc(actorsById[a]?.label) || a).join(', ');
  const carrierIds = [...new Set(packs.flatMap((p) => p.items ?? []).filter((i) => i.nature === 'obligation').flatMap((i) => i.carriers))];
  const groups = $derived(f.family === 'standing' ? themesOrdered : f.family === 'stepwise' ? phasesOrdered.filter((p) => p.id !== 'cycle') : [...themesOrdered, ...phasesOrdered.filter((p) => p.id !== 'cycle')]);

  function condText(c: Condition | undefined): string {
    if (!c) return '';
    const [kind, tests] = 'all' in c ? ['all', c.all] as const : ['any', c.any] as const;
    const facts = Object.fromEntries(core.facts.map((x) => [x.id, loc(x.label)]));
    const parts = tests.map((tst) => {
      const label = facts[tst.fact] ?? tst.fact;
      if (tst.eq !== undefined) return tst.eq === true ? label : tst.eq === false ? `≠ ${label}` : `${label} = ${factValueLabel(tst.fact, String(tst.eq))}`;
      return `${label} ∈ {${(tst.in ?? []).map((v) => factValueLabel(tst.fact, String(v))).join(', ')}}`;
    });
    return parts.join(kind === 'all' ? (i18n.lang === 'fr' ? ' et ' : ' and ') : (i18n.lang === 'fr' ? ' ou ' : ' or '));
  }
  const exclusion = (r: RequirementRow) => r.excludedBy === 'profile'
    ? t('rq.excluded.profile', { p: loc(core.profiles.find((p) => p.id === data.meta.profile)?.label) })
    : t('rq.excluded.condition', { c: condText(r.item.applies_when) });

  function reset() { f = { q: '', family: '', group: '', status: '', carrier: '', textKey: '', overdueOnly: false, staleOnly: false }; }

  async function exportCsv() {
    const yes = t('rq.yes'); const no = t('rq.no');
    const header = ['ID', t('rq.col.ref'), t('rq.col.req'), t('rq.family'), t('rq.group'), t('rq.col.carrier'), 'Applicable', t('rq.status'),
      t('cl.justification'), t('cl.decided_by'), t('rq.col.last'), t('common.author'), t('rq.col.links'), t('rq.overdue'), t('rq.stale')];
    const rows = data.res.rows.map((r) => [
      r.item.id, ref(r), loc(r.item.title), familyLabel(r.family), groupLabel(r), carriers(r),
      r.applicable ? yes : `${no} — ${exclusion(r)}`, r.applicable ? statusLabel(r.status) : '',
      r.response?.justification ?? '', r.response?.decided_by ?? '', r.lastAnswer?.ts ?? '', r.lastAnswer?.author ?? '',
      [...r.deadlines.map((d) => `${d.id}${d.due ? ` ${d.due}` : ''} (${t(`state.${d.state}` as MsgKey)})`),
        ...r.deliverables.map((d) => `${d.id} (${d.status === 'untracked' ? t('rq.untracked') : t(`dvs.${d.status}` as MsgKey)})`)].join(' | '),
      r.overdue ? yes : '', r.stale ? yes : '',
    ]);
    const ok = await act((ex) => ex.recordExport('requirements_csv', { rows: rows.length, ref_version: REF_VERSION }));
    if (!ok) return;
    downloadText(`${data.meta.codename ?? 'exercice'}-exigences-${todayISO()}.csv`, '﻿' + toCsv(header, rows));
    notice = t('rq.csv.done', { n: rows.length });
  }

  async function print() {
    const ok = await act((ex) => ex.recordExport('requirements_print', { rows: data.res.rows.length, ref_version: REF_VERSION }));
    if (ok) setTimeout(() => window.print(), 50);
  }
</script>

<div class="print-head" aria-hidden="true">
  <p><strong>{t('rq.print.head', { c: data.meta.codename ?? '', d: formatDate(todayISO()), a: currentExercise().author })}</strong></p>
  <p>{t('rq.print.anchor', { n: data.journal.entries, x: data.journal.lastAnchor ? `#${data.journal.lastAnchor.seq} · ${data.journal.lastAnchor.ts}` : '—' })} · {REF_VERSION}</p>
</div>

<section class="card" aria-labelledby="h-rq">
  <div class="head">
    <div>
      <h2 id="h-rq">{t('rq.title')}</h2>
      <p class="help">{t('rq.help')}</p>
    </div>
    <div class="exports no-print">
      <button type="button" class="ghost" onclick={exportCsv}>{t('rq.export.csv')}</button>
      <button type="button" class="ghost" onclick={print}>{t('rq.print')}</button>
    </div>
  </div>
  {#if notice}<p class="notice" role="status">{notice}</p>{/if}

  <div class="summary">
    <div class="big" data-testid="rq-overall">
      <span class="k-label">{t('rq.overall')}</span>
      <span class="k-value">{pct(data.res.overall)} %</span>
      <span class="help">{t('rq.overall.sub', { h: data.res.overall.handled, t: data.res.overall.total, i: data.res.info, x: data.res.excluded })}</span>
    </div>
    {#each ['standing', 'stepwise'] as const as fam (fam)}
      {@const c = data.res.byFamily[fam]}
      <div class="fam" data-testid={`rq-family-${fam}`}>
        <span class="k-label">{familyLabel(fam)}</span>
        <div class="bar-wrap"><div class="bar" style:width={`${pct(c)}%`}></div></div>
        <span>{c.handled}/{c.total} · {pct(c)} %</span>
      </div>
    {/each}
  </div>

  <div class="dist">
    <div>
      <h3>{t('rq.status.title')}</h3>
      <ul class="chips">
        {#each STATUSES as s (s)}
          <li><button type="button" class="chip {s}" class:on={f.status === s} onclick={() => (f.status = f.status === s ? '' : s)} data-testid={`rq-st-${s}`}>
            {statusLabel(s)} <strong>{data.res.overall[s as keyof Count]}</strong></button></li>
        {/each}
      </ul>
    </div>
    <div>
      <h3>{t('rq.text.title')}</h3>
      <ul class="chips">
        {#each data.res.byText as x (x.key)}
          <li><button type="button" class="chip" class:on={f.textKey === x.key} onclick={() => (f.textKey = f.textKey === x.key ? '' : x.key)}>
            {x.key} <strong>{x.count.handled}/{x.count.total}</strong></button></li>
        {/each}
      </ul>
    </div>
  </div>
</section>

<section class="card filters no-print" aria-label={t('rq.filters')}>
  <label class="grow">{t('rq.search')} <input type="search" bind:value={f.q} data-testid="rq-q" /></label>
  <label>{t('rq.family')}
    <select bind:value={f.family} onchange={() => (f.group = '')}>
      <option value="">{t('rq.all')}</option>
      <option value="standing">{t('rq.family.standing')}</option>
      <option value="stepwise">{t('rq.family.stepwise')}</option>
    </select>
  </label>
  <label>{t('rq.group')}
    <select bind:value={f.group}>
      <option value="">{t('rq.all')}</option>
      {#each groups as g (g.id)}<option value={g.id}>{loc(g.label)}</option>{/each}
    </select>
  </label>
  <label>{t('rq.status')}
    <select bind:value={f.status} data-testid="rq-status">
      <option value="">{t('rq.all')}</option>
      <option value="unhandled">{t('rq.status.unhandled')}</option>
      <option value="handled">{t('rq.status.handled')}</option>
      {#each STATUSES as s (s)}<option value={s}>{statusLabel(s)}</option>{/each}
      <option value="info">{t('st.info')}</option>
    </select>
  </label>
  <label>{t('rq.carrier')}
    <select bind:value={f.carrier}>
      <option value="">{t('rq.all')}</option>
      {#each carrierIds as c (c)}<option value={c}>{loc(actorsById[c]?.label) || c}</option>{/each}
    </select>
  </label>
  <label class="inline"><input type="checkbox" bind:checked={f.overdueOnly} /> {t('rq.overdue')}</label>
  <label class="inline"><input type="checkbox" bind:checked={f.staleOnly} /> {t('rq.stale')}</label>
  <button type="button" class="ghost small" onclick={reset}>{t('rq.reset')}</button>
</section>

<p class="help count" data-testid="rq-count">{t('rq.count', { n: shown.length })}</p>

<div class="card scroll">
  <table class="rq" data-testid="rq-table">
    <thead>
      <tr>
        <th scope="col">{t('rq.col.ref')}</th>
        <th scope="col">{t('rq.col.req')}</th>
        <th scope="col">{t('rq.col.family')}</th>
        <th scope="col">{t('rq.col.carrier')}</th>
        <th scope="col">{t('rq.col.status')}</th>
        <th scope="col">{t('rq.col.links')}</th>
        <th scope="col">{t('rq.col.last')}</th>
      </tr>
    </thead>
    <tbody>
      {#each shown as r (r.item.id)}
        <tr data-req={r.item.id} data-status={r.status} class:late={r.overdue}>
          <td data-label={t('rq.col.ref')}><code>{r.item.id}</code><span class="sub">{ref(r)}</span></td>
          <td data-label={t('rq.col.req')}>
            <strong>{loc(r.item.title)}</strong>
            {#if r.response?.justification}<span class="sub">{t('cl.justification')} : {r.response.justification}{r.response.decided_by ? ` — ${r.response.decided_by}` : ''}</span>{/if}
            {#if r.stale}<span class="sub warn">{t('rq.stale')}</span>{/if}
          </td>
          <td data-label={t('rq.col.family')}><span class="fam-tag {r.family}">{familyLabel(r.family)}</span><span class="sub">{groupLabel(r)}</span></td>
          <td data-label={t('rq.col.carrier')} class="sub-col">{carriers(r)}</td>
          <td data-label={t('rq.col.status')}><span class="st {r.status}">{statusLabel(r.status)}</span></td>
          <td data-label={t('rq.col.links')} class="sub-col">
            {#each r.deadlines as d (d.id)}<span class="link" class:bad={d.state === 'overdue'}>{d.id}{d.due ? ` · ${formatDate(d.due)}` : ''} · {t(`state.${d.state}` as MsgKey)}</span>{/each}
            {#each r.deliverables as d (d.id)}<span class="link">{loc(deliverablesById[d.id]?.label) || d.id} · {d.status === 'untracked' ? t('rq.untracked') : t(`dvs.${d.status}` as MsgKey)}</span>{/each}
          </td>
          <td data-label={t('rq.col.last')} class="sub-col">
            {#if r.lastAnswer}{formatDate(r.lastAnswer.ts.slice(0, 10))}<span class="sub">{r.lastAnswer.author}</span>{/if}
            {#if r.status !== 'info'}<button type="button" class="ghost small no-print" onclick={() => openChecklist(r.family === 'standing' ? 'standing' : r.group)}
              aria-label={`${t('rq.open')} — ${r.item.id}`}>{t('rq.open')}</button>{/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<details class="card excluded" data-testid="rq-excluded">
  <summary>{t('rq.excluded.title', { n: excluded.length })}</summary>
  <p class="help">{t('rq.excluded.help')}</p>
  <ul>
    {#each excluded as r (r.item.id)}
      <li data-excluded={r.item.id}><code>{r.item.id}</code> {loc(r.item.title)} <span class="sub">{ref(r)} — {exclusion(r)}</span></li>
    {/each}
  </ul>
</details>

<style>
  .head { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .exports { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-start; }
  .notice { background: var(--ok-bg); color: var(--ok); padding: 8px 10px; border-radius: 8px; }
  .summary { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 12px; margin-top: 12px; }
  @media (max-width: 760px) { .summary { grid-template-columns: 1fr; } }
  .big, .fam { border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
  .big { border-left: 4px solid var(--oblig); }
  .k-label { font-size: .78rem; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; font-weight: 600; }
  .k-value { font-size: 1.8rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .bar-wrap { height: 8px; background: var(--border); border-radius: 999px; overflow: hidden; }
  .bar { height: 100%; background: var(--ok); }
  .dist { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
  @media (max-width: 760px) { .dist { grid-template-columns: 1fr; } }
  h3 { font-size: .9rem; margin: 6px 0; }
  .chips { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { background: transparent; color: var(--text); border: 1px solid var(--border); border-radius: 999px; padding: 3px 10px; font-size: .82rem; }
  .chip.on { background: var(--accent); color: var(--accent-text); border-color: var(--accent); }
  .filters { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: flex-end; margin-top: 12px; }
  .filters label { display: flex; flex-direction: column; gap: 3px; font-size: .82rem; color: var(--muted); }
  .filters label.grow { flex: 1 1 240px; }
  .filters label.inline { flex-direction: row; align-items: center; gap: 6px; color: var(--text); }
  .count { margin: 10px 0 6px; }
  .scroll { overflow-x: auto; padding: 6px 10px; }
  table.rq { border-collapse: collapse; width: 100%; min-width: 980px; }
  .rq th, .rq td { text-align: left; vertical-align: top; padding: 8px 6px; border-bottom: 1px solid var(--border); font-size: .88rem; }
  .rq thead th { font-size: .75rem; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
  .rq tr.late td:first-child { box-shadow: inset 3px 0 0 var(--bad); }
  .sub { display: block; color: var(--muted); font-size: .8rem; }
  .sub.warn { color: var(--warn); font-weight: 600; }
  .sub-col { color: var(--muted); font-size: .82rem; max-width: 220px; }
  .link { display: block; }
  .link.bad { color: var(--bad); font-weight: 600; }
  code { font-size: .8rem; }
  .fam-tag { font-size: .72rem; font-weight: 700; padding: 1px 7px; border-radius: 4px; border: 1px solid currentColor; }
  .fam-tag.standing { color: var(--oblig); }
  .fam-tag.stepwise { color: var(--accent); }
  .st { font-size: .78rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; white-space: nowrap; background: var(--info-bg); color: var(--info); }
  .st.done, .st.not_applicable { background: var(--ok-bg); color: var(--ok); }
  .st.accepted_gap { background: var(--warn-bg); color: var(--warn); }
  .st.in_progress { background: var(--info-bg); color: var(--accent); }
  .st.open { background: transparent; color: var(--text); border: 1px solid var(--border); }
  .st.info { background: transparent; color: var(--muted); font-style: italic; }
  .small { padding: 3px 8px; font-size: .8rem; margin-top: 4px; }
  .excluded { margin-top: 12px; }
  .excluded summary { cursor: pointer; font-weight: 600; }
  .excluded ul { list-style: none; padding: 0; margin: 8px 0 0; }
  .excluded li { padding: 5px 0; border-top: 1px solid var(--border); font-size: .88rem; }
  .print-head { display: none; }
  @media (max-width: 700px) {
    table.rq { min-width: 0; }
    .rq thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
    .rq tr { display: block; border-bottom: 1px solid var(--border); padding: 8px 0; }
    .rq td { display: flex; justify-content: space-between; gap: 12px; border: 0; padding: 3px 0; }
    .rq td[data-label]::before { content: attr(data-label); color: var(--muted); font-size: .75rem; text-transform: uppercase; flex: 0 0 38%; }
    .sub-col { max-width: none; }
  }
  @media print {
    :global(.topbar), :global(nav.tabs), :global(.bar .actions), :global(.status), .no-print { display: none !important; }
    .print-head { display: block; margin-bottom: 8px; font-size: 11px; }
    :global(body) { background: #fff; color: #000; }
    .scroll { overflow: visible; }
    table.rq { min-width: 0; font-size: 10px; }
    .rq tr { break-inside: avoid; }
    .excluded { display: block; }
    :global(.card) { border: 0; padding: 0; }
  }
</style>
