// Trames de comité : modèle de présentation (diapositives et blocs), indépendant du format de sortie.
// Confidentialité : seul le nom de code apparaît ; la trame « organe de direction » n'expose que des agrégats.
import { formatDate, loc, t, type MsgKey } from './i18n.svelte.ts';
import { actorsById, core, eventsById, phasesById } from './ref.ts';
import type { Snapshot } from './snapshot.ts';
import { diffDays, type ActionItem, type Count, type DeadlineResult, type Progress } from '../../../engine/src/index.ts';

export type CommitteeKind = 'control_team' | 'management' | 'authority' | 'rt_weekly' | 'provider_client';

/** Supports proposés selon le profil : l'entité pilote les comités ; un prestataire rend compte à son client (CT) et, pour la RT, chaque semaine au CT et aux TM (RTS 11(7)). */
export function committeesFor(profile: string): CommitteeKind[] {
  if (profile === 'rt' || profile === 'ti_rt') return ['rt_weekly', 'provider_client'];
  if (profile === 'ti') return ['provider_client'];
  return ['control_team', 'management', 'authority'];
}
export type Tone = 'ok' | 'warn' | 'bad' | 'info' | undefined;

export type Block =
  | { kind: 'kpis'; items: { label: string; value: string; sub?: string; tone?: Tone }[] }
  | { kind: 'table'; head: string[]; rows: string[][]; widths: number[]; tones?: Tone[]; empty: string }
  | { kind: 'bullets'; title?: string; items: string[]; empty?: string };

export interface Slide { title: string; blocks: Block[] }
export interface Deck { kind: CommitteeKind; fileTitle: string; title: string; subtitle: string; footer: string; slides: Slide[] }

const pct = (p: Progress | Count) => (p.total ? Math.round((100 * p.handled) / p.total) : 0);
const ev = (id?: string) => (id ? loc(eventsById[id]?.label) || id : '');
const phase = (id?: string) => (id ? loc(phasesById[id]?.label) : '');
const dl = (id: string) => loc(core.deadlines.find((d) => d.id === id)?.label);
const carriers = (id: string) => (core.deadlines.find((d) => d.id === id)?.carriers ?? []).map((c) => loc(actorsById[c]?.label) || c).join(', ');
const state = (r: DeadlineResult) => t(`state.${r.state}` as MsgKey);
const when = (a: ActionItem) => (a.overdue ? t('db.late', { n: -a.daysLeft }) : a.daysLeft === 0 ? t('db.today') : t('db.in', { n: a.daysLeft }));
const toneOf = (s: string): Tone => (s === 'overdue' || s === 'min_violated' ? 'bad' : s === 'due_soon' || s === 'done_late' || s === 'recurring_missing' ? 'warn' : s.startsWith('done') || s === 'min_met' ? 'ok' : undefined);

function kpis(s: Snapshot, detail: boolean): Block {
  const k = s.dash.kpis;
  const items: { label: string; value: string; sub?: string; tone?: Tone }[] = [
    { label: t('kpi.compliance'), value: `${pct(s.dash.overall.total)} %`, sub: t('kpi.compliance.sub', { s: `${s.dash.overall.standing.handled}/${s.dash.overall.standing.total}`, w: `${s.dash.overall.stepwise.handled}/${s.dash.overall.stepwise.total}` }) },
    { label: t('kpi.overdue'), value: String(k.overdueDeadlines), tone: k.overdueDeadlines ? 'bad' : 'ok' },
  ];
  if (k.preparationDaysLeft !== undefined) items.push({ label: t('kpi.prep'), value: k.preparationDaysLeft >= 0 ? t('kpi.days', { n: k.preparationDaysLeft }) : t('kpi.days.late', { n: -k.preparationDaysLeft }), sub: t('kpi.prep.sub'), tone: k.preparationDaysLeft < 0 ? 'bad' : k.preparationDaysLeft <= 30 ? 'warn' : undefined });
  if (k.activeWeek !== undefined) items.push({ label: t('kpi.active'), value: `${t('kpi.active.value', { n: k.activeWeek })} / 12+`, ...(k.activeMinEnd ? { sub: t('kpi.active.sub', { d: formatDate(k.activeMinEnd) }) } : {}) });
  else if (k.activeDurationDays !== undefined) items.push({ label: t('kpi.active'), value: t('kpi.active.done', { w: Math.floor(k.activeDurationDays / 7), d: k.activeDurationDays }), tone: k.activeDurationDays < 84 ? 'bad' : 'ok' });
  if (k.closureDaysLeft !== undefined) items.push({ label: t('kpi.closure'), value: k.closureDaysLeft >= 0 ? t('kpi.days', { n: k.closureDaysLeft }) : t('kpi.days.late', { n: -k.closureDaysLeft }), sub: t('kpi.closure.sub'), tone: k.closureDaysLeft < 0 ? 'bad' : undefined });
  if (k.slippage) items.push({ label: t('kpi.planning'), value: `${k.slippage.slipped}/${k.slippage.tracked}`, sub: t('kpi.planning.sub', { n: k.slippage.maxDays }), tone: k.slippage.slipped ? 'warn' : 'ok' });
  if (k.deliverables) items.push({ label: t('kpi.deliverables'), value: `${k.deliverables.submitted}/${k.deliverables.expected}`, sub: t('kpi.deliverables.sub', { a: k.deliverables.approved, h: k.deliverables.fingerprinted }) });
  if (detail) {
    if (k.weekly) items.push({ label: t('kpi.weekly'), value: `${k.weekly.covered}/${k.weekly.total}`, sub: t('kpi.weekly.sub'), tone: k.weekly.covered < k.weekly.total ? 'warn' : 'ok' });
    if (k.flags) items.push({ label: t('kpi.flags'), value: `${k.flags.reached}/${k.flags.total}`, sub: t('kpi.flags.sub', { n: k.flags.notReached, s: k.flags.scenarios }) });
    items.push({ label: t('kpi.legups'), value: String(k.legups.total), sub: t('kpi.legups.sub', { u: k.legups.unplanned, f: k.legups.flagged }), tone: k.legups.flagged ? 'warn' : undefined });
    items.push({ label: t('kpi.detections'), value: String(k.detections.total), sub: t('kpi.detections.sub', { u: k.detections.unvalidated }), tone: k.detections.unvalidated ? 'warn' : undefined });
  }
  return { kind: 'kpis', items: items.slice(0, 8) };
}

function context(s: Snapshot): Block {
  const d = s.dash;
  const items = [
    d.currentPhase ? t('db.phase.current', { p: phase(d.currentPhase) }) : t('db.phase.none'),
    ...(d.kpis.dayOfTlpt !== undefined ? [t('db.day', { n: d.kpis.dayOfTlpt })] : []),
    ...(d.nextMilestone ? [t('db.next', { e: ev(d.nextMilestone.event), d: formatDate(d.nextMilestone.date) })] : []),
    t('db.framework', { f: `DORA / RTS 2025/1190${s.facts.national_framework && s.facts.national_framework !== 'none' ? ` + ${s.facts.national_framework}` : ''} + TIBER-EU` }),
  ];
  return { kind: 'bullets', items };
}

function actionsTable(s: Snapshot): Block {
  const rows: string[][] = [];
  const tones: Tone[] = [];
  for (const [list, horizon] of [[s.dash.thisWeek, t('pp.h.week')], [s.dash.upcoming, t('pp.h.upstream')], [s.dash.toStart, t('pp.h.tostart')]] as const) {
    for (const a of list) {
      const label = a.kind === 'weekly_report' ? t('db.weekly.item', { d: formatDate(a.due) }) : dl(a.id);
      const extra = a.startBy ? `\n${t('pp.startBy', { d: formatDate(a.startBy) })}` : a.forecast ? ` (${t('dl.forecast')})` : '';
      rows.push([label + extra, a.id, carriers(a.id), formatDate(a.due), when(a), horizon]);
      tones.push(a.overdue ? 'bad' : horizon === t('pp.h.week') ? 'warn' : undefined);
    }
  }
  return { kind: 'table', head: [t('dl.col.deadline'), 'ID', t('dl.col.carriers'), t('dl.col.due'), t('pp.col.delay'), t('pp.col.horizon')], rows, tones, widths: [4.2, 0.8, 2.6, 1.6, 1.6, 1.5], empty: t('db.week.empty') };
}

function milestonesTable(s: Snapshot): Block {
  const rows = s.dash.timeline.map((p) => {
    const dated = p.events.filter((e) => e.date || e.planned);
    const slip = (n?: number) => (n ? ` [${n > 0 ? t('ev.slip.late', { n }) : t('ev.slip.early', { n: -n })}]` : '');
    return [phase(p.phase), t(`ps.${p.status}` as MsgKey), p.start ? formatDate(p.start) : '—', p.end ? formatDate(p.end) : '—',
      dated.map((e) => `${formatDate(e.date ?? e.planned)}${e.date ? '' : ` (${t('ev.planned.short')})`} : ${ev(e.event)}${slip(e.slipDays)}`).join('\n') || '—'];
  });
  const tones: Tone[] = s.dash.timeline.map((p) => (p.status === 'done' ? 'ok' : p.status === 'in_progress' ? 'info' : undefined));
  return { kind: 'table', head: [t('pp.col.phase'), t('rq.col.status'), t('pp.col.start'), t('pp.col.end'), t('pp.col.events')], rows, tones, widths: [2.3, 1.3, 1.5, 1.5, 5.7], empty: '' };
}

function complianceTable(s: Snapshot): Block {
  const rows = s.dash.compliance.map((c) => [
    c.step === 'standing' ? t('db.step.standing') : phase(c.step), `${c.progress.handled}/${c.progress.total}`, `${pct(c.progress)} %`, String(c.overdue), String(c.dueSoon),
  ]);
  const tones: Tone[] = s.dash.compliance.map((c) => (c.overdue ? 'bad' : c.progress.total && c.progress.handled === c.progress.total ? 'ok' : undefined));
  return { kind: 'table', head: [t('db.col.step'), t('pp.col.handled'), '%', t('db.col.late'), t('db.col.soon')], rows, tones, widths: [4.5, 2, 1.5, 2, 2], empty: '' };
}

function deliverablesTable(s: Snapshot, withHash: boolean): Block {
  const rows: string[][] = [];
  const tones: Tone[] = [];
  for (const r of s.dRows.rows) {
    const rec = r.record;
    const deadlines = r.deadlines.map((d) => `${d.id}${d.due ? ` ${formatDate(d.due)}` : ''} · ${state(d)}`).join('\n') || '—';
    const row = [loc(r.def.label), phase(r.def.phase), t(`dvs.${rec?.status ?? 'expected'}` as MsgKey),
      rec?.submitted_at ? formatDate(rec.submitted_at) : '—', rec?.approved_at ? formatDate(rec.approved_at) : '—', deadlines];
    if (withHash) row.push(rec?.sha256 ? `${rec.sha256.slice(0, 16)}…` : '—');
    rows.push(row);
    tones.push(r.deadlines.some((d) => d.state === 'overdue') ? 'bad' : rec?.status === 'approved' ? 'ok' : undefined);
  }
  const head = [t('pp.col.deliverable'), t('pp.col.phase'), t('rq.col.status'), t('dv.submitted'), t('dv.approved'), t('pp.col.deadlines')];
  const widths = withHash ? [3.3, 1.6, 1.2, 1.3, 1.3, 2.2, 1.4] : [3.8, 1.8, 1.4, 1.5, 1.5, 2.3];
  if (withHash) head.push('SHA-256');
  return { kind: 'table', head, rows, tones, widths, empty: '' };
}

function legupsTable(s: Snapshot): Block {
  const rows = s.legups.map((l) => [l.kind ? t(`lk.${l.kind}` as MsgKey) : '—', l.description, l.planned ? t('rq.yes') : t('rq.no'),
    l.approved_ct ? formatDate(l.approved_ct) : '—', l.approved_tm ? formatDate(l.approved_tm) : '—', l.provided_at ? formatDate(l.provided_at) : '—']);
  const tones: Tone[] = s.legups.map((l) => (s.dash.alerts.some((a) => a.kind === 'legup' && a.recordId === l.id) ? 'warn' : undefined));
  return { kind: 'table', head: [t('rg.kind'), t('rg.description'), t('rg.planned'), t('rg.approved_ct'), t('rg.approved_tm'), t('rg.provided')], rows, tones, widths: [1.4, 4.5, 1.6, 1.5, 1.5, 1.5], empty: t('rg.empty') };
}

function detectionsTable(s: Snapshot): Block {
  const rows = s.detections.map((d) => [formatDate(d.detected_at), t(`dk.${d.kind}` as MsgKey), d.description, d.measures ?? '—', d.validated_by_tm_at ? formatDate(d.validated_by_tm_at) : '—']);
  const tones: Tone[] = s.detections.map((d) => (s.dash.alerts.some((a) => a.kind === 'detection' && a.recordId === d.id) ? 'warn' : undefined));
  return { kind: 'table', head: [t('rg.date'), t('rg.kind'), t('rg.description'), t('rg.measures'), t('rg.validated')], rows, tones, widths: [1.4, 2, 3.8, 3.2, 1.6], empty: t('rg.empty') };
}

function alertsBullets(s: Snapshot, aggregated: boolean): Block {
  if (aggregated) {
    const k = s.dash.kpis;
    return { kind: 'bullets', title: t('db.alerts'), items: [
      ...(k.legups.flagged ? [t('pp.agg.legups', { n: k.legups.flagged })] : []),
      ...(k.detections.unvalidated ? [t('pp.agg.detections', { n: k.detections.unvalidated })] : []),
      ...(s.dash.alerts.some((a) => a.kind === 'facts') ? [t('pp.agg.facts', { n: s.dash.alerts.filter((a) => a.kind === 'facts').length })] : []),
      ...(s.dash.alerts.some((a) => a.kind === 'order') ? [t('pp.agg.order')] : []),
    ], empty: t('db.alerts.empty') };
  }
  const items = s.dash.alerts.map((a) => a.kind === 'order'
    ? t('is.event_order', { source: a.label.split('<').map((x) => ev(x)).join(' < ') })
    : a.kind === 'facts' ? `${t(`is.${a.code}` as MsgKey)} (${a.source})`
    : `${t(`is.${a.code}` as MsgKey, { source: (a.source ?? '').replace(/^RTS-(\d+)\.(\d+)$/, 'RTS $1($2)') })}${a.label ? ` — ${a.label}` : ''}`);
  return { kind: 'bullets', title: t('db.alerts'), items, empty: t('db.alerts.empty') };
}

function decisionsBullets(s: Snapshot, management: boolean): Block {
  const gaps = s.req.rows.filter((r) => r.applicable && r.status === 'accepted_gap');
  const items: string[] = [];
  for (const r of s.req.rows.filter((x) => x.applicable && x.overdue)) items.push(t('pp.dec.overdue', { id: r.item.id, t: loc(r.item.title) }));
  if (management) {
    if (gaps.length) items.push(t('pp.dec.gaps.count', { n: gaps.length }));
    const d02 = s.deadlines.find((d) => d.id === 'D-02');
    if (d02 && !d02.state.startsWith('done') && d02.state !== 'waiting_anchor') items.push(t('pp.dec.ssd', { d: formatDate(d02.due) }));
  } else {
    for (const g of gaps) items.push(t('pp.dec.gap', { id: g.item.id, t: loc(g.item.title), j: g.response?.justification ?? '', who: g.response?.decided_by ?? '' }));
  }
  if (s.dash.kpis.staleAnswers) items.push(t('pp.dec.stale', { n: s.dash.kpis.staleAnswers }));
  return { kind: 'bullets', title: t('pp.decisions'), items, empty: t('pp.dec.none') };
}

function nextBullets(s: Snapshot): Block {
  return { kind: 'bullets', title: t('db.expected'), items: s.dash.expectedEvents.map((e) => `${ev(e.event)} (${phase(e.phase)})`), empty: '—' };
}

const inWeek = (d: string | null | undefined, s: Snapshot) => !!d && d <= s.st.today && diffDays(d, s.st.today) < 7;

function weekBullets(s: Snapshot): Block {
  const last = [...s.reports].sort((a, b) => b.report_date.localeCompare(a.report_date))[0];
  const items = [
    ...(last ? [t('pp.wk.lastReport', { d: formatDate(last.report_date), s: last.summary ?? '—' })] : [t('pp.wk.noReport')]),
    ...s.legups.filter((l) => inWeek(l.requested_at ?? l.provided_at, s)).map((l) => t('pp.wk.legup', { d: l.description })),
    ...s.detections.filter((d) => inWeek(d.detected_at, s)).map((d) => `${t(`dk.${d.kind}` as MsgKey)} : ${d.description}`),
    t('pp.wk.fill'),
  ];
  return { kind: 'bullets', title: t('pp.wk.activities'), items };
}

function blockersBullets(s: Snapshot): Block {
  const items = [
    ...s.legups.filter((l) => !l.provided_at && (!l.approved_ct || !l.approved_tm)).map((l) => t('pp.wk.legup.pending', { d: l.description, ct: l.approved_ct ? '✓' : '…', tm: l.approved_tm ? '✓' : '…' })),
    ...s.detections.filter((d) => !d.validated_by_tm_at).map((d) => t('pp.wk.det.pending', { d: d.description })),
    ...s.dash.alerts.filter((a) => a.kind === 'legup' || a.kind === 'detection').map((a) => t(`is.${a.code}` as MsgKey, { source: (a.source ?? '').replace(/^RTS-(\d+)\.(\d+)$/, 'RTS $1($2)') })),
  ];
  return { kind: 'bullets', title: t('pp.wk.blockers'), items, empty: t('pp.wk.blockers.none') };
}

function nextWeekBullets(s: Snapshot): Block {
  const items = [
    ...[...s.dash.thisWeek, ...s.dash.upcoming].filter((a) => a.daysLeft <= 14).map((a) => `${a.kind === 'weekly_report' ? t('db.weekly.item', { d: formatDate(a.due) }) : `${a.id} — ${dl(a.id)}`} (${formatDate(a.due)})`),
    ...s.dash.expectedEvents.map((e) => ev(e.event)),
    t('pp.wk.fill'),
  ];
  return { kind: 'bullets', title: t('pp.wk.next'), items };
}

function reportsTable(s: Snapshot): Block {
  const rows = [...s.reports].sort((a, b) => b.report_date.localeCompare(a.report_date)).map((r) => [formatDate(r.report_date), r.summary ?? '—', r.sha256 ? `${r.sha256.slice(0, 16)}…` : '—']);
  return { kind: 'table', head: [t('rg.date'), t('rg.summary'), 'SHA-256'], rows, widths: [1.6, 7.4, 2.4], empty: t('rg.empty') };
}

function flagsTable(s: Snapshot): Block {
  const scen = new Map(s.scenarios.map((x) => [x.id, x]));
  const rows: string[][] = []; const tones: Tone[] = [];
  for (const x of s.scenarios.filter((y) => y.selected)) {
    const fs = s.flags.filter((f) => f.scenario_id === x.id);
    for (const f of fs.length ? fs : [undefined]) {
      rows.push([`${x.label}${x.threat_led ? '' : ' (X)'}`, f?.label ?? '—', f?.cia ?? x.cia ?? '—', f ? t(`fs.${f.status}` as MsgKey) : '—', f?.reached_at ? formatDate(f.reached_at) : '—', f?.attack_path ?? '—']);
      tones.push(f?.status === 'reached' ? 'ok' : f?.status === 'not_reached' ? 'bad' : f?.status === 'in_progress' ? 'info' : undefined);
    }
  }
  for (const f of s.flags.filter((y) => y.scenario_id === null || !scen.get(y.scenario_id)?.selected)) {
    rows.push(['—', f.label, f.cia ?? '—', t(`fs.${f.status}` as MsgKey), f.reached_at ? formatDate(f.reached_at) : '—', f.attack_path ?? '—']);
    tones.push(undefined);
  }
  return { kind: 'table', head: [t('sc.scenario'), t('sc.flag'), 'C/I/A', t('rq.col.status'), t('sc.reached'), t('sc.path')], rows, tones, widths: [2.6, 2.6, 0.9, 1.4, 1.4, 2.5], empty: t('rg.empty') };
}

function regulatoryTable(s: Snapshot): Block {
  const list = s.deadlines.filter((d) => d.display === 'check' && d.state !== 'not_applicable');
  const rows = list.map((d) => [d.id, dl(d.id), core.deadlines.find((x) => x.id === d.id)?.sources.join(', ') ?? '', d.due ? formatDate(d.due) : '—', state(d), d.doneOn ? formatDate(d.doneOn) : '—']);
  return { kind: 'table', head: ['ID', t('dl.col.deadline'), t('pp.col.source'), t('dl.col.due'), t('dl.col.state'), t('dl.col.done')], rows, tones: list.map((d) => toneOf(d.state)), widths: [0.8, 4.6, 1.6, 1.7, 1.8, 1.7], empty: '' };
}

export function buildDeck(kind: CommitteeKind, s: Snapshot): Deck {
  const codename = s.meta.codename ?? '';
  const name = t(`pp.kind.${kind}` as MsgKey);
  const today = formatDate(s.st.today);
  const footer = t('pp.footer', { c: codename, d: today });
  const subtitle = `${today} · ${s.dash.currentPhase ? t('db.phase.current', { p: phase(s.dash.currentPhase) }) : t('db.phase.none')}${s.dash.kpis.dayOfTlpt !== undefined ? ` · ${t('db.day', { n: s.dash.kpis.dayOfTlpt })}` : ''}`;
  let slides: Slide[];
  if (kind === 'control_team') {
    slides = [
      { title: t('pp.s.summary'), blocks: [kpis(s, true), context(s)] },
      { title: t('pp.s.actions'), blocks: [actionsTable(s)] },
      { title: t('db.timeline'), blocks: [milestonesTable(s)] },
      { title: t('db.compliance'), blocks: [complianceTable(s)] },
      { title: t('tab.deliverables'), blocks: [deliverablesTable(s, true)] },
      ...(s.scenarios.length || s.flags.length ? [{ title: t('sc.title'), blocks: [flagsTable(s)] }] : []),
      { title: t('rg.legups'), blocks: [legupsTable(s)] },
      { title: t('pp.s.detections'), blocks: [detectionsTable(s)] },
      { title: t('pp.s.alerts'), blocks: [alertsBullets(s, false), decisionsBullets(s, false)] },
      { title: t('pp.s.next'), blocks: [nextBullets(s)] },
    ];
  } else if (kind === 'management') {
    slides = [
      { title: t('pp.s.exec'), blocks: [kpis(s, false), context(s)] },
      { title: t('pp.s.milestones'), blocks: [milestonesTable(s)] },
      { title: t('db.compliance'), blocks: [complianceTable(s)] },
      { title: t('pp.s.deliverables.key'), blocks: [deliverablesTable(s, false)] },
      { title: t('pp.s.attention'), blocks: [decisionsBullets(s, true), alertsBullets(s, true)] },
    ];
  } else if (kind === 'rt_weekly') {
    slides = [
      { title: t('pp.s.week'), blocks: [kpis(s, true), context(s)] },
      { title: t('pp.wk.activities'), blocks: [weekBullets(s)] },
      { title: t('sc.title'), blocks: [flagsTable(s)] },
      { title: t('rg.legups'), blocks: [legupsTable(s)] },
      { title: t('pp.s.detections'), blocks: [detectionsTable(s)] },
      { title: t('pp.wk.blockers'), blocks: [blockersBullets(s)] },
      { title: t('pp.wk.next'), blocks: [nextWeekBullets(s)] },
      { title: t('rg.weekly'), blocks: [reportsTable(s)] },
    ];
  } else if (kind === 'provider_client') {
    slides = [
      { title: t('pp.s.summary'), blocks: [kpis(s, false), context(s)] },
      { title: t('pp.s.ownDeadlines'), blocks: [regulatoryTable(s)] },
      { title: t('pp.s.ownDeliverables'), blocks: [deliverablesTable(s, true)] },
      { title: t('db.compliance'), blocks: [complianceTable(s)] },
      { title: t('pp.s.attention'), blocks: [decisionsBullets(s, false), alertsBullets(s, false)] },
      { title: t('pp.s.next'), blocks: [nextBullets(s), actionsTable(s)] },
    ];
  } else {
    slides = [
      { title: t('pp.s.regulatory'), blocks: [regulatoryTable(s)] },
      { title: t('pp.s.deliverables.sent'), blocks: [deliverablesTable(s, true)] },
      { title: t('rg.legups'), blocks: [legupsTable(s)] },
      { title: t('pp.s.detections'), blocks: [detectionsTable(s)] },
      { title: t('pp.s.next'), blocks: [nextBullets(s), actionsTable(s)] },
    ];
  }
  return {
    kind, title: `${name} — TLPT ${codename}`, subtitle, footer, slides,
    fileTitle: `${codename}-${t(`pp.file.${kind}` as MsgKey)}-${s.st.today}`,
  };
}
