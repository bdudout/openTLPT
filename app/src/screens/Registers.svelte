<script lang="ts">
  import { formatDate, t, type MsgKey } from '../lib/i18n.svelte.ts';
  import { act, currentExercise, loadState, todayISO, ui } from '../lib/app.svelte.ts';
  import { core } from '../lib/ref.ts';
  import { fingerprint, pickAnyFile, type FileFingerprint } from '../lib/files.ts';
  import {
    computeDeadlinesForProfile, detectionIssues, effectiveFacts, legUpIssues, reportsOutsideActivePhase, scenarioIssues,
    type Cia, type DetectionKind, type DetectionRecord, type FlagRecord, type FlagStatus, type Issue, type LegUpKind, type LegUpRecord, type ScenarioRecord,
  } from '../../../engine/src/index.ts';

  const LEGUP_KINDS: LegUpKind[] = ['time', 'information', 'access'];
  const DETECTION_KINDS: DetectionKind[] = ['detection', 'suspension', 'limited_purple_teaming', 'real_incident'];
  const CIA: Cia[] = ['C', 'I', 'A', 'Au'];
  const FLAG_STATUS: FlagStatus[] = ['planned', 'in_progress', 'reached', 'not_reached'];

  const data = $derived.by(() => {
    void ui.rev;
    const ex = currentExercise();
    const st = loadState();
    const d07 = computeDeadlinesForProfile(core, st, core.profiles, ex.meta().profile ?? 'entity').find((d) => d.id === 'D-07');
    const reports = ex.listWeeklyReports();
    const scenarios = ex.listScenarios();
    const flags = ex.listFlags();
    const active = !!st.events.R0 && st.events.R0 <= st.today;
    return {
      scenarios, flags, scIssues: scenarioIssues(scenarios, flags, effectiveFacts(core.facts, st.facts), active),
      reports, legups: ex.listLegUps(), detections: ex.listDetections(), d07,
      outside: reportsOutsideActivePhase(reports, st.events.R0, st.events.R1),
    };
  });

  // Formulaires d'ajout
  let wDate = $state(todayISO());
  let wSummary = $state('');
  let wFile = $state<FileFingerprint | null>(null);
  let lKind = $state<LegUpKind>('access');
  let lPlanned = $state(false);
  let lDesc = $state('');
  let lRequested = $state(todayISO());
  let lScenario = $state<number | ''>('');
  let sLabel = $state('');
  let sThreat = $state(true);
  let sCia = $state<Cia | ''>('');
  let sCif = $state('');
  let sTpp = $state(false);
  let fLabel = $state('');
  let fScenario = $state<number | ''>('');
  let fCia = $state<Cia | ''>('');
  let dDate = $state(todayISO());
  let dKind = $state<DetectionKind>('detection');
  let dDesc = $state('');
  let dMeasures = $state('');

  const issueText = (i: Issue) => t(`is.${i.code}` as MsgKey, { source: i.source.replace(/^RTS-(\d+)\.(\d+)$/, 'RTS $1($2)') });

  async function attachFile() { const f = await pickAnyFile(); if (f) wFile = await fingerprint(f); }

  async function addReport(e: SubmitEvent) {
    e.preventDefault();
    const ok = await act((ex) => ex.saveWeeklyReport(null, {
      report_date: wDate, summary: wSummary.trim() || null, sha256: wFile?.sha256 ?? null, file_name: wFile?.name ?? null,
    }));
    if (ok) { wSummary = ''; wFile = null; }
  }
  async function addLegUp(e: SubmitEvent) {
    e.preventDefault();
    if (!lDesc.trim()) return;
    const ok = await act((ex) => ex.saveLegUp(null, { kind: lKind, planned: lPlanned, description: lDesc.trim(), requested_at: lRequested || null, scenario_id: lScenario === '' ? null : lScenario }));
    if (ok) { lDesc = ''; lPlanned = false; }
  }
  async function addDetection(e: SubmitEvent) {
    e.preventDefault();
    if (!dDesc.trim()) return;
    const ok = await act((ex) => ex.saveDetection(null, { detected_at: dDate, kind: dKind, description: dDesc.trim(), measures: dMeasures.trim() || null }));
    if (ok) { dDesc = ''; dMeasures = ''; }
  }
  async function addScenario(e: SubmitEvent) {
    e.preventDefault();
    if (!sLabel.trim()) return;
    const ok = await act((ex) => ex.saveScenario(null, { label: sLabel.trim(), threat_led: sThreat, cia: sCia || null, cif_label: sCif.trim() || null, includes_tpp: sTpp }));
    if (ok) { sLabel = ''; sCif = ''; sThreat = true; sTpp = false; sCia = ''; }
  }
  async function addFlag(e: SubmitEvent) {
    e.preventDefault();
    if (!fLabel.trim()) return;
    const ok = await act((ex) => ex.saveFlag(null, { label: fLabel.trim(), scenario_id: fScenario === '' ? null : fScenario, cia: fCia || null }));
    if (ok) fLabel = '';
  }
  const setScenario = (s: ScenarioRecord, patch: Partial<ScenarioRecord>) => void act((ex) => ex.saveScenario(s.id, patch));
  const setFlag = (f: FlagRecord, patch: Partial<FlagRecord>) => void act((ex) => ex.saveFlag(f.id, patch));
  const scLabel = (id: number | null) => data.scenarios.find((s) => s.id === id)?.label ?? '—';
  const setLegUp = (l: LegUpRecord, patch: Partial<LegUpRecord>) => void act((ex) => ex.saveLegUp(l.id, patch));
  const setDetection = (d: DetectionRecord, patch: Partial<DetectionRecord>) => void act((ex) => ex.saveDetection(d.id, patch));
  function del(fn: () => Promise<unknown>) { if (confirm(t('rg.delete.confirm'))) void act(() => fn()); }
</script>

<p class="neutral card">{t('rg.neutral')}</p>

<section class="card block" aria-labelledby="h-sc" data-testid="scenarios">
  <h2 id="h-sc">{t('sc.title')}</h2>
  <p class="help">{t('sc.help')}</p>
  {#each data.scIssues.filter((i) => i.recordId === undefined) as i (i.code)}<p class="issue" role="alert" data-issue={i.code}>{issueText(i)}</p>{/each}
  <form class="add" onsubmit={addScenario} data-testid="sc-add">
    <label class="grow">{t('sc.scenario')} <input bind:value={sLabel} required /></label>
    <label>C/I/A <select bind:value={sCia}><option value="">—</option>{#each CIA as c (c)}<option value={c}>{c}</option>{/each}</select></label>
    <label class="grow">{t('sc.cif')} <input bind:value={sCif} /></label>
    <label class="inline"><input type="checkbox" bind:checked={sThreat} /> {t('sc.threatLed')}</label>
    <label class="inline"><input type="checkbox" bind:checked={sTpp} /> {t('sc.tpp')}</label>
    <button type="submit" disabled={!sLabel.trim()}>{t('rg.add')}</button>
  </form>
  {#each data.scenarios as s (s.id)}
    {@const own = data.flags.filter((f) => f.scenario_id === s.id)}
    {@const sIssues = data.scIssues.filter((i) => i.recordId === s.id && i.code === 'scenario_no_flag')}
    <article class="entry" data-scenario={s.id} class:flagged={sIssues.length > 0}>
      <p class="title"><strong>{s.label}</strong>{s.threat_led ? '' : ` · ${t('sc.x')}`}{s.cia ? ` · ${s.cia}` : ''}{s.cif_label ? ` · ${s.cif_label}` : ''}{s.includes_tpp ? ` · ${t('sc.tpp')}` : ''}</p>
      <div class="dates">
        <label class="inline"><input type="checkbox" checked={s.selected} onchange={(e) => setScenario(s, { selected: e.currentTarget.checked })} /> {t('sc.selected')}</label>
        <span class="help">{t('sc.flagCount', { n: own.length, r: own.filter((f) => f.status === 'reached').length })}</span>
        <button type="button" class="ghost danger small" onclick={() => del(() => currentExercise().deleteScenario(s.id))}>{t('rg.delete')}</button>
      </div>
      {#each sIssues as i (i.code)}<p class="issue" role="alert">{issueText(i)}</p>{/each}
    </article>
  {/each}

  <h3>{t('sc.flags')}</h3>
  <form class="add" onsubmit={addFlag} data-testid="flag-add">
    <label class="grow">{t('sc.flag')} <input bind:value={fLabel} required /></label>
    <label>{t('sc.scenario')} <select bind:value={fScenario}><option value="">—</option>{#each data.scenarios as s (s.id)}<option value={s.id}>{s.label}</option>{/each}</select></label>
    <label>C/I/A <select bind:value={fCia}><option value="">—</option>{#each CIA as c (c)}<option value={c}>{c}</option>{/each}</select></label>
    <button type="submit" disabled={!fLabel.trim()}>{t('rg.add')}</button>
  </form>
  {#each data.flags as f (f.id)}
    {@const fIssues = data.scIssues.filter((i) => i.recordId === f.id && i.code === 'flag_no_date')}
    <article class="entry" data-flag={f.id} data-status={f.status} class:flagged={fIssues.length > 0}>
      <p class="title"><strong>{f.label}</strong> · {scLabel(f.scenario_id)}{f.cia ? ` · ${f.cia}` : ''}</p>
      <div class="dates">
        <label>{t('rq.col.status')}
          <select value={f.status} onchange={(e) => setFlag(f, { status: e.currentTarget.value as FlagStatus })}>{#each FLAG_STATUS as st (st)}<option value={st}>{t(`fs.${st}` as MsgKey)}</option>{/each}</select>
        </label>
        <label>{t('sc.reached')} <input type="date" value={f.reached_at ?? ''} onchange={(e) => setFlag(f, { reached_at: e.currentTarget.value || null })} /></label>
        <label class="grow">{t('sc.path')} <input value={f.attack_path ?? ''} onchange={(e) => setFlag(f, { attack_path: e.currentTarget.value.trim() || null })} /></label>
        <label>{t('sc.ttps')} <input value={f.ttps ?? ''} placeholder="T1566, T1078" onchange={(e) => setFlag(f, { ttps: e.currentTarget.value.trim() || null })} /></label>
        <button type="button" class="ghost danger small" onclick={() => del(() => currentExercise().deleteFlag(f.id))}>{t('rg.delete')}</button>
      </div>
      {#each fIssues as i (i.code)}<p class="issue" role="alert">{issueText(i)}</p>{/each}
    </article>
  {:else}<p class="help">{t('rg.empty')}</p>{/each}
</section>

<section class="card block" aria-labelledby="h-weekly" data-testid="weekly">
  <h2 id="h-weekly">{t('rg.weekly')}</h2>
  <p class="help">{t('rg.weekly.help')}</p>
  {#if data.d07?.periods}
    <p class="status" data-testid="d07-status">{t('rg.weekly.status', { covered: data.d07.periods.filter((p) => p.covered).length, total: data.d07.periods.length })}</p>
  {/if}
  {#if data.outside.length}<p class="help">{t('rg.weekly.outside', { n: data.outside.length })}</p>{/if}
  <form class="add" onsubmit={addReport}>
    <label>{t('rg.date')} <input type="date" bind:value={wDate} required /></label>
    <label class="grow">{t('rg.summary')} <input bind:value={wSummary} /></label>
    <button type="button" class="ghost" onclick={attachFile}>{wFile ? wFile.name : t('rg.withfile')}</button>
    <button type="submit">{t('rg.add')}</button>
  </form>
  <ul class="entries">
    {#each data.reports as r (r.id)}
      <li data-report={r.id}>
        <time datetime={r.report_date}>{formatDate(r.report_date)}</time>
        <span>{r.summary ?? ''}</span>
        {#if r.sha256}<code title={r.sha256}>{r.file_name ?? ''} · {r.sha256.slice(0, 12)}…</code>{/if}
        <button type="button" class="ghost danger small" onclick={() => del(() => currentExercise().deleteWeeklyReport(r.id))}>{t('rg.delete')}</button>
      </li>
    {:else}<li class="help">{t('rg.empty')}</li>{/each}
  </ul>
</section>

<section class="card block" aria-labelledby="h-legups" data-testid="legups">
  <h2 id="h-legups">{t('rg.legups')}</h2>
  <p class="help">{t('rg.legups.help')}</p>
  <form class="add" onsubmit={addLegUp}>
    <label>{t('rg.kind')}
      <select bind:value={lKind}>{#each LEGUP_KINDS as k (k)}<option value={k}>{t(`lk.${k}` as MsgKey)}</option>{/each}</select>
    </label>
    <label class="grow">{t('rg.description')} <input bind:value={lDesc} required /></label>
    <label>{t('rg.requested')} <input type="date" bind:value={lRequested} /></label>
    {#if data.scenarios.length}<label>{t('sc.scenario')} <select bind:value={lScenario}><option value="">—</option>{#each data.scenarios as s (s.id)}<option value={s.id}>{s.label}</option>{/each}</select></label>{/if}
    <label class="inline"><input type="checkbox" bind:checked={lPlanned} /> {t('rg.planned')}</label>
    <button type="submit" disabled={!lDesc.trim()}>{t('rg.add')}</button>
  </form>
  {#each data.legups as l (l.id)}
    {@const issues = legUpIssues(l)}
    <article class="entry" data-legup={l.id} class:flagged={issues.length > 0}>
      <p class="title"><strong>{l.kind ? t(`lk.${l.kind}` as MsgKey) : ''}</strong> — {l.description}{l.planned ? ` · ${t('rg.planned')}` : ''}{l.scenario_id ? ` · ${scLabel(l.scenario_id)}` : ''}</p>
      <div class="dates">
        <label>{t('rg.approved_ct')} <input type="date" value={l.approved_ct ?? ''} onchange={(e) => setLegUp(l, { approved_ct: e.currentTarget.value || null })} /></label>
        <label>{t('rg.approved_tm')} <input type="date" value={l.approved_tm ?? ''} onchange={(e) => setLegUp(l, { approved_tm: e.currentTarget.value || null })} /></label>
        <label>{t('rg.provided')} <input type="date" value={l.provided_at ?? ''} onchange={(e) => setLegUp(l, { provided_at: e.currentTarget.value || null })} /></label>
        <button type="button" class="ghost danger small" onclick={() => del(() => currentExercise().deleteLegUp(l.id))}>{t('rg.delete')}</button>
      </div>
      {#each issues as i (i.code)}<p class="issue" role="alert">{issueText(i)}</p>{/each}
    </article>
  {:else}<p class="help">{t('rg.empty')}</p>{/each}
</section>

<section class="card block" aria-labelledby="h-det" data-testid="detections">
  <h2 id="h-det">{t('rg.detections')}</h2>
  <p class="help">{t('rg.detections.help')}</p>
  <form class="add" onsubmit={addDetection}>
    <label>{t('rg.date')} <input type="date" bind:value={dDate} required /></label>
    <label>{t('rg.kind')}
      <select bind:value={dKind}>{#each DETECTION_KINDS as k (k)}<option value={k}>{t(`dk.${k}` as MsgKey)}</option>{/each}</select>
    </label>
    <label class="grow">{t('rg.description')} <input bind:value={dDesc} required /></label>
    <label class="grow">{t('rg.measures')} <input bind:value={dMeasures} /></label>
    <button type="submit" disabled={!dDesc.trim()}>{t('rg.add')}</button>
  </form>
  {#each data.detections as d (d.id)}
    {@const issues = detectionIssues(d)}
    <article class="entry" data-detection={d.id} class:flagged={issues.length > 0}>
      <p class="title"><time datetime={d.detected_at}>{formatDate(d.detected_at)}</time> · <strong>{t(`dk.${d.kind}` as MsgKey)}</strong> — {d.description}</p>
      {#if d.measures}<p class="help">{t('rg.measures')} : {d.measures}</p>{/if}
      <div class="dates">
        <label>{t('rg.validated')} <input type="date" value={d.validated_by_tm_at ?? ''} onchange={(e) => setDetection(d, { validated_by_tm_at: e.currentTarget.value || null })} /></label>
        <button type="button" class="ghost danger small" onclick={() => del(() => currentExercise().deleteDetection(d.id))}>{t('rg.delete')}</button>
      </div>
      {#each issues as i (i.code)}<p class="issue" role="alert">{issueText(i)}</p>{/each}
    </article>
  {:else}<p class="help">{t('rg.empty')}</p>{/each}
</section>

<style>
  .neutral { background: var(--warn-bg); color: var(--warn); border-color: transparent; margin: 0 0 12px; padding: 10px 14px; }
  .block { margin-bottom: 14px; }
  .status { font-weight: 600; margin: 6px 0; }
  .add { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: flex-end; margin: 10px 0; }
  .add label { display: flex; flex-direction: column; gap: 3px; font-size: .85rem; color: var(--muted); }
  .add label.grow { flex: 1 1 220px; }
  .add label.inline { flex-direction: row; align-items: center; gap: 6px; color: var(--text); }
  .entries { list-style: none; padding: 0; margin: 0; }
  .entries li { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 6px 0; border-top: 1px solid var(--border); }
  .entries time { font-weight: 600; }
  code { font-size: .78rem; background: var(--info-bg); padding: 2px 6px; border-radius: 4px; }
  .entry { border-top: 1px solid var(--border); padding: 8px 0; }
  .entry.flagged { border-left: 4px solid var(--warn); padding-left: 10px; }
  .title { margin: 0 0 6px; }
  .dates { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: flex-end; }
  .dates label { display: flex; flex-direction: column; gap: 3px; font-size: .85rem; color: var(--muted); }
  .dates label.inline { flex-direction: row; align-items: center; gap: 6px; color: var(--text); }
  .dates label.grow { flex: 1 1 220px; }
  h3 { font-size: 1rem; margin: 16px 0 4px; }
  .issue { margin: 6px 0 0; color: var(--warn); background: var(--warn-bg); padding: 5px 8px; border-radius: 6px; font-size: .88rem; }
  .small { padding: 4px 10px; font-size: .85rem; }
  .danger { color: var(--bad); border-color: var(--bad); }
</style>
