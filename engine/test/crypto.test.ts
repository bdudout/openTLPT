import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalize } from '../src/jcs.ts';
import { fromBase64, randomBytes, toBase64, toHex, utf8 } from '../src/bytes.ts';
import { deriveKeyBytes, kdfParamProblems, passphraseProblems, type DeriveFn, type KdfParams } from '../src/kdf.ts';
import {
  TlptError, assertNoConflict, changePassphrase, createSession, openEnvelope, parseEnvelope, readFileVersion, seal,
} from '../src/envelope.ts';

// Paramètres plancher (OWASP) pour garder les tests rapides ; les valeurs par défaut sont testées à part.
const FAST = { argon2: { m_kib: 19_456, t: 2, p: 1 } };
const PASS = 'phrase de passe suffisamment longue';

function countingDerive(): { derive: DeriveFn; calls: () => number } {
  let n = 0;
  return { derive: async (p, k) => { n++; return deriveKeyBytes(p, k); }, calls: () => n };
}

async function expectCode(p: Promise<unknown> | (() => unknown), code: string) {
  try {
    await (typeof p === 'function' ? p() : p);
  } catch (e) {
    assert.ok(e instanceof TlptError, `TlptError attendue, reçu ${String(e)}`);
    assert.equal(e.code, code);
    return;
  }
  assert.fail(`erreur ${code} attendue`);
}

test('JCS : clés triées, imbrication, unicode, nombres', () => {
  assert.equal(canonicalize({ b: 1, a: [true, null, 'é'], c: { z: 1.5, y: -0 } }), '{"a":[true,null,"é"],"b":1,"c":{"y":0,"z":1.5}}');
  assert.equal(canonicalize({ 'é': 1, e: 2, E: 3 }), '{"E":3,"e":2,"é":1}');
  assert.equal(canonicalize({ a: undefined, b: 2 }), '{"b":2}');
  assert.throws(() => canonicalize(Number.NaN));
});

test('base64 et hex : aller-retour sur de gros tampons', () => {
  const b = randomBytes(300_000);
  assert.deepEqual(fromBase64(toBase64(b)), b);
  assert.equal(toHex(utf8('ab')), '6162');
});

test('Argon2id : vecteur de l\'implémentation de référence (argon2-cffi), paramètres par défaut', async () => {
  const k = await deriveKeyBytes('correct horse battery staple',
    { alg: 'argon2id', m_kib: 65_536, t: 3, p: 1, salt: toBase64(utf8('opentlpt-salt-16')) });
  assert.equal(toHex(k), '5bf4063720fe55f9272123477a552cd221fa327676eb62090cc4dfc1573327e8');
});

test('PBKDF2-SHA256 : vecteur connu (password / salt / 1 itération)', async () => {
  const k = await deriveKeyBytes('password', { alg: 'pbkdf2-sha256', iterations: 1, salt: toBase64(utf8('salt')) });
  assert.equal(toHex(k), '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b');
});

test('bornes des paramètres KDF (plancher OWASP, plafonds anti-DoS)', () => {
  const salt = toBase64(randomBytes(16));
  assert.deepEqual(kdfParamProblems({ alg: 'argon2id', m_kib: 65_536, t: 3, p: 1, salt }), []);
  assert.ok(kdfParamProblems({ alg: 'argon2id', m_kib: 8_192, t: 3, p: 1, salt }).includes('m_kib hors bornes'));
  assert.ok(kdfParamProblems({ alg: 'argon2id', m_kib: 4_194_304, t: 3, p: 1, salt }).includes('m_kib hors bornes'));
  assert.ok(kdfParamProblems({ alg: 'argon2id', m_kib: 65_536, t: 1, p: 1, salt }).includes('t hors bornes'));
  assert.ok(kdfParamProblems({ alg: 'argon2id', m_kib: 65_536, t: 3, p: 1, salt: toBase64(randomBytes(8)) }).length > 0);
  assert.ok(kdfParamProblems({ alg: 'pbkdf2-sha256', iterations: 100_000, salt }).includes('iterations hors bornes'));
  assert.ok(kdfParamProblems({ alg: 'scrypt', salt }).length > 0);
  assert.ok(kdfParamProblems({ alg: 'argon2id', m_kib: 65_536, t: 3, p: 1, salt, extra: 1 }).includes('champ kdf inconnu'));
});

test('politique de passphrase (14 caractères minimum)', async () => {
  assert.deepEqual(passphraseProblems(PASS), []);
  assert.ok(passphraseProblems('court').length > 0);
  assert.ok(passphraseProblems(' espaces autour suffisants ').length > 0);
  await expectCode(createSession('trop court', FAST), 'weak_passphrase');
});

test('aller-retour, une seule dérivation par session, IV toujours neuf, version incrémentée', async () => {
  const spy = countingDerive();
  const session = await createSession(PASS, { ...FAST, derive: spy.derive });
  const data = randomBytes(50_000);
  const ivs = new Set<string>();
  let text = '';
  for (let i = 0; i < 200; i++) {
    text = await seal(session, data);
    ivs.add(parseEnvelope(text).cipher.iv);
  }
  assert.equal(spy.calls(), 1, 'une seule dérivation pour 200 enregistrements');
  assert.equal(ivs.size, 200, 'IV unique à chaque enregistrement');
  assert.equal(readFileVersion(text), 200);
  const opened = await openEnvelope(text, PASS, { derive: spy.derive });
  assert.deepEqual(opened.dbBytes, data);
  assert.equal(opened.session.fileVersion, 200);
  assert.equal(opened.kdfUpgraded, false);
  assert.equal(spy.calls(), 2);
});

test('mauvaise passphrase et altérations : même erreur générique (pas d\'oracle)', async () => {
  const session = await createSession(PASS, FAST);
  const text = await seal(session, utf8('base sqlite'));
  const env = JSON.parse(text) as Record<string, unknown>;
  await expectCode(openEnvelope(text, 'une autre phrase assez longue'), 'decrypt_failed');
  await expectCode(openEnvelope(JSON.stringify({ ...env, file_version: 99 }), PASS), 'decrypt_failed');
  const kdf = env.kdf as KdfParams & { t: number };
  await expectCode(openEnvelope(JSON.stringify({ ...env, kdf: { ...kdf, t: kdf.t + 1 } }), PASS), 'decrypt_failed');
  const payload = fromBase64(env.payload as string);
  payload[5] = (payload[5] ?? 0) ^ 1;
  await expectCode(openEnvelope(JSON.stringify({ ...env, payload: toBase64(payload) }), PASS), 'decrypt_failed');
  const iv = fromBase64((env.cipher as { iv: string }).iv);
  iv[0] = (iv[0] ?? 0) ^ 1;
  await expectCode(openEnvelope(JSON.stringify({ ...env, cipher: { alg: 'AES-256-GCM', iv: toBase64(iv) } }), PASS), 'decrypt_failed');
});

test('fichiers non openTLPT, format inconnu, en-tête invalide', async () => {
  await expectCode(() => parseEnvelope('pas du json'), 'not_tlpt');
  await expectCode(() => parseEnvelope('{"magic":"autre"}'), 'not_tlpt');
  const session = await createSession(PASS, FAST);
  const env = JSON.parse(await seal(session, utf8('x'))) as Record<string, unknown>;
  await expectCode(() => parseEnvelope(JSON.stringify({ ...env, format: 2 })), 'unsupported_format');
  await expectCode(() => parseEnvelope(JSON.stringify({ ...env, extra: true })), 'bad_params');
  await expectCode(() => parseEnvelope(JSON.stringify({ ...env, file_version: -1 })), 'bad_params');
  await expectCode(() => parseEnvelope(JSON.stringify({ ...env, kdf: { ...(env.kdf as object), m_kib: 1024 } })), 'bad_params');
  await expectCode(() => parseEnvelope(JSON.stringify({ ...env, cipher: { alg: 'AES-128-CBC', iv: 'AAAA' } })), 'bad_params');
});

test('changement de passphrase : sel et clé neufs, l\'ancienne passphrase ne marche plus', async () => {
  const s1 = await createSession(PASS, FAST);
  await seal(s1, utf8('v1'));
  const s2 = await changePassphrase(s1, 'nouvelle phrase de passe longue', FAST);
  assert.notEqual(s2.kdf.salt, s1.kdf.salt);
  assert.equal(s2.fileVersion, 1);
  const text = await seal(s2, utf8('v2'));
  assert.equal(readFileVersion(text), 2);
  await expectCode(openEnvelope(text, PASS), 'decrypt_failed');
  assert.deepEqual((await openEnvelope(text, 'nouvelle phrase de passe longue')).dbBytes, utf8('v2'));
});

test('fichier PBKDF2 : lisible, puis réécrit en Argon2id', async () => {
  const kdf: KdfParams = { alg: 'pbkdf2-sha256', iterations: 600_000, salt: toBase64(randomBytes(16)) };
  const legacy = { key: await crypto.subtle.importKey('raw', await deriveKeyBytes('ancienne', kdf) as Uint8Array<ArrayBuffer>, 'AES-GCM', false, ['encrypt', 'decrypt']), kdf, fileVersion: 4 };
  const text = await seal(legacy, utf8('données'));
  const opened = await openEnvelope(text, 'ancienne', FAST); // passphrase courte : un ancien fichier reste ouvrable
  assert.deepEqual(opened.dbBytes, utf8('données'));
  assert.equal(opened.kdfUpgraded, true);
  assert.equal(opened.session.kdf.alg, 'argon2id');
  const rewritten = await seal(opened.session, opened.dbBytes);
  assert.equal(parseEnvelope(rewritten).kdf.alg, 'argon2id');
  assert.equal(readFileVersion(rewritten), 6);
});

test('DEC-1 : refus d\'écraser un fichier modifié ailleurs', async () => {
  const a = await createSession(PASS, FAST);
  const v1 = await seal(a, utf8('v1'));
  const b = (await openEnvelope(v1, PASS)).session;             // un second poste ouvre la version 1
  const v2 = await seal(a, utf8('v2 du premier poste'));          // le premier poste enregistre (version 2)
  assertNoConflict(v2, a);                                         // le premier poste peut continuer
  await expectCode(() => assertNoConflict(v2, b), 'file_conflict'); // le second ne doit pas écraser
  assertNoConflict(null, b);                                        // « enregistrer sous » un nouveau fichier : OK
});
