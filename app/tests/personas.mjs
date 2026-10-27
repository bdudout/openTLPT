// Parcours utilisateurs simulés (revue métier) : PMO white team, prestataire red team, banque « significant ».
// Usage : node tests/personas.mjs "file://$PWD/dist/index.html" <dossier de sortie>  — voir docs/REVUE_PERSONAS.md
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import JSZip from 'jszip';

const [, , url, out] = process.argv;
mkdirSync(out, { recursive: true });
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const day = (n) => { const d = new Date(); d.setHours(12); d.setDate(d.getDate() + n); return iso(d); };
const b = await chromium.launch();

async function start(name, profileLabel, author) {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 1000 }, locale: 'fr-FR', acceptDownloads: true });
  await ctx.addInitScript(() => { delete window.showOpenFilePicker; delete window.showSaveFilePicker; });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('dialog', (d) => d.accept());
  await p.goto(url);
  await p.getByRole('button', { name: 'Nouvel exercice' }).click();
  await p.getByLabel('Nom de code').fill(name);
  await p.getByLabel('Votre rôle').selectOption({ label: profileLabel });
  await p.getByLabel('Votre nom').fill(author);
  await p.getByLabel('Passphrase').first().fill('phrase de passe du test persona');
  await p.getByLabel('Confirmer la passphrase').fill('phrase de passe du test persona');
  await p.getByRole('checkbox').check();
  await p.getByRole('button', { name: "Créer l'exercice" }).click();
  await p.getByTestId('codename').waitFor({ timeout: 60000 });
  return { p, ctx, errors };
}
const tab = (p, name) => p.getByRole('button', { name, exact: true }).click();
async function events(p, map) {
  await tab(p, 'Échéances et chronologie');
  for (const [k, v] of Object.entries(map)) await p.locator(`#ev-${k}`).fill(v);
}
async function facts(p, map) {
  await tab(p, 'Échéances et chronologie');
  for (const [label, v] of Object.entries(map)) {
    const el = p.getByLabel(label, { exact: true });
    if (typeof v === 'boolean') { if (v) await el.check(); else await el.uncheck(); } else await el.selectOption(v);
  }
}
async function collect(p, persona) {
  const r = { persona };
  await tab(p, 'Tableau de bord');
  r.ident = await p.getByTestId('db-ident').innerText();
  r.kpis = await p.locator('.kpi').allInnerTexts();
  r.week = await p.getByTestId('db-week').locator('li').allInnerTexts();
  r.upstream = await p.getByTestId('db-upstream').locator('li').allInnerTexts();
  r.expected = await p.locator('[data-testid="db-expected"] li').allInnerTexts().catch(() => []);
  r.alerts = await p.getByTestId('db-alerts').locator('li').allInnerTexts();
  r.compliance = await p.getByTestId('db-compliance').locator('tbody tr').allInnerTexts();
  await p.screenshot({ path: join(out, `${persona}-dashboard.png`), fullPage: true });
  await tab(p, 'Exigences');
  r.reqOverall = await p.getByTestId('rq-overall').innerText();
  r.reqCount = await p.getByTestId('rq-count').innerText();
  r.reqExcluded = await p.getByTestId('rq-excluded').locator('summary').innerText();
  await tab(p, 'Échéances et chronologie');
  r.deadlines = await p.locator('tr[data-deadline]').evaluateAll((rows) => rows.map((x) => `${x.getAttribute('data-deadline')}:${x.getAttribute('data-state')}`));
  r.orderAlerts = await p.getByRole('alert').allInnerTexts();
  await p.screenshot({ path: join(out, `${persona}-deadlines.png`), fullPage: true });
  await tab(p, 'Checklists');
  await p.getByRole('tab', { name: /Socle permanent/ }).click();
  r.standing = await p.getByTestId('obligations').locator('article[data-item]').evaluateAll((a) => a.map((x) => x.getAttribute('data-item')));
  r.standingPractices = await p.getByTestId('practices').locator('article[data-item]').evaluateAll((a) => a.map((x) => x.getAttribute('data-item')));
  r.phases = {};
  for (const ph of ['Préparation', 'Test : threat intelligence', 'Test : red team', 'Clôture', 'Remédiation et attestation']) {
    await p.getByRole('tab', { name: new RegExp(ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click();
    r.phases[ph] = {
      obligations: await p.getByTestId('obligations').locator('article[data-item]').evaluateAll((a) => a.map((x) => x.getAttribute('data-item'))),
      practices: await p.getByTestId('practices').locator('article[data-item]').evaluateAll((a) => a.map((x) => x.getAttribute('data-item'))),
    };
  }
  await tab(p, 'Livrables');
  r.deliverables = await p.locator('article[data-deliverable]').evaluateAll((a) => a.map((x) => x.getAttribute('data-deliverable')));
  await p.screenshot({ path: join(out, `${persona}-deliverables.png`), fullPage: false });
  // Supports de comité
  await tab(p, 'Tableau de bord');
  r.decks = {};
  for (const kind of ['control_team', 'management', 'authority']) {
    const [dl] = await Promise.all([p.waitForEvent('download'), p.locator(`button[data-deck="${kind}"]`).click()]);
    const path = join(out, `${persona}-${kind}.pptx`);
    await dl.saveAs(path);
    const zip = await JSZip.loadAsync(readFileSync(path));
    const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f)).sort((a, c) => parseInt(a.match(/\d+/)) - parseInt(c.match(/\d+/)));
    r.decks[kind] = [];
    for (const f of slides) {
      const x = await zip.file(f).async('string');
      const text = [...x.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join('').replace(/\s+/g, ' ');
      r.decks[kind].push(text.slice(0, 140));
    }
  }
  return r;
}

const reports = [];

// ---------------------------------------------------------------------------------------------
// 1. PMO white team (control team) — entité financière, TIBER-FR, préparation à mi-parcours
{
  const { p, ctx, errors } = await start('MOUETTE', 'Entité financière', 'Alex (PMO white team)');
  await facts(p, { 'Déclinaison nationale TIBER': 'TIBER-FR', 'Prestataires TIC tiers dans le périmètre': true });
  await events(p, { PREV_TLPT: day(-1000), N0: day(-100), INIT_SUBMITTED: day(-20), INIT_VALIDATED: day(-8) });
  await tab(p, 'Livrables');
  const init = p.locator('article[data-deliverable="DLV-INIT"]');
  await init.getByLabel('Statut').selectOption('submitted');
  await init.getByLabel('Remis le').fill(day(-20));
  await tab(p, 'Checklists');
  await p.getByRole('tab', { name: /Socle permanent/ }).click();
  for (const id of ['RTS-4.1', 'RTS-4.2.a', 'RTS-4.2.d', 'RTS-4.2.f']) await p.locator(`article[data-item="${id}"] select`).selectOption('done');
  const r = await collect(p, 'pmo');
  r.errors = errors;
  // Questions concrètes du PMO
  await tab(p, 'Échéances et chronologie');
  r.canOverrideD13 = await p.locator('tr[data-deadline="D-13"] button, tr[data-deadline="D-13"] [data-override]').count();
  r.hasPartiesUI = await p.getByText(/Annuaire|Parties prenantes|Prestataires/).count();
  reports.push(r);
  await ctx.close();
}

// ---------------------------------------------------------------------------------------------
// 2. Responsable process d'un prestataire red team externe — phase active, semaine 5
{
  const { p, ctx, errors } = await start('MOUETTE-RT', 'Prestataire Red Team', 'Sam (lead RT)');
  await events(p, { N0: day(-200), TESTING_START: day(-80), TTIR_APPROVED: day(-45), R0: day(-32) });
  await tab(p, 'Registres');
  const wk = p.getByTestId('weekly');
  for (const d of [-28, -21, -7]) { await wk.getByLabel('Date').fill(day(d)); await wk.getByRole('button', { name: 'Ajouter' }).click(); }
  const l = p.getByTestId('legups');
  await l.getByLabel('Description').fill('Accès VPN prévu au plan (scénario 2)');
  await l.getByLabel('Prévu au plan de test RT').check();
  await l.getByRole('button', { name: 'Ajouter' }).click();
  await l.locator('article[data-legup="1"]').getByLabel('Fourni le').fill(day(-10));
  const r = await collect(p, 'redteam');
  r.errors = errors;
  reports.push(r);
  await ctx.close();
}

// ---------------------------------------------------------------------------------------------
// 3. Banque « significant » (MSU, BCE), groupe transfrontière, TLPT commun intragroupe
{
  const { p, ctx, errors } = await start('MOUETTE-GRP', 'Entité financière', 'Dominique (responsable TLPT groupe)');
  await facts(p, {
    'Établissement de crédit « significant » (MSU)': true, 'Autorité TLPT': 'ecb', 'TLPT commun (RTS 1(18))': true,
    'FCI exploitées dans plusieurs États membres': true, 'Prestataires TIC tiers dans le périmètre': true,
    'Testeurs utilisés': 'mixed', 'Déclinaison nationale TIBER': 'TIBER-FR',
  });
  await events(p, { PREV_TLPT: day(-1100), N0: day(-30), HOST_INFORMED: day(-25) });
  const r = await collect(p, 'bank');
  r.errors = errors;
  // Incohérences de faits que l'outil devrait signaler
  await tab(p, 'Échéances et chronologie');
  r.factWarnings = await p.getByRole('alert').allInnerTexts();
  reports.push(r);
  await ctx.close();
}

writeFileSync(join(out, 'reports.json'), JSON.stringify(reports, null, 2));
await b.close();
console.log('ok', reports.map((r) => r.persona).join(', '));
