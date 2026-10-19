// Test de bout en bout de dist/index.html en file:// (ADR-0004), dans les moteurs choisis (TARGETS=chromium,firefox,webkit,msedge).
// La File System Access API est retirée pour tester le chemin universel (téléchargement + <input type=file>) :
// le sélecteur natif de la FSA n'est pas automatisable.
import { chromium, firefox, webkit } from 'playwright';
import { mkdtempSync } from 'node:fs';
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
