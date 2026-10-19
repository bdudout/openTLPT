// Contrôleur de l'application : un exercice ouvert à la fois. La passphrase n'est jamais conservée ;
// seule la clé de session (non extractible) vit en mémoire jusqu'au verrouillage (ADR-0003).
import sqliteWasmBase64 from 'virtual:sqlite-wasm-base64';
import schemaSql from '../../../schema/tlpt.sql?raw';
import {
  Exercise, TlptError, assertNoConflict, createSession, fromBase64, openEnvelope, seal,
  type ExerciseState, type Profile, type Session, type SqlDbFactory,
} from '../../../engine/src/index.ts';
import { createSqliteWasm } from '../../../engine/src/sqlite-wasm.ts';
import { chooseSaveTarget, downloadText, hasFsa, readHandle, writeHandle, type FsHandle, type PickedFile } from './files.ts';
import { t, type MsgKey } from './i18n.svelte.ts';
import { REF_VERSION, TOOL_VERSION } from './ref.ts';

export type Screen = 'home' | 'new' | 'open' | 'exercise';

export const ui = $state({
  screen: 'home' as Screen,
  busy: '' as string,
  error: '' as string,
  notice: '' as string,
  dirty: false,
  /** Incrémenté à chaque mutation : les vues recalculent l'état dérivé. */
  rev: 0,
  fileVersion: 0,
  fileName: '',
  integrityBrokenAt: 0,
  kdfUpgraded: false,
});

let factory: SqlDbFactory | null = null;
let exercise: Exercise | null = null;
let session: Session | null = null;
let handle: FsHandle | null = null;

async function getFactory(): Promise<SqlDbFactory> {
  factory ??= await createSqliteWasm({ wasmBinary: fromBase64(sqliteWasmBase64) });
  return factory;
}

export function currentExercise(): Exercise {
  if (!exercise) throw new Error('aucun exercice ouvert');
  return exercise;
}

/** Date locale du poste au format ISO (et non UTC : un PMO à 00h30 est bien « aujourd'hui »). */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadState(): ExerciseState {
  void ui.rev; // dépendance réactive explicite
  return currentExercise().loadState(todayISO());
}

function errorMessage(e: unknown): string {
  if (e instanceof TlptError) return t(`err.${e.code}` as MsgKey);
  return t('err.generic', { msg: e instanceof Error ? e.message : String(e) });
}

async function guarded<T>(busyKey: MsgKey | '', fn: () => Promise<T>): Promise<T | undefined> {
  ui.error = '';
  ui.notice = '';
  ui.busy = busyKey ? t(busyKey) : '…';
  try {
    return await fn();
  } catch (e) {
    ui.error = errorMessage(e);
    return undefined;
  } finally {
    ui.busy = '';
  }
}

export interface NewExerciseInput { codename: string; profile: Profile; author: string; entityName: string; passphrase: string }

export async function createExercise(input: NewExerciseInput): Promise<boolean> {
  const ok = await guarded('busy.derive', async () => {
    const f = await getFactory();
    const s = await createSession(input.passphrase);
    const ex = await Exercise.create(f, schemaSql, {
      codename: input.codename.trim(), profile: input.profile, author: input.author,
      ...(input.entityName.trim() ? { entityName: input.entityName } : {}),
      toolVersion: TOOL_VERSION, refVersion: REF_VERSION,
    });
    replaceCurrent(ex, s, null, `${input.codename.trim()}.tlpt`);
    ui.dirty = true; // jamais enregistré
    return true;
  });
  return ok === true;
}

export async function openExercise(file: PickedFile, author: string, passphrase: string): Promise<boolean> {
  const ok = await guarded('busy.derive', async () => {
    const f = await getFactory();
    const opened = await openEnvelope(file.text, passphrase);
    const ex = await Exercise.open(f, opened.dbBytes, { author, toolVersion: TOOL_VERSION, refVersion: REF_VERSION });
    replaceCurrent(ex, opened.session, file.handle, file.name);
    ui.kdfUpgraded = opened.kdfUpgraded;
    ui.integrityBrokenAt = ex.integrityAtOpen.ok ? 0 : ex.integrityAtOpen.brokenAt;
    // La session ouverte est elle-même journalisée : la base en mémoire diffère du fichier.
    ui.dirty = true;
    return true;
  });
  return ok === true;
}

function replaceCurrent(ex: Exercise, s: Session, h: FsHandle | null, name: string) {
  exercise?.close();
  exercise = ex;
  session = s;
  handle = h;
  ui.fileName = name;
  ui.fileVersion = s.fileVersion;
  ui.integrityBrokenAt = 0;
  ui.kdfUpgraded = false;
  ui.rev++;
  ui.screen = 'exercise';
}

/** Enregistrement. `saveAs` force le choix d'un nouveau fichier (issue d'un conflit DEC-1). */
export async function save(saveAs = false): Promise<void> {
  await guarded('busy.save', async () => {
    if (!exercise || !session) return;
    const name = `${exercise.meta().codename ?? 'exercice'}.tlpt`;
    if (hasFsa()) {
      let target = saveAs ? null : handle;
      let diskText: string | null = null;
      if (target) diskText = await readHandle(target);
      else {
        target = await chooseSaveTarget(name);
        if (!target) return; // annulé
      }
      assertNoConflict(diskText, session);
      const text = await seal(session, await exercise.exportBytes());
      await writeHandle(target, text);
      handle = target;
      ui.fileName = target.name;
      ui.notice = t('ex.saved', { v: session.fileVersion });
    } else {
      const text = await seal(session, await exercise.exportBytes());
      downloadText(name, text);
      ui.fileName = name;
      ui.notice = t('ex.downloaded', { v: session.fileVersion });
    }
    ui.fileVersion = session.fileVersion;
    ui.dirty = false;
    ui.kdfUpgraded = false;
    ui.rev++;
  });
}

/** Mutation métier : journalisée par le moteur ; marque l'exercice comme modifié. */
export async function mutate(fn: (ex: Exercise) => Promise<boolean>): Promise<void> {
  await guarded('', async () => {
    const changed = await fn(currentExercise());
    if (changed) { ui.dirty = true; ui.rev++; }
  });
}

export function lock(force = false): boolean {
  if (ui.dirty && !force && !confirm(t('ex.lock.confirm'))) return false;
  exercise?.close();
  exercise = null;
  session = null;
  handle = null;
  Object.assign(ui, { screen: 'home', dirty: false, fileName: '', fileVersion: 0, notice: '', error: '', integrityBrokenAt: 0, kdfUpgraded: false });
  ui.rev++;
  return true;
}

export const go = (screen: Screen) => { ui.error = ''; ui.notice = ''; ui.screen = screen; };
