<script>
  import { onMount } from 'svelte';
  import { runAll, lastDbBytes, encryptEnvelope } from './spike.js';

  const T = {
    fr: { title: 'openTLPT — spike technique', run: 'Tests automatiques', save: 'Enregistrer un .tlpt de test',
          obligation: 'Obligation', practice: 'Bonne pratique', saved: 'Enregistré via', lang: 'English' },
    en: { title: 'openTLPT — technical spike', run: 'Automatic checks', save: 'Save a test .tlpt',
          obligation: 'Obligation', practice: 'Good practice', saved: 'Saved via', lang: 'Français' },
  };
  let lang = $state('fr');
  let results = $state([]);
  let saveMsg = $state('');
  const t = (k) => T[lang][k];

  onMount(() => { runAll((r) => (results = [...results, r])); });

  async function save() {
    const env = await encryptEnvelope(lastDbBytes, 'phrase de passe du spike', 1);
    const blob = new Blob([JSON.stringify(env)], { type: 'application/json' });
    if ('showSaveFilePicker' in window) {
      try {
        const h = await window.showSaveFilePicker({ suggestedName: 'HERON.tlpt' });
        const w = await h.createWritable(); await w.write(blob); await w.close();
        saveMsg = `${t('saved')} File System Access API`;
        return;
      } catch (e) { if (e?.name === 'AbortError') return; saveMsg = `FSA: ${e?.message}`; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'HERON.tlpt'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    saveMsg = `${t('saved')} téléchargement (mode dégradé)`;
  }
</script>

<main>
  <header>
    <h1>{t('title')}</h1>
    <button onclick={() => (lang = lang === 'fr' ? 'en' : 'fr')} lang={lang === 'fr' ? 'en' : 'fr'}>{t('lang')}</button>
  </header>
  <p>
    <span class="badge obligation">{t('obligation')}</span>
    <span class="badge practice">{t('practice')} (TIBER-EU)</span>
  </p>
  <h2>{t('run')}</h2>
  <table>
    <thead><tr><th scope="col">Test</th><th scope="col">Résultat</th><th scope="col">ms</th><th scope="col">Détail</th></tr></thead>
    <tbody>
      {#each results as r (r.id)}
        <tr data-test={r.id} data-ok={r.ok}>
          <td>{r.label}</td>
          <td class={r.ok ? 'pass' : 'fail'}>{r.ok ? 'PASS' : 'FAIL'}</td>
          <td>{r.ms}</td>
          <td><code>{typeof r.detail === 'string' ? r.detail : JSON.stringify(r.detail)}</code></td>
        </tr>
      {/each}
    </tbody>
  </table>
  <p><button onclick={save} disabled={!results.find((r) => r.id === 'sqlite-roundtrip')?.ok}>{t('save')}</button>
    <span role="status">{saveMsg}</span></p>
</main>

<style>
  :global(body) { font-family: system-ui, sans-serif; margin: 0; background: #fafafa; color: #1a1a1a; }
  main { max-width: 1100px; margin: 0 auto; padding: 16px; }
  header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { border-bottom: 1px solid #ddd; padding: 6px; text-align: left; vertical-align: top; }
  code { word-break: break-all; font-size: 12px; }
  .pass { color: #0a6b2d; font-weight: 700; }
  .fail { color: #b00020; font-weight: 700; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 13px; font-weight: 600; }
  .obligation { background: #7a0019; color: #fff; }
  .practice { background: #e6f0ff; color: #0b3d91; border: 1px solid #0b3d91; }
  button { font: inherit; padding: 6px 12px; }
</style>
