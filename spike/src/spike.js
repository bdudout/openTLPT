// Banc d'essai du spike ADR-0001..0004. Chaque test renvoie { id, label, ok, detail }.
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import sqliteWasmBase64 from 'virtual:sqlite-wasm-base64';
import { argon2id } from 'hash-wasm';
import schemaSql from '../../schema/tlpt.sql?raw';
import corePack from '../../referentiel/packs/core.json';
import doraPack from '../../referentiel/packs/dora-rts.json';
import tiberEuPack from '../../referentiel/packs/tiber-eu.json';
import tiberFrPack from '../../referentiel/packs/tiber-fr.json';

// Vecteur de référence calculé avec argon2-cffi (implémentation de référence C) :
// argon2id(pwd, salt, t=3, m=64 Mio, p=1, len=32)
const ARGON_PWD = 'correct horse battery staple';
const ARGON_SALT = 'opentlpt-salt-16';
const ARGON_EXPECTED = '5bf4063720fe55f9272123477a552cd221fa327676eb62090cc4dfc1573327e8';

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const canon = (v) =>
  v === null || typeof v !== 'object'
    ? JSON.stringify(v)
    : Array.isArray(v)
      ? `[${v.map(canon).join(',')}]`
      : `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`;
const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function run(id, label, fn) {
  const t0 = performance.now();
  try {
    const detail = await fn();
    return { id, label, ok: true, detail, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { id, label, ok: false, detail: String(e?.message ?? e), ms: Math.round(performance.now() - t0) };
  }
}

function expectThrow(fn, what) {
  try { fn(); } catch { return; }
  throw new Error(`non bloqué : ${what}`);
}

let sqlite3 = null;
export let lastDbBytes = null;

async function journalAppend(db, entry) {
  const prev = db.selectValue('SELECT hash FROM journal ORDER BY seq DESC LIMIT 1') ?? '0'.repeat(64);
  const seq = (db.selectValue('SELECT max(seq) FROM journal') ?? 0) + 1;
  const e = { seq, ts: new Date().toISOString(), session_id: 's1', author: 'Spike', ...entry, prev_hash: prev };
  const hash = await sha256(canon(e));
  db.exec({
    sql: 'INSERT INTO journal VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    bind: [e.seq, e.ts, e.session_id, e.author, e.action, e.entity, e.entity_id,
      e.before === null ? null : canon(e.before), e.after === null ? null : canon(e.after), e.prev_hash, hash],
  });
}

async function verifyChain(db) {
  let prev = '0'.repeat(64);
  const rows = db.selectObjects('SELECT * FROM journal ORDER BY seq');
  for (const r of rows) {
    const e = { seq: r.seq, ts: r.ts, session_id: r.session_id, author: r.author, action: r.action,
      entity: r.entity, entity_id: r.entity_id,
      before: r.before === null ? null : JSON.parse(r.before), after: r.after === null ? null : JSON.parse(r.after),
      prev_hash: r.prev_hash };
    if (r.prev_hash !== prev || (await sha256(canon(e))) !== r.hash) throw new Error(`rupture au seq ${r.seq}`);
    prev = r.hash;
  }
  return rows.length;
}

async function deriveKey(passphrase, saltBytes, params) {
  const raw = await argon2id({ password: passphrase, salt: saltBytes, parallelism: params.p,
    iterations: params.t, memorySize: params.m_kib, hashLength: 32, outputType: 'binary' });
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptEnvelope(dbBytes, passphrase, fileVersion) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const b64 = (u8) => btoa(String.fromCharCode(...u8));
  const header = { magic: 'openTLPT', format: 1, file_version: fileVersion,
    kdf: { alg: 'argon2id', m_kib: 65536, t: 3, p: 1, salt: b64(salt) },
    cipher: { alg: 'AES-256-GCM', iv: b64(iv) } };
  const key = await deriveKey(passphrase, salt, header.kdf);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(canon(header)) }, key, dbBytes);
  let bin = ''; const u8 = new Uint8Array(ct);
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return { ...header, payload: btoa(bin) };
}

export async function decryptEnvelope(env, passphrase) {
  const { payload, ...header } = env;
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const key = await deriveKey(passphrase, unb64(header.kdf.salt), header.kdf);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(header.cipher.iv),
    additionalData: enc.encode(canon(header)) }, key, unb64(payload));
  return new Uint8Array(pt);
}

function openFromBytes(bytes) {
  const db = new sqlite3.oo1.DB();
  const p = sqlite3.wasm.allocFromTypedArray(bytes);
  const rc = sqlite3.capi.sqlite3_deserialize(db.pointer, 'main', p, bytes.length, bytes.length,
    sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE);
  db.checkRc(rc);
  return db;
}

export async function runAll(onResult) {
  const results = [];
  const push = (r) => { results.push(r); onResult?.(r); };

  push(await run('env', 'Environnement (protocole, contexte sécurisé, API)', async () => {
    const d = { protocol: location.protocol, secureContext: isSecureContext, subtle: !!crypto?.subtle,
      fsaSave: 'showSaveFilePicker' in window, fsaOpen: 'showOpenFilePicker' in window,
      compressionStream: 'CompressionStream' in window, ua: navigator.userAgent };
    if (!d.subtle) throw new Error(`crypto.subtle indisponible (${JSON.stringify(d)})`);
    return d;
  }));

  push(await run('sqlite-init', 'SQLite WASM initialisé depuis les octets inlinés (sans fetch)', async () => {
    const wasmBinary = base64ToBytes(sqliteWasmBase64);
    sqlite3 = await sqlite3InitModule({ wasmBinary, print: () => {}, printErr: () => {} });
    return { version: sqlite3.version.libVersion, wasmBytes: wasmBinary.length };
  }));

  let db;
  push(await run('sqlite-schema', 'Schéma tlpt.sql chargé (STRICT, JSON, déclencheurs)', async () => {
    db = new sqlite3.oo1.DB(':memory:', 'c');
    db.exec(schemaSql);
    const tables = db.selectValues("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    expectThrow(() => db.exec("INSERT INTO parties(id, actor_ref) VALUES ('abc','CT')"), 'STRICT INTEGER');
    expectThrow(() => db.exec("INSERT INTO facts VALUES ('pooled','{pas du json')"), 'json_valid');
    expectThrow(() => db.exec("INSERT INTO checklist VALUES ('RTS-9.2','not_applicable',NULL,NULL,'x')"), 'justification N/A');
    return { tables: tables.length };
  }));

  push(await run('journal', 'Journal chaîné : insertion, déclencheurs append-only, vérification', async () => {
    db.exec("INSERT INTO sessions VALUES ('s1','Spike','2026-10-19T12:00:00Z','spike','2026.10.0')");
    db.exec("INSERT INTO meta VALUES ('codename','HERON')");
    await journalAppend(db, { action: 'session_open', entity: null, entity_id: null, before: null, after: null });
    await journalAppend(db, { action: 'update', entity: 'event_dates', entity_id: 'N0', before: null, after: { date: '2026-10-01' } });
    await journalAppend(db, { action: 'update', entity: 'checklist', entity_id: 'RTS-9.2', before: null, after: { status: 'done' } });
    expectThrow(() => db.exec("UPDATE journal SET author='Mallory' WHERE seq=1"), 'UPDATE journal');
    expectThrow(() => db.exec('DELETE FROM journal WHERE seq=2'), 'DELETE journal');
    return { entries: await verifyChain(db) };
  }));

  push(await run('sqlite-roundtrip', 'Export / réimport de la base (serialize / deserialize)', async () => {
    lastDbBytes = sqlite3.capi.sqlite3_js_db_export(db);
    const db2 = openFromBytes(lastDbBytes);
    const n = await verifyChain(db2);
    const codename = db2.selectValue("SELECT value FROM meta WHERE key='codename'");
    db2.close();
    if (n !== 3 || codename !== 'HERON') throw new Error('contenu différent après réimport');
    return { bytes: lastDbBytes.length, journal: n };
  }));

  push(await run('argon2', 'Argon2id (64 Mio, t=3, p=1) conforme au vecteur de référence', async () => {
    const t0 = performance.now();
    const h = await argon2id({ password: ARGON_PWD, salt: ARGON_SALT, parallelism: 1, iterations: 3,
      memorySize: 65536, hashLength: 32, outputType: 'hex' });
    const ms = Math.round(performance.now() - t0);
    if (h !== ARGON_EXPECTED) throw new Error(`hash inattendu ${h}`);
    return { ms };
  }));

  push(await run('aes-gcm', 'Enveloppe .tlpt : chiffrement, en-tête en AAD, altération et mauvaise passphrase rejetées', async () => {
    const env = await encryptEnvelope(lastDbBytes, 'phrase de passe du spike', 7);
    const back = await decryptEnvelope(env, 'phrase de passe du spike');
    if (back.length !== lastDbBytes.length || back.some((b, i) => b !== lastDbBytes[i])) throw new Error('aller-retour différent');
    const tampered = { ...env, file_version: 8 };
    let rejected = 0;
    try { await decryptEnvelope(tampered, 'phrase de passe du spike'); } catch { rejected++; }
    try { await decryptEnvelope(env, 'mauvaise phrase'); } catch { rejected++; }
    if (rejected !== 2) throw new Error('altération ou mauvaise passphrase non rejetée');
    return { envelopeChars: JSON.stringify(env).length };
  }));

  push(await run('packs', 'Référentiel JSON inliné', async () => {
    const items = [doraPack, tiberEuPack, tiberFrPack].reduce((n, p) => n + p.items.length, 0);
    return { items, deadlines: corePack.deadlines.length };
  }));

  push(await run('no-network', 'Aucun accès réseau (CSP connect-src none)', async () => {
    const resources = performance.getEntriesByType('resource').map((e) => e.name);
    let blocked = false;
    try { await fetch('https://example.com/opentlpt-spike'); } catch { blocked = true; }
    if (!blocked) throw new Error('fetch externe NON bloqué');
    if (resources.length) throw new Error(`ressources chargées : ${resources.join(', ')}`);
    return { resources: 0, externalFetchBlocked: true };
  }));

  push(await run('no-storage', 'Rien écrit dans le stockage du navigateur', async () => {
    let ls = 0;
    try { ls = localStorage.length; } catch { ls = 0; }
    const idb = indexedDB?.databases ? (await indexedDB.databases()).length : 0;
    if (ls || idb) throw new Error(`localStorage=${ls}, IndexedDB=${idb}`);
    return { localStorage: ls, indexedDB: idb };
  }));

  window.__SPIKE_RESULTS__ = results;
  window.__SPIKE_DONE__ = true;
  return results;
}
