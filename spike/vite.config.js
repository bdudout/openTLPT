import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';

const require = createRequire(import.meta.url);
const sqliteDist = dirname(require.resolve('@sqlite.org/sqlite-wasm/sqlite3.wasm'));

// Expose le binaire SQLite WASM en base64 : il est instancié depuis ces octets, sans fetch (ADR-0002).
function inlineSqliteWasm() {
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

// Neutralise les chemins Worker / OPFS de sqlite-wasm (exclus par ADR-0002) : sinon Vite émet des fichiers séparés.
function stripSqliteWorkers() {
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

// Spike ADR-0004 : tout est inliné dans dist/index.html (aucune ressource externe).
export default defineConfig({
  base: './',
  plugins: [stripSqliteWorkers(), inlineSqliteWasm(), svelte(), viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: 'es2022',
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    modulePreload: false,
    reportCompressedSize: false,
  },
});
