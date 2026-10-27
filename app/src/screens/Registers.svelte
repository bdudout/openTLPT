<script lang="ts">
  import { formatDate, t, type MsgKey } from '../lib/i18n.svelte.ts';
  import { act, currentExercise, loadState, todayISO, ui } from '../lib/app.svelte.ts';
  import { core } from '../lib/ref.ts';
  import { fingerprint, pickAnyFile, type FileFingerprint } from '../lib/files.ts';
  import {
    computeDeadlinesForProfile, detectionIssues, legUpIssues, reportsOutsideActivePhase,
    type DetectionKind, type DetectionRecord, type Issue, type LegUpKind, type LegUpRecord,
  } from '../../../engine/src/index.ts';

  const LEGUP_KINDS: LegUpKind[] = ['time', 'information', 'access'];
  const DETECTION_KINDS: DetectionKind[] = ['detection', 'suspension', 'limited_purple_teaming', 'real_incident'];

  const data = $derived.by(() => {
    void ui.rev;
    const ex = currentExercise();
    const st = loadState();
    const d07 = computeDeadlinesForProfile(core, st, core.profiles, ex.meta().profile ?? 'entity').find((d) => d.id === 'D-07');
    const reports = ex.listWeeklyReports();
    return {
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
    const ok = await act((ex) => ex.saveLegUp(null, { kind: lKind, planned: lPlanned, description: lDesc.trim(), requested_at: lRequested || null }));
    if (ok) { lDesc = ''; lPlanned = false; }
  }
  async function addDetection(e: SubmitEvent) {
    e.preventDefault();
    if (!dDesc.trim()) return;
    const ok = await act((ex) => ex.saveDetection(null, { detected_at: dDate, kind: dKind, description: dDesc.trim(), measures: dMeasures.trim() || null }));
    if (ok) { dDesc = ''; dMeasures = ''; }
  }
  const setLegUp = (l: LegUpRecord, patch: Partial<LegUpRecord>) => void act((ex) => ex.saveLegUp(l.id, patch));
  const setDetection = (d: DetectionRecord, patch: Partial<DetectionRecord>) => void act((ex) => ex.saveDetection(d.id, patch));
  function del(fn: () => Promise<unknown>) { if (confirm(t('rg.delete.confirm'))) void act(() => fn()); }
</script>

<p class="neutral card">{t('rg.neutral')}</p>

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
    <label class="inline"><input type="checkbox" bind:checked={lPlanned} /> {t('rg.planned')}</label>
    <button type="submit" disabled={!lDesc.trim()}>{t('rg.add')}</button>
  </form>
  {#each data.legups as l (l.id)}
    {@const issues = legUpIssues(l)}
    <article class="entry" data-legup={l.id} class:flagged={issues.length > 0}>
      <p class="title"><strong>{l.kind ? t(`lk.${l.kind}` as MsgKey) : ''}</strong> — {l.description}{l.planned ? ` · ${t('rg.planned')}` : ''}</p>
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
  .issue { margin: 6px 0 0; color: var(--warn); background: var(--warn-bg); padding: 5px 8px; border-radius: 6px; font-size: .88rem; }
  .small { padding: 4px 10px; font-size: .85rem; }
  .danger { color: var(--bad); border-color: var(--bad); }
</style>
