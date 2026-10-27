// Annuaire des parties prenantes et évaluation des prestataires TI / RT (DORA 27, RTS 7), revue des parcours piste 6.
// La grille est tirée du référentiel : obligations du thème « prestataires » à remplir avant contrat par le TIP ou les RTT.
// Comme les registres, les contrôles signalent ; ils n'empêchent jamais la saisie.
import type { ISODate } from './types.ts';

export type ProviderCheckStatus = 'open' | 'compliant' | 'non_compliant' | 'derogation';

export interface PartyRecord {
  id: number;
  actor_ref: string;
  organisation: string | null;
  person: string | null;
  contact: string | null;
  active: boolean;
}

export interface ProviderCheckRecord {
  party_id: number;
  item_ref: string;
  status: ProviderCheckStatus;
  evidence_sha256: string | null;
  evidence_label: string | null;
  note: string | null;
}

export interface CriterionDef { id: string; theme?: string | null; phase: string; carriers: string[] }

/** Acteurs évalués : prestataire de threat intelligence et testeurs red team. */
export const EVALUATED_ACTORS = ['TIP', 'RTT'] as const;

/** Critères applicables à un prestataire selon son rôle (TIP ou RTT). */
export function criteriaFor(items: CriterionDef[], actor: string): CriterionDef[] {
  return items.filter((i) => i.theme === 'th_providers' && i.phase === 'preparation' && i.carriers.includes(actor));
}

export interface ProviderEvaluation {
  party: PartyRecord;
  rows: { criterion: CriterionDef; check?: ProviderCheckRecord }[];
  counts: Record<ProviderCheckStatus, number>;
  /** Tous les critères conformes ou en dérogation motivée. */
  ready: boolean;
  issues: { code: string; source: string; item?: string }[];
}

export function evaluateProviders(
  items: CriterionDef[], parties: PartyRecord[], checks: ProviderCheckRecord[], contractedOn?: ISODate,
): ProviderEvaluation[] {
  return parties
    .filter((p) => p.active && (EVALUATED_ACTORS as readonly string[]).includes(p.actor_ref))
    .map((party) => {
      const rows = criteriaFor(items, party.actor_ref).map((criterion) => {
        const check = checks.find((c) => c.party_id === party.id && c.item_ref === criterion.id);
        return { criterion, ...(check ? { check } : {}) };
      });
      const counts: Record<ProviderCheckStatus, number> = { open: 0, compliant: 0, non_compliant: 0, derogation: 0 };
      const issues: ProviderEvaluation['issues'] = [];
      for (const r of rows) {
        const st = r.check?.status ?? 'open';
        counts[st]++;
        if (st === 'derogation' && !r.check?.note?.trim()) issues.push({ code: 'provider_derogation_unjustified', source: 'RTS-7.2', item: r.criterion.id });
        if (st === 'compliant' && !r.check?.evidence_sha256 && !r.check?.evidence_label?.trim()) issues.push({ code: 'provider_no_evidence', source: 'RTS-7.2', item: r.criterion.id });
      }
      const ready = rows.length > 0 && counts.open === 0 && counts.non_compliant === 0
        && !issues.some((i) => i.code === 'provider_derogation_unjustified');
      if (contractedOn && !ready) issues.unshift({ code: 'provider_contracted_not_ready', source: 'RTS-9.11' });
      return { party, rows, counts, ready, issues };
    });
}
