<script lang="ts">
  import { formatDate, loc, t, type MsgKey } from '../lib/i18n.svelte.ts';
  import { act, currentExercise, loadState, ui } from '../lib/app.svelte.ts';
  import { actorsById, core, phasesById } from '../lib/ref.ts';
  import { fingerprint, pickAnyFile } from '../lib/files.ts';
  import {
    computeDeadlinesForProfile, deliverableRows, effectiveFacts, type DeliverableRecord, type DeliverableStatus,
  } from '../../../engine/src/index.ts';

  interface UiDeliverable { id: string; label: Record<string, string>; phase: string; producers: string[]; recipients?: string[]; annex?: string; sensitive?: boolean; profiles?: string[] }

  const STATUSES: DeliverableStatus[] = ['expected', 'draft', 'submitted', 'approved', 'rejected', 'not_applicable'];
  const view = $derived.by(() => {
    void ui.rev;
    const ex = currentExercise();
    const st = loadState();
    return deliverableRows(core.deliverables as unknown as UiDeliverable[], ex.listDeliverables(), core.deadlines,
      computeDeadlinesForProfile(core, st, core.profiles, ex.meta().profile ?? 'entity'), core.profiles, ex.meta().profile ?? 'entity', effectiveFacts(core.facts, st.facts));
  });
  let verifyResult = $state<Record<string, { ok: boolean; msg: string }>>({});
  let newTitle = $state('');

  const actors = (ids: string[] | undefined) => (ids ?? []).map((a) => loc(actorsById[a]?.label) || a).join(', ');
  const tone: Record<string, string> = { overdue: 'bad', due_soon: 'warn', done_late: 'warn', done_on_time: 'ok', upcoming: 'info' };

  /** Enregistre un champ ; crée le suivi s'il n'existe pas encore. */
  function setField(def: UiDeliverable | null, rec: DeliverableRecord | undefined, patch: Partial<DeliverableRecord>) {
    void act((ex) => rec
      ? ex.saveDeliverable(rec.id, patch)
      : ex.saveDeliverable(null, { deliverable_ref: def?.id ?? null, title: def ? loc(def.label) : newTitle, status: 'expected', ...patch }));
  }

  async function computeHash(def: UiDeliverable | null, rec: DeliverableRecord | undefined) {
    const file = await pickAnyFile();
    if (!file) return;
    const fp = await fingerprint(file);
    setField(def, rec, { sha256: fp.sha256, file_name: fp.name, file_size: fp.size });
  }

  async function verify(key: string, rec: DeliverableRecord) {
    const file = await pickAnyFile();
    if (!file) return;
    const fp = await fingerprint(file);
    const ok = fp.sha256 === rec.sha256;
    verifyResult[key] = { ok, msg: ok ? t('dv.hash.match', { name: fp.name }) : t('dv.hash.mismatch', { name: fp.name }) };
  }

  function remove(rec: DeliverableRecord) {
    if (confirm(t('dv.delete.confirm'))) void act((ex) => ex.deleteDeliverable(rec.id));
  }

  function addCustom(e: SubmitEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    void act((ex) => ex.saveDeliverable(null, { deliverable_ref: null, title: newTitle.trim(), status: 'draft' })).then(() => { newTitle = ''; });
  }
</script>

{#snippet tracking(key: string, def: UiDeliverable | null, rec: DeliverableRecord | undefined)}
  <div class="grid">
    <label for={`${key}-st`}>{t('dv.status')}</label>
    <select id={`${key}-st`} value={rec?.status ?? 'expected'} onchange={(e) => setField(def, rec, { status: e.currentTarget.value as DeliverableStatus })}>
      {#each STATUSES as s (s)}<option value={s}>{t(`dvs.${s}` as MsgKey)}</option>{/each}
    </select>
    <label for={`${key}-v`}>{t('dv.version')}</label>
    <input id={`${key}-v`} value={rec?.version ?? ''} onchange={(e) => setField(def, rec, { version: e.currentTarget.value || null })} />
    <label for={`${key}-loc`}>{t('dv.location')}</label>
    <input id={`${key}-loc`} value={rec?.location ?? ''} onchange={(e) => setField(def, rec, { location: e.currentTarget.value || null })} />
    <label for={`${key}-sub`}>{t('dv.submitted')}</label>
    <input id={`${key}-sub`} type="date" value={rec?.submitted_at ?? ''} onchange={(e) => setField(def, rec, { submitted_at: e.currentTarget.value || null })} />
    <label for={`${key}-app`}>{t('dv.approved')}</label>
    <input id={`${key}-app`} type="date" value={rec?.approved_at ?? ''} onchange={(e) => setField(def, rec, { approved_at: e.currentTarget.value || null })} />
  </div>
  <div class="hash">
    <span class="lbl">{t('dv.hash')}</span>
    {#if rec?.sha256}
      <code data-testid={`${key}-sha`}>{rec.sha256}</code>
      {#if rec.file_name}<span class="help">{t('dv.hash.file', { name: rec.file_name, size: rec.file_size ?? 0 })}</span>{/if}
    {:else}<span class="help">{t('dv.hash.none')}</span>{/if}
    <div class="row">
      <button type="button" class="ghost" onclick={() => computeHash(def, rec)}>{t('dv.hash.compute')}</button>
      {#if rec?.sha256}<button type="button" class="ghost" onclick={() => verify(key, rec)}>{t('dv.hash.verify')}</button>{/if}
      {#if rec}<button type="button" class="ghost danger" onclick={() => remove(rec)}>{t('dv.delete')}</button>{/if}
    </div>
    {#if verifyResult[key]}<p class="verify" role="status" class:bad={!verifyResult[key]?.ok} data-testid={`${key}-verify`}>{verifyResult[key]?.msg}</p>{/if}
  </div>
{/snippet}

<section class="card">
  <h2>{t('dv.title')}</h2>
  <p class="help">{t('dv.help')}</p>
</section>

<div class="list">
  {#each view.rows as row (row.def.id)}
    {@const def = row.def}
    <article class="card dv" data-deliverable={def.id} data-status={row.record?.status ?? 'expected'}>
      <header>
        <h3>{loc(def.label)}</h3>
        <span class="help">{def.id} · {loc(phasesById[def.phase]?.label)}{def.annex ? ` · ${t('dv.annex', { annex: def.annex })}` : ''}</span>
        {#if def.sensitive}<span class="badge warn">{t('dv.sensitive')}</span>{/if}
      </header>
      <p class="help">{t('dv.producers', { p: actors(def.producers), r: actors(def.recipients) || '—' })}</p>
      {#if row.deadlines.length}
        <p class="deadlines">
          {#each row.deadlines as d (d.id)}
            <span class="badge {tone[d.state] ?? 'muted'}">{d.id}{d.due ? ` · ${formatDate(d.due)}` : ''} · {t(`state.${d.state}` as MsgKey)}</span>
          {/each}
        </p>
      {/if}
      {@render tracking(def.id, def, row.record)}
    </article>
  {/each}
</div>

<section class="card extra">
  <h2>{t('dv.extra')}</h2>
  {#each view.extra as rec (rec.id)}
    <article class="dv" data-deliverable={`custom-${rec.id}`}>
      <h3>{rec.title}</h3>
      {@render tracking(`custom-${rec.id}`, null, rec)}
    </article>
  {/each}
  <form class="add" onsubmit={addCustom}>
    <label for="dv-new">{t('dv.add.title')}</label>
    <input id="dv-new" bind:value={newTitle} />
    <button type="submit" disabled={!newTitle.trim()}>{t('dv.add')}</button>
  </form>
</section>

<style>
  .list { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 480px), 1fr)); gap: 12px; margin: 12px 0; }
  .dv header { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: baseline; }
  h3 { margin: 0; font-size: 1rem; }
  .deadlines { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
  .grid { display: grid; grid-template-columns: max-content 1fr; gap: 6px 10px; align-items: center; margin-top: 8px; }
  .grid label { font-size: .85rem; color: var(--muted); }
  .hash { margin-top: 10px; display: flex; flex-direction: column; gap: 4px; }
  .lbl { font-size: .85rem; color: var(--muted); }
  code { font-size: .78rem; word-break: break-all; background: var(--info-bg); padding: 3px 6px; border-radius: 4px; }
  .row { display: flex; flex-wrap: wrap; gap: 6px; }
  .row button { padding: 5px 10px; font-size: .88rem; }
  .danger { color: var(--bad); border-color: var(--bad); }
  .verify { margin: 2px 0 0; color: var(--ok); font-weight: 600; }
  .verify.bad { color: var(--bad); }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: .78rem; font-weight: 600; }
  .badge.ok { background: var(--ok-bg); color: var(--ok); }
  .badge.warn { background: var(--warn-bg); color: var(--warn); }
  .badge.bad { background: var(--bad-bg); color: var(--bad); }
  .badge.info { background: var(--info-bg); color: var(--info); }
  .badge.muted { color: var(--muted); border: 1px solid var(--border); }
  .extra .dv { border-top: 1px solid var(--border); padding-top: 10px; margin-top: 10px; }
  .add { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
</style>
