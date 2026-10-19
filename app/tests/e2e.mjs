// Test de bout en bout de dist/index.html en file:// (ADR-0004), dans les moteurs choisis (TARGETS=chromium,firefox,webkit,msedge).
// La File System Access API est retirée pour tester le chemin universel (téléchargement + <input type=file>) :
// le sélecteur natif de la FSA n'est pas automatisable.
import { chromium, firefox, webkit } from 'playwright';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(join(here, '..', 'dist', 'index.html')).href;
const engines = { chromium, firefox, webkit, msedge: chromium };
const names = (process.env.TARGETS ?? 'chromium,firefox,webkit').split(',').map((s) => s.trim()).filter(Boolean);
const PASS = 'heron vole au-dessus du marais';

async function runOne(name) {
  const browser = await engines[name].launch(name === 'msedge' ? { channel: 'msedge' } : {});
  const context = await browser.newContext({ acceptDownloads: true, locale: 'fr-FR' });
  await context.addInitScript(() => { delete window.showOpenFilePicker; delete window.showSaveFilePicker; });
  const page = await context.newPage();
  const network = [];
  const errors = [];
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) network.push(r.url()); });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  const dir = mkdtempSync(join(tmpdir(), 'opentlpt-e2e-'));
  const step = async (label, fn) => { const t0 = Date.now(); await fn(); console.log(`  ✔ ${label} (${Date.now() - t0} ms)`); };

  console.log(`\n=== ${name} ${browser.version()} ===`);
  await page.goto(url);

  await step('création d\'un exercice', async () => {
    await page.getByRole('button', { name: 'Nouvel exercice' }).click();
    await page.getByLabel('Nom de code').fill('HERON');
    await page.getByLabel('Votre nom').fill('Camille (PMO)');
    await page.getByLabel('Passphrase', { exact: false }).first().fill(PASS);
    await page.getByLabel('Confirmer la passphrase').fill(PASS);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Créer l\'exercice' }).click();
    await page.getByTestId('codename').filter({ hasText: 'HERON' }).waitFor({ timeout: 60_000 });
    await page.getByTestId('dirty').waitFor();
  });

  await step('saisie de N0 → D-01 et D-02 calculées', async () => {
    assert.equal(await page.locator('tr[data-deadline="D-01"]').getAttribute('data-state'), 'waiting_anchor');
    await page.locator('#ev-N0').fill('2026-10-01');
    await page.locator('tr[data-deadline="D-01"] time[datetime="2027-01-01"]').waitFor();
    await page.locator('tr[data-deadline="D-02"] time[datetime="2027-04-01"]').waitFor();
    assert.equal(await page.locator('tr[data-deadline="D-15"]').getAttribute('data-state'), 'not_applicable');
  });

  await step('fait transfrontière → D-15 applicable', async () => {
    await page.getByLabel('FCI exploitées dans plusieurs États membres').check();
    await page.locator('#ev-HOST_INFORMED').fill('2026-10-05');
    await page.locator('tr[data-deadline="D-15"] time[datetime="2026-11-02"]').waitFor();
  });

  await step('chronologie incohérente signalée', async () => {
    await page.locator('#ev-INIT_SUBMITTED').fill('2026-09-01');
    await page.getByRole('alert').filter({ hasText: 'ne peut pas précéder' }).waitFor();
    await page.locator('#ev-INIT_SUBMITTED').fill('2026-12-15');
    await page.getByRole('alert').filter({ hasText: 'ne peut pas précéder' }).waitFor({ state: 'detached' });
  });

  await step('checklists : obligations et bonnes pratiques séparées, statut et justification', async () => {
    await page.getByRole('button', { name: 'Checklists' }).click();
    const obl = page.getByTestId('obligations');
    const bp = page.getByTestId('practices');
    await obl.locator('article[data-item="RTS-9.2"]').waitFor();
    assert.equal(await obl.locator('article[data-item^="EU-"]').count(), 0, 'aucune bonne pratique côté obligations');
    assert.equal(await bp.locator('article[data-item^="RTS-"], article[data-item^="DORA-"]').count(), 0, 'aucune obligation côté bonnes pratiques');
    assert.ok(await bp.locator('article[data-item="EU-02"]').count() === 1);
    assert.equal(await bp.locator('article[data-item^="FR-"]').count(), 0, 'TIBER-FR masqué par défaut');
    await obl.locator('article[data-item="RTS-9.2"] select').selectOption('done');
    await obl.locator('article[data-item="RTS-9.2"][data-status="done"]').waitFor();
    const na = obl.locator('article[data-item="RTS-9.7"]');
    await na.locator('select').selectOption('not_applicable');
    await na.getByRole('button', { name: 'Enregistrer la réponse' }).click();
    await na.getByRole('alert').filter({ hasText: 'Justification obligatoire' }).waitFor();
    await na.locator('textarea').fill('Une seule FCI concernée, critères évalués dans le SSD');
    await na.getByRole('button', { name: 'Enregistrer la réponse' }).click();
    await obl.locator('article[data-item="RTS-9.7"][data-status="not_applicable"]').waitFor();
    await page.getByRole('tab', { name: /Clôture/ }).click();
    await obl.locator('article[data-item="RTS-12.4"]').filter({ hasText: 'diffère de cette obligation' }).waitFor();
    await bp.locator('article[data-item="EU-T6"]').filter({ hasText: 'Diffère de' }).waitFor();
  });

  await step('TIBER-FR apparaît quand la déclinaison nationale est choisie', async () => {
    await page.getByRole('button', { name: 'Échéances et chronologie' }).click();
    await page.getByLabel('Déclinaison nationale TIBER').selectOption('TIBER-FR');
    await page.getByRole('button', { name: 'Checklists' }).click();
    await page.getByRole('tab', { name: /Préparation/ }).click();
    await page.getByTestId('practices').locator('article[data-item="FR-01"]').waitFor();
    await page.getByRole('button', { name: 'Échéances et chronologie' }).click();
  });

  await step('livrables : suivi, empreinte SHA-256 locale, vérification conforme / différente', async () => {
    const doc = join(dir, 'ssd-v1.txt');
    const other = join(dir, 'ssd-v2.txt');
    writeFileSync(doc, 'Scope specification document — version 1');
    writeFileSync(other, 'Scope specification document — version 2');
    const expected = createHash('sha256').update('Scope specification document — version 1').digest('hex');
    await page.getByRole('button', { name: 'Livrables', exact: true }).click();
    const card = page.locator('article[data-deliverable="DLV-SSD"]');
    await card.filter({ hasText: 'D-02' }).waitFor();
    await card.getByLabel('Statut').selectOption('draft');
    await page.locator('article[data-deliverable="DLV-SSD"][data-status="draft"]').waitFor();
    const pick = async (label, path) => {
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), card.getByRole('button', { name: label }).click()]);
      await chooser.setFiles(path);
    };
    await pick('Calculer l\'empreinte d\'un fichier', doc);
    await card.getByTestId('DLV-SSD-sha').filter({ hasText: expected }).waitFor();
    await pick('Vérifier un fichier', doc);
    await card.getByTestId('DLV-SSD-verify').filter({ hasText: 'Conforme' }).waitFor();
    await pick('Vérifier un fichier', other);
    await card.getByTestId('DLV-SSD-verify').filter({ hasText: 'Différent' }).waitFor();
    assert.equal(await page.locator('article[data-deliverable="DLV-IT-POLICY"]').count(), 0, 'testeurs externes : pas de politique testeurs internes');
  });

  await step('registres : rapports hebdomadaires → D-07, leg-up et détection contrôlés', async () => {
    await page.getByRole('button', { name: 'Échéances et chronologie' }).click();
    await page.locator('#ev-R0').fill('2026-01-05');
    await page.locator('#ev-R1').fill('2026-01-26');
    await page.getByRole('button', { name: 'Registres' }).click();
    const weekly = page.getByTestId('weekly');
    for (const d of ['2026-01-07', '2026-01-14']) {
      await weekly.getByLabel('Date').fill(d);
      await weekly.getByRole('button', { name: 'Ajouter' }).click();
      await weekly.locator(`time[datetime="${d}"]`).waitFor();
    }
    await page.getByTestId('d07-status').filter({ hasText: '2 semaine(s) couverte(s) sur 3' }).waitFor();
    await weekly.getByLabel('Date').fill('2026-01-21');
    await weekly.getByRole('button', { name: 'Ajouter' }).click();
    await page.getByTestId('d07-status').filter({ hasText: '3 semaine(s) couverte(s) sur 3' }).waitFor();

    const legups = page.getByTestId('legups');
    await legups.getByLabel('Description').fill('Explication du blocage du payload');
    await legups.getByRole('button', { name: 'Ajouter' }).click();
    const lu = legups.locator('article[data-legup="1"]');
    await lu.getByLabel('Fourni le').fill('2026-01-15');
    await lu.getByRole('alert').filter({ hasText: 'sans double approbation' }).waitFor();
    await lu.getByLabel('Approuvé CT le').fill('2026-01-14');
    await lu.getByLabel('Approuvé TM le').fill('2026-01-14');
    await lu.getByRole('alert').waitFor({ state: 'detached' });

    const det = page.getByTestId('detections');
    await det.getByLabel('Date').fill('2026-01-16');
    await det.getByLabel('Description', { exact: true }).fill('Alerte EDR sur le poste pivot');
    await det.getByRole('button', { name: 'Ajouter' }).click();
    const d1 = det.locator('article[data-detection="1"]');
    await d1.getByRole('alert').filter({ hasText: 'non validées par les test managers' }).waitFor();
    await d1.getByLabel('Validé TM le').fill('2026-01-16');
    await d1.getByRole('alert').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Échéances et chronologie' }).click();
    await page.locator('tr[data-deadline="D-07"][data-state="recurring_ok"]').waitFor();
  });

  let saved;
  await step('enregistrement (téléchargement, mode sans FSA)', async () => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Enregistrer', exact: true }).click()]);
    assert.equal(dl.suggestedFilename(), 'HERON.tlpt');
    saved = join(dir, 'HERON.tlpt');
    await dl.saveAs(saved);
    await page.getByTestId('dirty').waitFor({ state: 'detached' });
  });

  await step('verrouillage puis réouverture par un autre auteur', async () => {
    await page.getByRole('button', { name: 'Verrouiller' }).click();
    await page.getByRole('button', { name: 'Ouvrir un fichier .tlpt' }).click();
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Choisir un fichier .tlpt' }).click()]);
    await chooser.setFiles(saved);
    await page.getByTestId('chosen').waitFor();
    await page.getByLabel('Votre nom').fill('Dominique (CTL)');
    await page.getByLabel('Passphrase').fill(PASS);
    await page.getByRole('button', { name: 'Ouvrir', exact: true }).click();
    await page.getByTestId('codename').filter({ hasText: 'HERON' }).waitFor({ timeout: 60_000 });
    assert.equal(await page.locator('#ev-N0').inputValue(), '2026-10-01');
    await page.locator('tr[data-deadline="D-15"] time[datetime="2026-11-02"]').waitFor();
    assert.match(await page.locator('.bar .help').innerText(), /Dominique \(CTL\)/);
    assert.equal(await page.getByRole('alert').filter({ hasText: 'intégrité' }).count(), 0);
    await page.getByRole('button', { name: 'Checklists' }).click();
    await page.locator('article[data-item="RTS-9.2"][data-status="done"]').waitFor();
    await page.locator('article[data-item="RTS-9.7"]').filter({ hasText: 'Une seule FCI concernée' }).waitFor();
    await page.getByTestId('practices').locator('article[data-item="FR-01"]').waitFor();
    await page.getByRole('button', { name: 'Livrables', exact: true }).click();
    await page.locator('article[data-deliverable="DLV-SSD"][data-status="draft"]').waitFor();
    await page.getByTestId('DLV-SSD-sha').waitFor();
    await page.getByRole('button', { name: 'Registres' }).click();
    await page.getByTestId('d07-status').filter({ hasText: '3 semaine(s) couverte(s) sur 3' }).waitFor();
    assert.equal(await page.locator('article[data-legup]').count(), 1);
    assert.equal(await page.locator('article[data-detection]').count(), 1);
  });

  await step('mauvaise passphrase : message générique', async () => {
    await page.getByRole('button', { name: 'Verrouiller' }).click(); // modifications (session) → confirmation acceptée
    await page.getByRole('button', { name: 'Ouvrir un fichier .tlpt' }).click();
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Choisir un fichier .tlpt' }).click()]);
    await chooser.setFiles(saved);
    await page.getByLabel('Votre nom').fill('Intrus');
    await page.getByLabel('Passphrase').fill('ce n est pas la bonne phrase');
    await page.getByRole('button', { name: 'Ouvrir', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'passphrase incorrecte ou fichier altéré' }).waitFor({ timeout: 60_000 });
  });

  await step('bascule FR → EN', async () => {
    await page.getByRole('button', { name: 'English' }).click();
    await page.getByRole('heading', { name: 'Open an exercise' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
  });

  assert.deepEqual(network, [], `requêtes réseau : ${network.join(', ')}`);
  assert.deepEqual(errors, [], `erreurs console : ${errors.join(' | ')}`);
  console.log('  ✔ aucune requête réseau, aucune erreur console');
  await browser.close();
}

let failed = 0;
for (const n of names) {
  try { await runOne(n); } catch (e) { failed++; console.error(`  ✖ ${n} : ${e.message}`); }
}
console.log(failed ? `\n${failed} moteur(s) en échec` : '\nE2E OK sur tous les moteurs');
process.exit(failed ? 1 : 0);
