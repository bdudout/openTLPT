import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';

const here = dirname(fileURLToPath(import.meta.url));
// Le binaire SQLite vient des dépendances du moteur (engine/), seule source de vérité des versions.
const requireFromEngine = createRequire(join(here, '..', 'engine', 'package.json'));
const sqliteDist = dirname(requireFromEngine.resolve('@sqlite.org/sqlite-wasm/sqlite3.wasm'));

/** Binaire SQLite WASM exposé en base64 : instancié depuis ces octets, sans fetch (ADR-0002). */
function inlineSqliteWasm(): Plugin {
  const id = 'virtual:sqlite-wasm-base64';
  return {
    name: 'opentlpt-inline-sqlite-wasm',
    resolveId: (source) => (source === id ? '\0' + id : null),
    load: (key) =>
      key === '\0' + id
        ? `export default ${JSON.stringify(readFileSync(join(sqliteDist, 'sqlite3.wasm')).toString('base64'))};`
        : null,
  };
}

/** Neutralise les chemins Worker / OPFS de sqlite-wasm (ADR-0002) ; échoue si le code amont change. */
function stripSqliteWorkers(): Plugin {
  const disabled = '(() => { throw new Error("openTLPT: Worker/OPFS disabled (ADR-0002)"); })()';
  const patterns = [
    'new Worker(new URL("sqlite3-worker1.mjs", import.meta.url), { type: "module" })',
    'new URL("sqlite3-opfs-async-proxy.js", import.meta.url)',
  ];
  return {
    name: 'opentlpt-strip-sqlite-workers',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@sqlite.org/sqlite-wasm/dist/index.mjs')) return null;
      let out = code;
      for (const p of patterns) {
        if (!out.includes(p)) this.error(`motif introuvable dans sqlite-wasm (mise à jour ?) : ${p}`);
        out = out.split(p).join(disabled);
      }
      return { code: out, map: null };
    },
  };
}

// ADR-0004 : tout est inliné dans dist/index.html.
export default defineConfig({
  base: './',
  plugins: [stripSqliteWorkers(), inlineSqliteWasm(), svelte(), viteSingleFile({ removeViteModuleLoader: true })],
  server: { fs: { allow: ['..'] } },
  build: {
    target: 'es2022',
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    modulePreload: false,
    reportCompressedSize: false,
  },
});
