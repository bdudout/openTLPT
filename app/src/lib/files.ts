// Accès aux fichiers sans droits admin (ENF-4, ENF-11) : File System Access API si disponible,
// sinon <input type="file"> pour ouvrir et téléchargement pour enregistrer.

interface FsWritable { write(data: Blob | string): Promise<void>; close(): Promise<void> }
export interface FsHandle { name: string; getFile(): Promise<File>; createWritable(): Promise<FsWritable> }
type PickerTypes = { types: { description: string; accept: Record<string, string[]> }[]; excludeAcceptAllOption?: boolean };
interface FsaWindow {
  showOpenFilePicker?: (o?: PickerTypes & { multiple?: boolean }) => Promise<FsHandle[]>;
  showSaveFilePicker?: (o?: PickerTypes & { suggestedName?: string }) => Promise<FsHandle>;
}

const TYPES: PickerTypes = { types: [{ description: 'openTLPT', accept: { 'application/json': ['.tlpt'] } }] };
const w = () => window as unknown as FsaWindow;

export const hasFsa = (): boolean => typeof w().showSaveFilePicker === 'function' && typeof w().showOpenFilePicker === 'function';
export const hasWasm = (): boolean => typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';

export interface PickedFile { name: string; text: string; handle: FsHandle | null }

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

/** Sélection d'un fichier .tlpt. Renvoie null si l'utilisateur annule. */
export async function pickTlpt(): Promise<PickedFile | null> {
  const open = w().showOpenFilePicker;
  if (hasFsa() && open) {
    try {
      const [handle] = await open(TYPES);
      if (!handle) return null;
      const file = await handle.getFile();
      return { name: file.name, text: await file.text(), handle };
    } catch (e) {
      if (isAbort(e)) return null;
      throw e;
    }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.tlpt,application/json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      resolve(file ? { name: file.name, text: await file.text(), handle: null } : null);
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

/** Contenu actuel du fichier ciblé (null si vide ou nouveau) : sert au contrôle DEC-1 avant écriture. */
export async function readHandle(handle: FsHandle): Promise<string | null> {
  const file = await handle.getFile();
  return file.size === 0 ? null : file.text();
}

export async function chooseSaveTarget(suggestedName: string): Promise<FsHandle | null> {
  const save = w().showSaveFilePicker;
  if (!save) return null;
  try {
    return await save({ ...TYPES, suggestedName });
  } catch (e) {
    if (isAbort(e)) return null;
    throw e;
  }
}

export async function writeHandle(handle: FsHandle, text: string): Promise<void> {
  const out = await handle.createWritable();
  await out.write(new Blob([text], { type: 'application/json' }));
  await out.close();
}

/** Repli sans FSA : téléchargement (le navigateur choisit le dossier ; l'utilisateur remplace l'ancien fichier). */
export function downloadText(name: string, text: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2_000);
}
