// Test de bout en bout de dist/index.html en file:// (ADR-0004), dans les moteurs choisis (TARGETS=chromium,firefox,webkit,msedge).
// La File System Access API est retirée pour tester le chemin universel (téléchargement + <input type=file>) :
// le sélecteur natif de la FSA n'est pas automatisable.
import { chromium, firefox, webkit } from 'playwright';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(join(here, '..', 'dist', 'index.html')).href;
const engines = { chromium, firefox, webkit, msedge: chromium };
const names = (process.env.TARGETS ?? 'chromium,firefox,webkit').split(',').map((s) => s.trim()).filter(Boolean);
const PASS = 'heron vole au-dessus du marais';

// Dates relatives au jour d'exécution (heure locale, comme l'application).
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shift = (days, months = 0) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setMonth(d.getMonth() + months); d.setDate(d.getDate() + days); return d; };

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
    await page.getByTestId('db-ident').filter({ hasText: 'TLPT non démarré' }).waitFor(); // tableau de bord par défaut
  });

  await step('tableau de bord : semaine, amont, jalons à dater, conformité par étape, KPI, ancrage', async () => {
    // N0 tel que D-01 (N0 + 3 mois) tombe dans 3 jours ; début de la phase de test dans 20 jours.
    const n0 = (() => { const d = shift(3); d.setMonth(d.getMonth() - 3); return iso(d); })();
    await page.getByRole('button', { name: 'Échéances et chronologie' }).click();
    await page.locator('#ev-N0').fill(n0);
    await page.locator('#ev-TESTING_START').fill(iso(shift(20)));
    await page.getByRole('button', { name: 'Tableau de bord' }).click();
    await page.getByTestId('db-week').locator('li[data-action="D-01"]').waitFor();
    await page.getByTestId('db-upstream').locator('li[data-action="D-03"]').waitFor();
    await page.getByTestId('db-upstream').locator('li[data-action="D-04"]').filter({ hasText: 'avant « Début de la phase de test »' }).waitFor();
    await page.getByTestId('db-ident').filter({ hasText: 'Phase en cours : Préparation' }).waitFor();
    await page.getByTestId('db-ident').filter({ hasText: /J\+\d+ depuis la notification/ }).waitFor();
    await page.locator('[data-kpi="prep"]').filter({ hasText: /J-\d+/ }).waitFor();
    // Jalon attendu daté depuis le tableau de bord → il disparaît de la liste.
    const expected = page.getByTestId('db-expected');
    await expected.locator('li[data-expected="INIT_SUBMITTED"]').waitFor();
    await expected.locator('#db-ev-INIT_SUBMITTED').fill(iso(shift(-1)));
    await expected.locator('li[data-expected="INIT_SUBMITTED"]').waitFor({ state: 'detached' });
    await expected.locator('li[data-expected="INIT_VALIDATED"]').waitFor(); // son successeur devient attendu
    // Frise et conformité par étape (préparation comprise) avec accès direct à la checklist.
    assert.equal(await page.getByTestId('db-timeline').locator('li[data-phase="preparation"]').getAttribute('data-status'), 'in_progress');
    await page.getByTestId('db-compliance').locator('tr[data-step="standing"]').waitFor();
    await page.getByTestId('db-compliance').locator('tr[data-step="preparation"]').getByRole('button').click();
    await page.getByTestId('obligations').locator('article[data-item="RTS-9.2"]').waitFor();
    // Ancrage du journal.
    await page.getByRole('button', { name: 'Tableau de bord' }).click();
    await page.getByRole('button', { name: 'Ancrer le journal' }).click();
    await page.getByTestId('anchor-text').filter({ hasText: /^HERON · #\d+ · [0-9a-f]{64} · / }).waitFor();
    await page.getByTestId('db-ident').filter({ hasText: 'Dernier ancrage' }).waitFor();
    // Remise à zéro des dates pour la suite du scénario.
    await page.getByRole('button', { name: 'Échéances et chronologie' }).click();
    await page.locator('#ev-TESTING_START').fill('');
    await page.locator('#ev-INIT_SUBMITTED').fill('');
  });

  await step('planification : préparations à lancer, prévisionnel, horizon, glissement, référence figée', async () => {
    // N0 à J-100 : le SSD (D-02, N0 + 6 mois) est hors horizon mais demande 10 semaines → « à lancer ».
    await page.locator('#ev-N0').fill(iso(shift(-100)));
    await page.locator('#plan-TESTING_START').fill(iso(shift(30)));
    await page.getByRole('button', { name: 'Tableau de bord' }).click();
    await page.getByTestId('db-tostart').locator('li[data-action="D-02"]').filter({ hasText: '10 sem. de préparation' }).waitFor();
    await page.getByTestId('db-upstream').locator('li[data-action="D-04"]').filter({ hasText: 'prévisionnel' }).waitFor();
    await page.getByTestId('db-horizon').selectOption('12');
    await page.getByTestId('db-upstream').locator('li[data-action="D-02"]').waitFor();
    await page.getByTestId('db-horizon').selectOption('6');
    // Replanification : glissement mesuré par rapport à la première date prévue, puis nouvelle référence.
    await page.getByRole('button', { name: 'Échéances et chronologie' }).click();
    await page.locator('#plan-TESTING_START').fill(iso(shift(40)));
    await page.locator('[data-event="TESTING_START"] .slip[data-slip="10"]').waitFor();
    await page.getByRole('button', { name: 'Tableau de bord' }).click();
    await page.locator('[data-kpi="planning"]').filter({ hasText: '1/1' }).waitFor();
    await page.getByRole('button', { name: 'Échéances et chronologie' }).click();
    await page.getByRole('button', { name: 'Figer le planning de référence' }).click();
    await page.locator('[data-event="TESTING_START"] .slip').waitFor({ state: 'detached' });
    await page.locator('#plan-TESTING_START').fill('');
  });

  await step('saisie de N0 → D-01 et D-02 calculées', async () => {
    await page.locator('#ev-N0').fill('');
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
    // Vue par défaut : socle permanent, séparé des étapes datées.
    await page.getByRole('tab', { name: /Socle permanent/ }).click();
    await obl.locator('article[data-item="RTS-4.1"]').waitFor();
    assert.equal(await obl.locator('article[data-item="RTS-9.2"]').count(), 0, 'pas d\'étape datée dans le socle');
    await obl.locator('h4[data-theme="th_providers"]').waitFor();
    await obl.locator('article[data-item="RTS-4.1"] select').selectOption('done');
    await page.getByTestId('cl-summary').filter({ hasText: /Socle : 1\/\d+/ }).waitFor();
    await page.getByRole('tab', { name: /Préparation/ }).click();
    await obl.locator('article[data-item="RTS-9.2"]').waitFor();
    assert.equal(await obl.locator('article[data-item="RTS-4.1"]').count(), 0, 'pas de point du socle dans les phases');
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

  await step('exigences : conformité globale, recherche, filtres, hors périmètre, export CSV journalisé', async () => {
    await page.getByRole('button', { name: 'Exigences' }).click();
    await page.getByTestId('rq-overall').filter({ hasText: /3 sur \d+ applicables/ }).waitFor();
    const table = page.getByTestId('rq-table');
    await table.locator('tr[data-req="RTS-9.2"][data-status="done"]').waitFor();
    assert.equal(await table.locator('tr[data-req^="EU-"], tr[data-req^="FR-"]').count(), 0, 'aucune bonne pratique dans la matrice');
    await page.getByTestId('rq-q').fill('9(7)');
    await page.getByTestId('rq-count').filter({ hasText: '1 exigence(s)' }).waitFor();
    await table.locator('tr[data-req="RTS-9.7"]').filter({ hasText: 'Une seule FCI concernée' }).waitFor();
    await page.getByRole('button', { name: 'Réinitialiser' }).click();
    await page.getByTestId('rq-status').selectOption('handled');
    await page.getByTestId('rq-count').filter({ hasText: '3 exigence(s)' }).waitFor();
    await page.getByTestId('rq-excluded').locator('summary').click();
    await page.getByTestId('rq-excluded').locator('li[data-excluded="RTS-15.1"]').filter({ hasText: 'Condition non remplie' }).waitFor();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exporter la matrice (CSV)' }).click()]);
    assert.match(dl.suggestedFilename(), /^HERON-exigences-\d{4}-\d{2}-\d{2}\.csv$/);
    const csvPath = join(dir, 'matrice.csv');
    await dl.saveAs(csvPath);
    const csv = readFileSync(csvPath, 'utf8');
    assert.ok(csv.startsWith('\uFEFFID;Référence;Exigence'), 'BOM + en-tête');
    assert.equal(csv.trim().split('\r\n').length, 93, 'en-tête + 92 obligations');
    assert.match(csv, /RTS-9\.2;RTS 2025\/1190, art\. 9\(2\);[^\r]*;Oui;Traité;/);
    assert.match(csv, /RTS-15\.1;[^\r]*;Non — Condition non remplie/);
    await page.getByRole('status').filter({ hasText: 'Matrice exportée (92 lignes)' }).waitFor();
    await table.locator('tr[data-req="RTS-9.7"]').getByRole('button', { name: /Ouvrir dans la checklist/ }).click();
    await page.getByTestId('obligations').locator('article[data-item="RTS-9.7"]').waitFor();
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

  await step('scénarios et flags : 3 scénarios au moins, flag par scénario, résultat daté', async () => {
    await page.getByRole('button', { name: 'Registres' }).click();
    const sc = page.getByTestId('scenarios');
    const add = sc.getByTestId('sc-add');
    for (const [i, label] of ['Fraude au paiement', 'Exfiltration de données clients'].entries()) {
      await add.getByLabel('Scénario').fill(label);
      await add.getByRole('button', { name: 'Ajouter' }).click();
      await sc.locator(`article[data-scenario="${i + 1}"]`).getByLabel('Retenu').check();
    }
    await sc.locator('[data-issue="scenarios_too_few"]').waitFor();
    await add.getByLabel('Scénario').fill('Indisponibilité des paiements');
    await add.getByRole('button', { name: 'Ajouter' }).click();
    await sc.locator('article[data-scenario="3"]').getByLabel('Retenu').check();
    await sc.locator('[data-issue="scenarios_too_few"]').waitFor({ state: 'detached' });
    // Phase active commencée : chaque scénario retenu doit porter un flag.
    await sc.locator('article[data-scenario="1"]').filter({ hasText: 'sans flag' }).waitFor();
    const fadd = sc.getByTestId('flag-add');
    await fadd.getByLabel('Flag').fill('Ordre de virement modifié');
    await fadd.getByLabel('Scénario').selectOption({ label: 'Fraude au paiement' });
    await fadd.getByRole('button', { name: 'Ajouter' }).click();
    await sc.locator('article[data-scenario="1"]').filter({ hasText: 'sans flag' }).waitFor({ state: 'detached' });
    const f = sc.locator('article[data-flag="1"]');
    await f.getByLabel('Statut').selectOption('reached');
    await f.filter({ hasText: 'Flag atteint sans date' }).waitFor();
    await f.getByLabel('Atteint le').fill('2026-01-20');
    await f.filter({ hasText: 'Flag atteint sans date' }).waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Tableau de bord' }).click();
    await page.locator('[data-kpi="flags"]').filter({ hasText: '1/1' }).waitFor();
    await page.getByTestId('db-alerts').filter({ hasText: 'Scénario retenu sans flag' }).waitFor();
  });

  await step('parties prenantes : annuaire, évaluation du prestataire TI, preuves, dérogation motivée', async () => {
    await page.getByRole('button', { name: 'Parties prenantes' }).click();
    const directory = page.getByTestId('directory');
    await directory.getByLabel('Rôle').selectOption('TIP');
    await directory.locator('form').getByLabel('Organisation').fill('Intel Conseil');
    await directory.getByRole('button', { name: 'Ajouter' }).click();
    const ev = page.getByTestId('evaluation').locator('article[data-provider="1"]');
    await ev.filter({ hasText: 'critère(s) à lever' }).waitFor();
    const crit = await ev.locator('tr[data-criterion]').evaluateAll((rs) => rs.map((r) => r.dataset.criterion));
    assert.ok(crit.includes('RTS-7.1.c') && !crit.includes('RTS-7.1.d'), 'grille TI : 3 références, pas 5');
    const evidence = join(dir, 'preuve.txt');
    writeFileSync(evidence, 'preuve de conformité');
    for (const c of crit) {
      const row = ev.locator(`tr[data-criterion="${c}"]`);
      if (c === 'RTS-7.1.c') {
        await row.getByLabel(`${c} — Statut`).selectOption('derogation');
        await row.filter({ hasText: 'Dérogation sans motif' }).waitFor();
        await row.getByLabel(`${c} — Note ou motif`).fill('Deux références, expérience compensée');
        await row.getByLabel(`${c} — Note ou motif`).press('Tab');
        continue;
      }
      await row.getByLabel(`${c} — Statut`).selectOption('compliant');
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), row.getByRole('button', { name: 'Empreinte…' }).click()]);
      await chooser.setFiles(evidence);
      await row.locator('code').waitFor();
    }
    await page.getByTestId('evaluation').locator('article[data-provider="1"][data-ready="true"]').waitFor();
    await page.getByRole('button', { name: 'Tableau de bord' }).click();
    await page.locator('[data-kpi="providers"]').filter({ hasText: '1/1' }).waitFor();
  });

  await step('supports de comité PowerPoint : 3 trames, confidentialité, export journalisé', async () => {
    await page.getByRole('button', { name: 'Tableau de bord' }).click();
    const decks = page.getByTestId('db-decks');
    const expect = { control_team: 10, management: 6, authority: 6 };
    for (const [kind, minSlides] of Object.entries(expect)) {
      const [dl] = await Promise.all([page.waitForEvent('download'), decks.locator(`button[data-deck="${kind}"]`).click()]);
      assert.match(dl.suggestedFilename(), /^HERON-.+-\d{4}-\d{2}-\d{2}\.pptx$/);
      const path = join(dir, `${kind}.pptx`);
      await dl.saveAs(path);
      const zip = await JSZip.loadAsync(readFileSync(path));
      const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
      assert.ok(slides.length >= minSlides, `${kind} : ${slides.length} diapositives`);
      // PptxGenJS découpe le texte des tableaux en un fragment par mot : on reconstitue le texte visible.
      const textOf = (x) => [...x.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join('').replace(/\s+/g, ' ');
      const xml = textOf((await Promise.all(slides.map((f) => zip.file(f).async('string')))).join('\n'));
      const master = (await Promise.all(Object.keys(zip.files).filter((f) => /^ppt\/(slideLayouts|slideMasters)\/[^/]+\.xml$/.test(f)).map((f) => zip.file(f).async('string')))).join('\n');
      assert.ok(xml.includes('TLPT HERON'), `${kind} : nom de code`);
      assert.ok((xml + textOf(master)).includes('CONFIDENTIEL — TLPT HERON'), `${kind} : pied de page de confidentialité`);
      if (kind === 'management') {
        assert.ok(!xml.includes('Alerte EDR'), 'direction : pas de détail des détections');
        assert.ok(!xml.includes('Explication du blocage'), 'direction : pas de détail des leg-ups');
      } else {
        assert.ok(xml.includes('Alerte EDR'), `${kind} : détections détaillées`);
      }
      await decks.getByRole('status').filter({ hasText: 'généré' }).waitFor();
    }
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
    await page.getByRole('button', { name: 'Échéances et chronologie' }).click();
    assert.equal(await page.locator('#ev-N0').inputValue(), '2026-10-01');
    await page.locator('tr[data-deadline="D-15"] time[datetime="2026-11-02"]').waitFor();
    assert.match(await page.locator('.bar .help').innerText(), /Dominique \(CTL\)/);
    assert.equal(await page.getByRole('alert').filter({ hasText: 'intégrité' }).count(), 0);
    await page.getByRole('button', { name: 'Checklists' }).click();
    await page.getByTestId('cl-summary').filter({ hasText: /Socle : 1\/\d+ · Au fil du test : 2\/\d+/ }).waitFor();
    await page.getByRole('tab', { name: /Préparation/ }).click();
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

// Portée par profil et contrôles de cohérence (revue des parcours, pistes 1 et 2).
async function runScopes(name) {
  const browser = await engines[name].launch(name === 'msedge' ? { channel: 'msedge' } : {});
  const context = await browser.newContext({ acceptDownloads: true, locale: 'fr-FR' });
  await context.addInitScript(() => { delete window.showOpenFilePicker; delete window.showSaveFilePicker; });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  const step = async (label, fn) => { const t0 = Date.now(); await fn(); console.log(`  ✔ ${label} (${Date.now() - t0} ms)`); };
  const create = async (codename, role) => {
    await page.goto(url);
    await page.getByRole('button', { name: 'Nouvel exercice' }).click();
    await page.getByLabel('Nom de code').fill(codename);
    await page.getByLabel('Votre rôle').selectOption({ label: role });
    await page.getByLabel('Votre nom').fill('Testeur');
    await page.getByLabel('Passphrase').first().fill(PASS);
    await page.getByLabel('Confirmer la passphrase').fill(PASS);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Créer l\'exercice' }).click();
    await page.getByTestId('codename').filter({ hasText: codename }).waitFor({ timeout: 60_000 });
  };
  console.log(`\n=== ${name} — profils et cohérence ===`);

  await step('prestataire RT : échéances de l\'entité en information, aucun faux retard', async () => {
    await create('PIVERT', 'Prestataire Red Team');
    await page.getByRole('button', { name: 'Échéances et chronologie' }).click();
    for (const [k, v] of [['N0', iso(shift(-200))], ['TESTING_START', iso(shift(-80))], ['TTIR_APPROVED', iso(shift(-45))], ['R0', iso(shift(-32))]]) await page.locator(`#ev-${k}`).fill(v);
    await page.locator('tr[data-deadline="D-01"]').filter({ hasText: 'information — autre acteur' }).waitFor();
    assert.equal(await page.locator('tr[data-deadline="D-01"] input[type=date]').count(), 0, 'pas de date de réalisation pour une échéance d\'un autre acteur');
    await page.getByRole('button', { name: 'Tableau de bord' }).click();
    await page.locator('[data-kpi="overdue"]').filter({ hasText: /^\s*Échéances en retard\s*0\s*$/i }).waitFor();
    assert.equal(await page.getByTestId('db-week').locator('li[data-action="D-01"], li[data-action="D-02"]').count(), 0);
    await page.getByTestId('db-week').locator('li[data-action="D-07"]').waitFor();
    assert.equal(await page.getByTestId('db-expected').locator('li[data-expected="SSD_SUBMITTED"]').count(), 0, 'jalons de l\'entité masqués');
    await page.getByTestId('db-expected').locator('li[data-expected="R1"]').waitFor();
    // Supports du prestataire : point hebdomadaire RT et point client, pas de trame « organe de direction ».
    const decks = page.getByTestId('db-decks');
    assert.deepEqual(await decks.locator('button[data-deck]').evaluateAll((bs) => bs.map((b) => b.dataset.deck)), ['rt_weekly', 'provider_client']);
    assert.ok(await page.evaluate(() => !!(document.querySelector('.kpis').compareDocumentPosition(document.querySelector('[data-testid="db-decks"]')) & Node.DOCUMENT_POSITION_FOLLOWING)), 'supports sous les KPI');
    const [dl] = await Promise.all([page.waitForEvent('download'), decks.locator('button[data-deck="rt_weekly"]').click()]);
    assert.match(dl.suggestedFilename(), /^PIVERT-point-hebdo-rt-/);
    const path = join(mkdtempSync(join(tmpdir(), 'otlpt-rt-')), 'rt.pptx');
    await dl.saveAs(path);
    const zip = await JSZip.loadAsync(readFileSync(path));
    const xml = (await Promise.all(Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f)).map((f) => zip.file(f).async('string')))).join('');
    const text = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join('');
    for (const s of ['Point hebdomadaire red team', 'Plan de la semaine suivante', 'Blocages et décisions attendues']) assert.ok(text.includes(s), s);
  });

  await step('banque « significant » : testeurs mixtes refusés, TIBER-FR signalé', async () => {
    await page.getByRole('button', { name: 'Verrouiller' }).click();
    await create('GRUE', 'Entité financière');
    await page.getByRole('button', { name: 'Échéances et chronologie' }).click();
    await page.getByLabel('Établissement de crédit « significant » (MSU)').check();
    await page.locator('[data-issue="ssm_authority_ecb"]').waitFor();
    await page.getByLabel('Autorité TLPT').selectOption('ecb');
    await page.locator('[data-issue="ssm_authority_ecb"]').waitFor({ state: 'detached' });
    await page.getByLabel('Testeurs utilisés').selectOption('mixed');
    await page.locator('[data-issue="ssm_external_only"]').filter({ hasText: 'DORA-26.8.2' }).waitFor();
    await page.getByLabel('Déclinaison nationale TIBER').selectOption('TIBER-FR');
    await page.locator('[data-issue="tiberfr_not_applicable"]').waitFor();
    await page.getByRole('button', { name: 'Tableau de bord' }).click();
    await page.getByTestId('db-alerts').locator('li').filter({ hasText: '⛔' }).filter({ hasText: 'testeurs externes' }).waitFor();
    await page.getByRole('button', { name: 'Échéances et chronologie' }).click();
    await page.getByLabel('Testeurs utilisés').selectOption('external');
    await page.locator('[data-issue="ssm_external_only"]').waitFor({ state: 'detached' });
  });

  assert.deepEqual(errors, [], `erreurs : ${errors.join(' | ')}`);
  await browser.close();
}

let failed = 0;
for (const n of names) {
  try { await runOne(n); } catch (e) { failed++; console.error(`  ✖ ${n} : ${e.message}`); }
  try { await runScopes(n); } catch (e) { failed++; console.error(`  ✖ ${n} (profils) : ${e.message}`); }
}
console.log(failed ? `\n${failed} moteur(s) en échec` : '\nE2E OK sur tous les moteurs');
process.exit(failed ? 1 : 0);
