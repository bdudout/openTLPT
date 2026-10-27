// Contrôles de cohérence des caractéristiques de l'exercice (revue des parcours, piste 2).
// Ils signalent une combinaison incompatible avec un texte, sans bloquer la saisie : la situation réelle prime,
// l'incohérence est rendue visible et argumentée.
import type { Facts } from './applicability.ts';

export type FactIssueSeverity = 'error' | 'warning';

export interface FactIssue {
  code: string;
  severity: FactIssueSeverity;
  /** Référence du texte qui fonde le contrôle. */
  source: string;
  /** Faits en cause (pour les mettre en évidence dans l'interface). */
  facts: string[];
}

const isInternal = (v: unknown) => v === 'internal' || v === 'mixed';

export function factIssues(f: Facts): FactIssue[] {
  const out: FactIssue[] = [];
  // DORA 26(8) al. 2 : établissements « significant » — testeurs externes uniquement (un test mixte compte comme interne, RTS cons. 27).
  if (f.ssm_significant === true && isInternal(f.testers)) {
    out.push({ code: 'ssm_external_only', severity: 'error', source: 'DORA-26.8.2', facts: ['ssm_significant', 'testers'] });
  }
  // Pour un établissement « significant », l'autorité TLPT est la BCE (guide TIBER-FR, § 2).
  if (f.ssm_significant === true && f.tlpt_authority === 'national') {
    out.push({ code: 'ssm_authority_ecb', severity: 'warning', source: 'TIBER-FR §2', facts: ['ssm_significant', 'tlpt_authority'] });
  }
  // Le guide TIBER-FR ne s'applique pas aux établissements « significant » (autorité TLPT : BCE).
  if (f.national_framework === 'TIBER-FR' && (f.ssm_significant === true || f.tlpt_authority === 'ecb')) {
    out.push({ code: 'tiberfr_not_applicable', severity: 'warning', source: 'TIBER-FR (avertissement juridique)', facts: ['national_framework', 'ssm_significant', 'tlpt_authority'] });
  }
  // DORA 26(4) : le test mutualisé est organisé avec un prestataire TIC tiers.
  if (f.pooled === true && f.ict_tpp_in_scope !== true) {
    out.push({ code: 'pooled_requires_tpp', severity: 'warning', source: 'DORA-26.4', facts: ['pooled', 'ict_tpp_in_scope'] });
  }
  // RTS 1(18) : un TLPT commun est, par définition, distinct d'un TLPT mutualisé.
  if (f.pooled === true && f.joint === true) {
    out.push({ code: 'pooled_and_joint', severity: 'warning', source: 'RTS-1.18', facts: ['pooled', 'joint'] });
  }
  // Flags sur SIIV d'un OIV : règle relayée par TIBER-FR (PASSI LPM), sans objet hors de ce cadre.
  if (f.oiv_siiv_flags === true && f.national_framework !== 'TIBER-FR') {
    out.push({ code: 'siiv_without_tiberfr', severity: 'warning', source: 'TIBER-FR §6.1.2', facts: ['oiv_siiv_flags', 'national_framework'] });
  }
  return out;
}
