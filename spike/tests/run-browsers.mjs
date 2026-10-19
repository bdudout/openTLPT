// Ouvre dist/index.html en file:// dans Chromium, Firefox et WebKit (et Chrome / Edge s'ils sont installés),
// attend la fin du banc d'essai et affiche les résultats. Signale toute requête réseau et toute violation CSP.
import { chromium, firefox, webkit } from 'playwright';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(join(here, '..', 'dist', 'index.html')).href;

// TARGETS=chromium,firefox,webkit,chrome,msedge (par défaut : moteurs Playwright + Chrome/Edge s'ils sont installés sur macOS)
const all = {
  chromium: { name: 'Chromium', type: chromium, opts: {} },
  firefox: { name: 'Firefox', type: firefox, opts: {} },
  webkit: { name: 'WebKit (Safari)', type: webkit, opts: {} },
  chrome: { name: 'Google Chrome', type: chromium, opts: { channel: 'chrome' } },
  msedge: { name: 'Microsoft Edge', type: chromium, opts: { channel: 'msedge' } },
};
let names = process.env.TARGETS?.split(',').map((s) => s.trim()).filter(Boolean);
if (!names) {
  names = ['chromium', 'firefox', 'webkit'];
  if (existsSync('/Applications/Google Chrome.app')) names.push('chrome');
  if (existsSync('/Applications/Microsoft Edge.app')) names.push('msedge');
}
const label = process.env.LABEL ? ` [${process.env.LABEL}]` : '';
const targets = names.map((n) => {
  if (!all[n]) throw new Error(`cible inconnue : ${n}`);
  return { ...all[n], name: all[n].name + label };
});

let failures = 0;
for (const t of targets) {
  const browser = await t.type.launch(t.opts);
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const network = [];
  const problems = [];
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) network.push(r.url()); });
  page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(url);
  await page.waitForFunction(() => window.__SPIKE_DONE__ === true, null, { timeout: 120_000 });
  const results = await page.evaluate(() => window.__SPIKE_RESULTS__);

  // Mode dégradé (pas de File System Access API) : l'enregistrement doit produire un téléchargement.
  const hasFsa = await page.evaluate(() => 'showSaveFilePicker' in window);
  let save = 'FSA présente : test manuel (sélecteur natif)';
  if (!hasFsa) {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30_000 }), page.click('main p button')]);
    save = `téléchargement OK (${dl.suggestedFilename()})`;
  }

  console.log(`\n=== ${t.name} ${browser.version()} ===`);
  for (const r of results) {
    if (!r.ok) failures++;
    const d = typeof r.detail === 'string' ? r.detail : JSON.stringify(r.detail);
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id.padEnd(16)} ${String(r.ms).padStart(6)} ms  ${d.slice(0, 160)}`);
  }
  console.log(`save      ${save}`);
  console.log(`network   ${network.length ? 'REQUÊTES : ' + network.join(', ') : 'aucune requête hors file:/data:/blob:'}`);
  const unexpected = problems.filter((p) => !/example\.com|Content Security Policy|Content-Security-Policy|connect-src|NetworkError|Failed to fetch|Load failed|access control checks/i.test(p));
  console.log(`console   ${problems.length} erreur(s) dont ${unexpected.length} inattendue(s)${unexpected.length ? ' : ' + unexpected.join(' | ') : ''}`);
  if (network.length || unexpected.length) failures++;
  await browser.close();
}
console.log(failures ? `\n${failures} échec(s)` : '\nTous les tests passent');
process.exit(failures ? 1 : 0);
