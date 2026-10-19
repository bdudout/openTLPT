// i18n v1 : FR / EN (EF-7). Les autres langues s'ajoutent par dictionnaire, sans toucher la logique.
import type { Localized } from './ref.ts';

const fr = {
  'app.tagline': 'Suivi de conformité TLPT (DORA) — local, chiffré, traçable',
  'app.local': 'Rien ne quitte ce poste : aucun réseau, aucune installation, aucun droit administrateur.',
  'lang.switch': 'English',
  'home.new': 'Nouvel exercice',
  'home.open': 'Ouvrir un fichier .tlpt',
  'home.wasm': 'Ce navigateur bloque WebAssembly (politique de sécurité). openTLPT ne peut pas fonctionner ici. Essayez un autre navigateur déjà installé (Firefox, Chrome), ou demandez à votre DSI une exception pour ce fichier.',
  'home.nofsa': 'Ce navigateur ne permet pas d\'écrire directement dans un fichier : chaque enregistrement produira un téléchargement.',
  'common.back': 'Retour',
  'common.author': 'Votre nom',
  'common.author.help': 'Inscrit dans le journal de chaque action (déclaratif).',
  'common.passphrase': 'Passphrase',
  'common.required': 'obligatoire',
  'new.title': 'Nouvel exercice TLPT',
  'new.codename': 'Nom de code',
  'new.codename.help': 'Utilisé partout à la place du nom de l\'entité (RTS 4(2)(f)). 2 à 40 caractères.',
  'new.profile': 'Votre rôle',
  'new.entity': 'Nom réel de l\'entité (facultatif)',
  'new.entity.help': 'Stocké chiffré, jamais dans le nom du fichier.',
  'new.passphrase.help': 'Au moins 14 caractères. Une phrase de 5 mots ou plus est idéale.',
  'new.passphrase2': 'Confirmer la passphrase',
  'new.mismatch': 'Les deux passphrases sont différentes.',
  'new.norecovery': 'J\'ai compris : sans la passphrase, le fichier est définitivement illisible. Aucune récupération n\'est possible.',
  'new.submit': 'Créer l\'exercice',
  'open.title': 'Ouvrir un exercice',
  'open.choose': 'Choisir un fichier .tlpt',
  'open.chosen': 'Fichier : {name}',
  'open.submit': 'Ouvrir',
  'busy.derive': 'Dérivation de la clé (Argon2id)… quelques secondes sur certains postes.',
  'busy.save': 'Chiffrement et enregistrement…',
  'ex.profile': 'Rôle',
  'ex.author': 'Session',
  'ex.version': 'Version du fichier',
  'ex.save': 'Enregistrer',
  'ex.saved': 'Enregistré (version {v}).',
  'ex.downloaded': 'Fichier téléchargé (version {v}). Remplacez l\'ancien fichier par celui-ci.',
  'ex.unsaved': 'Modifications non enregistrées',
  'ex.lock': 'Verrouiller',
  'ex.lock.confirm': 'Des modifications ne sont pas enregistrées. Verrouiller quand même et les perdre ?',
  'ex.integrity.broken': 'Alerte d\'intégrité : le journal est rompu à l\'entrée {seq}. Le fichier a pu être modifié hors d\'openTLPT. L\'anomalie est consignée.',
  'ex.kdf.upgraded': 'Ce fichier utilisait une dérivation de clé ancienne (PBKDF2). Il sera réécrit en Argon2id au prochain enregistrement.',
  'ex.today': 'Aujourd\'hui : {d}',
  'sec.deadlines': 'Échéances réglementaires',
  'sec.deadlines.help': 'Calculées à partir des dates saisies. Sources : DORA art. 26 et RTS (UE) 2025/1190 — obligations.',
  'sec.events': 'Chronologie de l\'exercice',
  'sec.events.help': 'Saisissez les dates au fur et à mesure. Chaque modification est journalisée.',
  'sec.facts': 'Caractéristiques de l\'exercice',
  'sec.facts.help': 'Elles déterminent les obligations et échéances applicables.',
  'order.issue': '{event} ({d1}) ne peut pas précéder {other} ({d2}).',
  'dl.col.deadline': 'Échéance',
  'dl.col.due': 'Date',
  'dl.col.state': 'Statut',
  'dl.col.done': 'Réalisé le',
  'dl.col.carriers': 'Porteur',
  'dl.waiting': 'En attente : {event}',
  'dl.before': 'Avant : {event}',
  'dl.days.left': 'dans {n} j',
  'dl.days.late': 'retard de {n} j',
  'dl.days.today': 'aujourd\'hui',
  'dl.min.earliest': 'fin au plus tôt',
  'dl.min.missing': 'il manque {n} j',
  'dl.periods': '{missing} période(s) non couverte(s) sur {total}',
  'dl.overridden': 'Délai modifié : {why}',
  'dl.info': 'information',
  'dl.badge.obligation': 'Obligation',
  'state.not_applicable': 'Non applicable',
  'state.waiting_anchor': 'En attente',
  'state.upcoming': 'À venir',
  'state.due_soon': 'Bientôt',
  'state.overdue': 'En retard',
  'state.done_on_time': 'Fait',
  'state.done_late': 'Fait en retard',
  'state.running': 'En cours',
  'state.min_met': 'Durée respectée',
  'state.min_violated': 'Durée insuffisante',
  'state.recurring_ok': 'À jour',
  'state.recurring_missing': 'Manquant',
  'fact.true': 'Oui',
  'fact.false': 'Non',
  'err.generic': 'Erreur : {msg}',
  'err.decrypt_failed': 'Impossible d\'ouvrir le fichier : passphrase incorrecte ou fichier altéré.',
  'err.not_tlpt': 'Ce fichier n\'est pas un fichier openTLPT.',
  'err.unsupported_format': 'Ce fichier a été créé par une version plus récente d\'openTLPT.',
  'err.bad_params': 'L\'en-tête du fichier est invalide.',
  'err.weak_passphrase': 'Passphrase trop faible : au moins 14 caractères.',
  'err.file_conflict': 'Le fichier a été modifié ailleurs depuis son ouverture. Pour ne rien écraser, l\'enregistrement est refusé : enregistrez sous un autre nom.',
  'ex.saveas': 'Enregistrer sous…',
} as const;

export type MsgKey = keyof typeof fr;

const en: Record<MsgKey, string> = {
  'app.tagline': 'DORA TLPT compliance tracking — local, encrypted, traceable',
  'app.local': 'Nothing leaves this computer: no network, no installation, no administrator rights.',
  'lang.switch': 'Français',
  'home.new': 'New exercise',
  'home.open': 'Open a .tlpt file',
  'home.wasm': 'This browser blocks WebAssembly (security policy). openTLPT cannot run here. Try another installed browser (Firefox, Chrome) or ask your IT for an exception for this file.',
  'home.nofsa': 'This browser cannot write files directly: each save will produce a download.',
  'common.back': 'Back',
  'common.author': 'Your name',
  'common.author.help': 'Recorded in the log for every action (self-declared).',
  'common.passphrase': 'Passphrase',
  'common.required': 'required',
  'new.title': 'New TLPT exercise',
  'new.codename': 'Code name',
  'new.codename.help': 'Used everywhere instead of the entity name (RTS 4(2)(f)). 2 to 40 characters.',
  'new.profile': 'Your role',
  'new.entity': 'Real entity name (optional)',
  'new.entity.help': 'Stored encrypted, never in the file name.',
  'new.passphrase.help': 'At least 14 characters. A phrase of 5 or more words is ideal.',
  'new.passphrase2': 'Confirm passphrase',
  'new.mismatch': 'The two passphrases differ.',
  'new.norecovery': 'I understand: without the passphrase the file is permanently unreadable. There is no recovery.',
  'new.submit': 'Create exercise',
  'open.title': 'Open an exercise',
  'open.choose': 'Choose a .tlpt file',
  'open.chosen': 'File: {name}',
  'open.submit': 'Open',
  'busy.derive': 'Deriving key (Argon2id)… a few seconds on some computers.',
  'busy.save': 'Encrypting and saving…',
  'ex.profile': 'Role',
  'ex.author': 'Session',
  'ex.version': 'File version',
  'ex.save': 'Save',
  'ex.saved': 'Saved (version {v}).',
  'ex.downloaded': 'File downloaded (version {v}). Replace the previous file with this one.',
  'ex.unsaved': 'Unsaved changes',
  'ex.lock': 'Lock',
  'ex.lock.confirm': 'There are unsaved changes. Lock anyway and lose them?',
  'ex.integrity.broken': 'Integrity alert: the log is broken at entry {seq}. The file may have been modified outside openTLPT. The anomaly has been recorded.',
  'ex.kdf.upgraded': 'This file used a legacy key derivation (PBKDF2). It will be rewritten with Argon2id on next save.',
  'ex.today': 'Today: {d}',
  'sec.deadlines': 'Regulatory deadlines',
  'sec.deadlines.help': 'Computed from the dates you enter. Sources: DORA Art. 26 and RTS (EU) 2025/1190 — obligations.',
  'sec.events': 'Exercise timeline',
  'sec.events.help': 'Enter dates as the exercise progresses. Every change is logged.',
  'sec.facts': 'Exercise characteristics',
  'sec.facts.help': 'They determine which obligations and deadlines apply.',
  'order.issue': '{event} ({d1}) cannot precede {other} ({d2}).',
  'dl.col.deadline': 'Deadline',
  'dl.col.due': 'Date',
  'dl.col.state': 'Status',
  'dl.col.done': 'Done on',
  'dl.col.carriers': 'Owner',
  'dl.waiting': 'Waiting for: {event}',
  'dl.before': 'Before: {event}',
  'dl.days.left': 'in {n} d',
  'dl.days.late': '{n} d late',
  'dl.days.today': 'today',
  'dl.min.earliest': 'earliest end',
  'dl.min.missing': '{n} d short',
  'dl.periods': '{missing} uncovered period(s) out of {total}',
  'dl.overridden': 'Adjusted deadline: {why}',
  'dl.info': 'information',
  'dl.badge.obligation': 'Obligation',
  'state.not_applicable': 'Not applicable',
  'state.waiting_anchor': 'Waiting',
  'state.upcoming': 'Upcoming',
  'state.due_soon': 'Due soon',
  'state.overdue': 'Overdue',
  'state.done_on_time': 'Done',
  'state.done_late': 'Done late',
  'state.running': 'Running',
  'state.min_met': 'Duration met',
  'state.min_violated': 'Too short',
  'state.recurring_ok': 'Up to date',
  'state.recurring_missing': 'Missing',
  'fact.true': 'Yes',
  'fact.false': 'No',
  'err.generic': 'Error: {msg}',
  'err.decrypt_failed': 'Cannot open the file: wrong passphrase or tampered file.',
  'err.not_tlpt': 'This is not an openTLPT file.',
  'err.unsupported_format': 'This file was created by a newer version of openTLPT.',
  'err.bad_params': 'The file header is invalid.',
  'err.weak_passphrase': 'Passphrase too weak: at least 14 characters.',
  'err.file_conflict': 'The file was modified elsewhere since it was opened. To avoid overwriting it, saving is refused: save under another name.',
  'ex.saveas': 'Save as…',
};

const dicts: Record<'fr' | 'en', Record<MsgKey, string>> = { fr, en };
export type Lang = 'fr' | 'en';

export const i18n = $state<{ lang: Lang }>({ lang: 'fr' });

export function t(key: MsgKey, params: Record<string, string | number> = {}): string {
  return dicts[i18n.lang][key].replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

/** Texte localisé du référentiel ; repli sur l'anglais puis le français (signalé par l'attribut lang côté UI). */
export function loc(text: Localized | undefined): string {
  if (!text) return '';
  return text[i18n.lang] ?? text.en ?? text.fr ?? '';
}

const FACT_VALUES: Record<string, Record<string, Record<Lang, string>>> = {
  testers: {
    external: { fr: 'Externes', en: 'External' },
    internal: { fr: 'Internes', en: 'Internal' },
    mixed: { fr: 'Mixtes (internes + externes)', en: 'Mixed (internal + external)' },
  },
  tlpt_authority: {
    national: { fr: 'Autorité nationale', en: 'National authority' },
    ecb: { fr: 'BCE (MSU)', en: 'ECB (SSM)' },
  },
  national_framework: {
    none: { fr: 'Aucune', en: 'None' },
    'TIBER-FR': { fr: 'TIBER-FR', en: 'TIBER-FR' },
  },
};

/** Libellé d'une valeur de fait énuméré (repli : la valeur brute). */
export function factValueLabel(factId: string, value: string): string {
  return FACT_VALUES[factId]?.[value]?.[i18n.lang] ?? value;
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(i18n.lang === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(`${iso}T00:00:00Z`));
}

export function toggleLang(): void {
  i18n.lang = i18n.lang === 'fr' ? 'en' : 'fr';
  document.documentElement.lang = i18n.lang;
}
