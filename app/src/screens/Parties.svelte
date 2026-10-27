<script lang="ts">
  import { loc, t, type MsgKey } from '../lib/i18n.svelte.ts';
  import { act, currentExercise, loadState, ui } from '../lib/app.svelte.ts';
  import { actorsById, core, itemsById, regulatoryItems } from '../lib/ref.ts';
  import { fingerprint, pickAnyFile } from '../lib/files.ts';
  import { evaluateProviders, type PartyRecord, type ProviderCheckStatus } from '../../../engine/src/index.ts';

  const STATUSES: ProviderCheckStatus[] = ['open', 'compliant', 'non_compliant', 'derogation'];
  const ROLES = core.actors.map((a) => a.id).filter((id) => id !== 'FE');

  const data = $derived.by(() => {
    void ui.rev;
    const ex = currentExercise();
    const parties = ex.listParties();
    const contracted = loadState().events.PROVIDERS_CONTRACTED;
    return { parties, evals: evaluateProviders(regulatoryItems, parties, ex.listProviderChecks(), contracted), contracted };
  });

  let pRole = $state('TIP');
  let pOrg = $state('');
  let pPerson = $state('');
  let pContact = $state('');

  async function addParty(e: SubmitEvent) {
    e.preventDefault();
    if (!pOrg.trim() && !pPerson.trim()) return;
    const ok = await act((ex) => ex.saveParty(null, { actor_ref: pRole, organisation: pOrg.trim() || null, person: pPerson.trim() || null, contact: pContact.trim() || null, active: true }));
    if (ok) { pOrg = ''; pPerson = ''; pContact = ''; }
  }
  const setParty = (p: PartyRecord, patch: Partial<PartyRecord>) => void act((ex) => ex.saveParty(p.id, patch));
  const setCheck = (partyId: number, item: string, patch: Record<string, string | null>) => void act((ex) => ex.setProviderCheck(partyId, item, patch));
  async function attachEvidence(partyId: number, item: string) {
    const f = await pickAnyFile();
    if (!f) return;
    const fp = await fingerprint(f);
    setCheck(partyId, item, { evidence_sha256: fp.sha256, evidence_label: fp.name });
  }
  function del(p: PartyRecord) { if (confirm(t('rg.delete.confirm'))) void act((ex) => ex.deleteParty(p.id)); }
  const role = (id: string) => loc(actorsById[id]?.label) || id;
  const issueText = (code: string, source: string) => t(`is.${code}` as MsgKey, { source: source.replace(/^RTS-(\d+)\.(\d+)$/, 'RTS $1($2)') });
</script>

<p class="neutral card">{t('pa.neutral')}</p>

<section class="card block" aria-labelledby="h-dir" data-testid="directory">
  <h2 id="h-dir">{t('pa.directory')}</h2>
  <p class="help">{t('pa.directory.help')}</p>
  <form class="add" onsubmit={addParty}>
    <label>{t('pa.role')}
      <select bind:value={pRole}>{#each ROLES as r (r)}<option value={r}>{role(r)}</option>{/each}</select>
    </label>
    <label class="grow">{t('pa.organisation')} <input bind:value={pOrg} /></label>
    <label class="grow">{t('pa.person')} <input bind:value={pPerson} /></label>
    <label class="grow">{t('pa.contact')} <input bind:value={pContact} /></label>
    <button type="submit" disabled={!pOrg.trim() && !pPerson.trim()}>{t('rg.add')}</button>
  </form>
  <table>
    <thead><tr><th>{t('pa.role')}</th><th>{t('pa.organisation')}</th><th>{t('pa.person')}</th><th>{t('pa.contact')}</th><th>{t('pa.active')}</th><th></th></tr></thead>
    <tbody>
      {#each data.parties as p (p.id)}
        <tr data-party={p.id} class:inactive={!p.active}>
          <td>{role(p.actor_ref)}</td>
          <td><input aria-label={t('pa.organisation')} value={p.organisation ?? ''} onchange={(e) => setParty(p, { organisation: e.currentTarget.value.trim() || null })} /></td>
          <td><input aria-label={t('pa.person')} value={p.person ?? ''} onchange={(e) => setParty(p, { person: e.currentTarget.value.trim() || null })} /></td>
          <td><input aria-label={t('pa.contact')} value={p.contact ?? ''} onchange={(e) => setParty(p, { contact: e.currentTarget.value.trim() || null })} /></td>
          <td><input type="checkbox" aria-label={t('pa.active')} checked={p.active} onchange={(e) => setParty(p, { active: e.currentTarget.checked })} /></td>
          <td><button type="button" class="ghost danger small" onclick={() => del(p)}>{t('rg.delete')}</button></td>
        </tr>
      {:else}<tr><td colspan="6" class="help">{t('rg.empty')}</td></tr>{/each}
    </tbody>
  </table>
</section>

<section class="card block" aria-labelledby="h-eval" data-testid="evaluation">
  <h2 id="h-eval">{t('pa.eval')}</h2>
  <p class="help">{t('pa.eval.help')}</p>
  {#each data.evals as ev (ev.party.id)}
    <article class="provider" data-provider={ev.party.id} data-ready={ev.ready}>
      <h3>{role(ev.party.actor_ref)} — {ev.party.organisation ?? ev.party.person ?? ''}
        <span class="badge" class:ok={ev.ready}>{ev.ready ? t('pa.ready') : t('pa.notReady', { n: ev.counts.open + ev.counts.non_compliant })}</span>
      </h3>
      {#each ev.issues.filter((i) => !i.item) as i (i.code)}<p class="issue bad" role="alert">{issueText(i.code, i.source)}</p>{/each}
      <table>
        <thead><tr><th>{t('pa.criterion')}</th><th>{t('rq.col.status')}</th><th>{t('pa.evidence')}</th><th>{t('pa.note')}</th></tr></thead>
        <tbody>
          {#each ev.rows as r (r.criterion.id)}
            {@const iss = ev.issues.filter((i) => i.item === r.criterion.id)}
            <tr data-criterion={r.criterion.id} class:flagged={iss.length > 0}>
              <td><strong>{r.criterion.id}</strong> {loc(itemsById[r.criterion.id]?.title)}
                {#each iss as i (i.code)}<span class="issue-inline">{issueText(i.code, i.source)}</span>{/each}</td>
              <td>
                <select aria-label={`${r.criterion.id} — ${t('rq.col.status')}`} value={r.check?.status ?? 'open'} onchange={(e) => setCheck(ev.party.id, r.criterion.id, { status: e.currentTarget.value })}>
                  {#each STATUSES as s (s)}<option value={s}>{t(`pc.${s}` as MsgKey)}</option>{/each}
                </select>
              </td>
              <td>
                {#if r.check?.evidence_sha256}<code title={r.check.evidence_sha256}>{r.check.evidence_label ?? ''} · {r.check.evidence_sha256.slice(0, 10)}…</code>{/if}
                <button type="button" class="ghost small" onclick={() => attachEvidence(ev.party.id, r.criterion.id)}>{t('pa.evidence.add')}</button>
              </td>
              <td><input aria-label={`${r.criterion.id} — ${t('pa.note')}`} value={r.check?.note ?? ''} placeholder={r.check?.status === 'derogation' ? t('pa.derogation.ph') : ''} onchange={(e) => setCheck(ev.party.id, r.criterion.id, { note: e.currentTarget.value.trim() || null })} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </article>
  {:else}<p class="help">{t('pa.eval.empty')}</p>{/each}
</section>

<style>
  .neutral { background: var(--warn-bg); color: var(--warn); border-color: transparent; margin: 0 0 12px; padding: 10px 14px; }
  .block { margin-bottom: 14px; }
  .add { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: flex-end; margin: 10px 0; }
  .add label { display: flex; flex-direction: column; gap: 3px; font-size: .85rem; color: var(--muted); }
  .add label.grow { flex: 1 1 180px; }
  table { width: 100%; border-collapse: collapse; font-size: .9rem; }
  th { text-align: left; font-size: .75rem; text-transform: uppercase; color: var(--muted); padding: 6px 4px; }
  td { border-top: 1px solid var(--border); padding: 6px 4px; vertical-align: top; }
  td input:not([type=checkbox]) { width: 100%; }
  tr.inactive { opacity: .55; }
  tr.flagged td:first-child { border-left: 4px solid var(--warn); padding-left: 8px; }
  .provider { border-top: 1px solid var(--border); padding: 10px 0; overflow-x: auto; }
  h3 { font-size: 1rem; margin: 4px 0 8px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .badge { font-size: .78rem; padding: 2px 8px; border-radius: 10px; background: var(--warn-bg); color: var(--warn); }
  .badge.ok { background: var(--ok-bg, var(--info-bg)); color: var(--ok); }
  .issue { margin: 6px 0; color: var(--warn); background: var(--warn-bg); padding: 5px 8px; border-radius: 6px; font-size: .88rem; }
  .issue.bad { color: var(--bad); font-weight: 600; }
  .issue-inline { display: block; color: var(--warn); font-size: .82rem; margin-top: 3px; }
  code { font-size: .78rem; background: var(--info-bg); padding: 2px 6px; border-radius: 4px; margin-right: 6px; }
  .small { padding: 4px 10px; font-size: .85rem; }
  .danger { color: var(--bad); border-color: var(--bad); }
</style>
