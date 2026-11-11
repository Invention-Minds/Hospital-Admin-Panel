import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';
import { isIncidentManager as qualityIsIncidentManager } from '../quality/quality-access';

// Phase 9.24 — incident reporting (Phase 1: manual raise + inbox).

export type IncidentStatus = 'open' | 'triaged' | 'investigated' | 'capa_in_progress' | 'closed' | 'cancelled';
export type IncidentSeverity = 'near_miss' | 'minor' | 'moderate' | 'major' | 'sentinel';
export type IncidentCategory =
  | 'clinical' | 'medication' | 'documentation' | 'fall' | 'infection'
  | 'equipment' | 'behavioural' | 'security' | 'other';

export interface Incident {
  id: string;
  code: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  source: 'auto-rule' | 'manual' | 'anonymous';
  ruleKey: string | null;
  title: string;
  description: string;
  patientPrn: string | null;
  patientName: string | null;
  admissionId: string | null;
  admissionNo: string | null;        // Phase 6 — human-readable, attached by getIncident
  emergencyId: number | null;
  appointmentId: number | null;
  ward: string | null;
  department: string | null;
  occurredAt: string | null;
  reportedAt: string;
  reportedBy: string | null;
  reportedById?: number | null;
  status: IncidentStatus;
  severityFinal: string | null;
  nabhClause: string | null;
  qiCode: string | null;          // Phase 5c — QI indicator tag
  evidenceLinks: string | null;
  assignedTo: string | null;
  assignedToId?: number | null;
  closedAt: string | null;
  closedBy: string | null;
  closureNotes: string | null;
  capa?: IncidentCapa | null;   // included by GET /incidents/:id
  // Phase 6 / Option A — cross-module links.
  feedbackSurveyId?: string | null;
  complaintId?: string | null;
  relatedIncidentIds?: string | null; // JSON-stringified string[] from backend
  // Resolved by GET /incidents/:id so the UI can render chips directly.
  relatedIncidents?: Array<{ id: string; code: string; category: string; severity: string; status: string }>;
  complaint?: { id: string; code: string; status: string; severity: string } | null;
  feedbackSurvey?: { id: string; template: string; npsScore: number | null; respondedAt: string | null } | null;
  // Quality escalation matrix.
  unitId?: number | null;
  escalationLevel?: number;
  escalationStartAt?: string | null;
  lastEscalatedAt?: string | null;
  // Resolved by GET /incidents/:id.
  unit?: CaseUnit | null;
  permissions?: {
    canTriage: boolean; canEditCapa: boolean; canClose: boolean; canChangeUnit: boolean; canTagQi: boolean;
    canReviewEffectiveness: boolean;
  };
  escalations?: EscalationEvent[];
  // Phase 2 — harm-based severity + tracked CAPA.
  harmLevel?: HarmLevel | null;
  harmLevelFinal?: HarmLevel | null;
  capaActions?: CapaAction[];
  effectivenessReviews?: EffectivenessReview[];
  // Phase 3
  subCategory?: string | null;
  anonymous?: boolean;
  participants?: Array<{ userId: number; name: string; addedBy: string | null; createdAt: string }>;
}

export interface IncidentTaxonomyCategory { category: IncidentCategory; label: string; subtypes: Array<{ key: string; label: string }> }

export type HarmLevel = 'not_reached' | 'none' | 'mild' | 'moderate' | 'severe' | 'permanent_or_death';

/** Reached-patient harm options (not_reached is the "did it reach the patient? — no" answer). */
export const HARM_OPTIONS: Array<{ value: Exclude<HarmLevel, 'not_reached'>; label: string; hint: string }> = [
  { value: 'none', label: 'No harm', hint: 'Reached the patient, no harm caused' },
  { value: 'mild', label: 'Mild harm', hint: 'Minimal or short-term harm, little or no treatment needed' },
  { value: 'moderate', label: 'Moderate harm', hint: 'Needed extra treatment or monitoring, or a longer stay' },
  { value: 'severe', label: 'Severe harm', hint: 'Major intervention or significant lasting harm' },
  { value: 'permanent_or_death', label: 'Permanent harm or death', hint: 'Permanent disability, or contributed to death' },
];

export const HARM_LABELS: Record<HarmLevel, string> = {
  not_reached: 'Did not reach the patient',
  none: 'No harm', mild: 'Mild harm', moderate: 'Moderate harm', severe: 'Severe harm',
  permanent_or_death: 'Permanent harm or death',
};

/** Mirrors backend severityFromHarm. */
export const HARM_TO_SEVERITY: Record<HarmLevel, IncidentSeverity> = {
  not_reached: 'near_miss', none: 'minor', mild: 'minor', moderate: 'moderate', severe: 'major', permanent_or_death: 'sentinel',
};

export type CapaActionKind = 'corrective' | 'preventive';
export type CapaActionStatus = 'open' | 'done' | 'dropped';

export interface CapaAction {
  id: string;
  incidentId: string;
  kind: CapaActionKind;
  description: string;
  owner: string | null;
  ownerId: number | null;
  dueDate: string | null;
  status: CapaActionStatus;
  completedAt: string | null;
  completedBy: string | null;
  completionNote: string | null;
  createdBy: string | null;
  createdAt: string;
  canComplete?: boolean; // set by GET /incidents/:id
}

export type EffectivenessOutcome = 'effective' | 'partial' | 'not_effective';

export interface EffectivenessReview {
  id: string;
  incidentId: string;
  dayOffset: number;
  dueAt: string;
  status: 'pending' | 'done' | 'cancelled';
  outcome: EffectivenessOutcome | null;
  notes: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface CaseUnit { id: number; name: string; type: string; hodName: string | null; deputyName: string | null }
export interface EscalationEvent { at: string; level: number; label: string | null; targets: string; recipients: number }

export interface IncidentCapa {
  id: string;
  incidentId: string;
  immediateActions: string | null;
  why1: string | null; why2: string | null; why3: string | null;
  why4: string | null; why5: string | null;
  rootCause: string | null;
  correctiveActions: string | null;
  preventiveActions: string | null;
  owner: string | null;
  ownerId: number | null;
  dueDate: string | null;
  completedAt: string | null;
  effectivenessReview: string | null;
  effectivenessReviewAt: string | null;
}

export interface CapaPayload {
  immediateActions?: string | null;
  why1?: string | null; why2?: string | null; why3?: string | null;
  why4?: string | null; why5?: string | null;
  rootCause?: string | null;
  correctiveActions?: string | null;
  preventiveActions?: string | null;
  owner?: string | null;
  ownerId?: number | null;
  dueDate?: string | null;
  completedAt?: string | null;
  effectivenessReview?: string | null;
  effectivenessReviewAt?: string | null;
}

export interface IncidentStats {
  byStatus: Record<string, number>;
  activeBySeverity: Record<string, number>;
}

export interface CreateIncidentPayload {
  category: IncidentCategory;
  harmLevel?: HarmLevel;           // preferred — the server derives severity from it
  severity?: IncidentSeverity;
  subCategory?: string | null;
  anonymous?: boolean;             // reporter's name is not stored
  title: string;
  description: string;
  patientPrn?: string | null;
  patientName?: string | null;
  admissionId?: string | null;
  emergencyId?: number | null;
  appointmentId?: number | null;
  ward?: string | null;
  department?: string | null;
  occurredAt?: string | null;
  nabhClause?: string | null;
  qiCode?: string | null;          // Phase 5c — optional QI tag at raise time
  unitId?: number | null;          // HospitalUnit — blank = auto from ward / department
  evidenceLinks?: Array<{ label: string; url: string }>;
}

// Mirrors backend ALLOWED_TRANSITIONS (closed → investigated / cancelled → open are reopens).
export const INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open: ['triaged', 'cancelled'],
  triaged: ['investigated', 'cancelled', 'open'],
  investigated: ['capa_in_progress', 'closed', 'triaged'],
  capa_in_progress: ['closed', 'investigated'],
  closed: ['investigated'],
  cancelled: ['open'],
};

/**
 * Mirrors backend isIncidentManager (super_admin, or admin + adminType
 * 'Quality Manager') — UI gating only; the API enforces it.
 */
export function isIncidentManager(): boolean {
  return qualityIsIncidentManager();
}

@Injectable({ providedIn: 'root' })
export class IncidentService {
  private base = `${environment.apiUrl}/incidents`;
  constructor(private http: HttpClient) {}

  create(payload: CreateIncidentPayload): Observable<{ data: Incident }> {
    return this.http.post<{ data: Incident }>(this.base, payload);
  }
  list(filters?: { status?: string; severity?: string; category?: string; source?: string; patientPrn?: string; from?: string; to?: string; nabhClause?: string; qiCode?: string; mine?: boolean; assignedToId?: number; unitId?: number | string }): Observable<{ data: Incident[] }> {
    let params = new HttpParams();
    if (filters) for (const [k, v] of Object.entries(filters)) if (v) params = params.set(k, v);
    return this.http.get<{ data: Incident[] }>(this.base, { params });
  }
  get(id: string): Observable<{ data: Incident }> {
    return this.http.get<{ data: Incident }>(`${this.base}/${id}`);
  }
  taxonomy(): Observable<{ data: IncidentTaxonomyCategory[] }> {
    return this.http.get<{ data: IncidentTaxonomyCategory[] }>(`${this.base}/taxonomy`);
  }
  publicUnits(): Observable<{ data: Array<{ id: number; name: string }> }> {
    return this.http.get<{ data: Array<{ id: number; name: string }> }>(`${this.base}/public/units`);
  }
  /** Anonymous report from the public QR page (no login). */
  publicReport(body: {
    category: string; subCategory?: string | null; harmLevel?: HarmLevel | null; description: string;
    location?: string | null; unitId?: number | null; occurredAt?: string | null; website?: string;
  }): Observable<{ data: { code: string } }> {
    return this.http.post<{ data: { code: string } }>(`${this.base}/public`, body);
  }
  addParticipant(id: string, userId: number): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/participants`, { userId });
  }
  removeParticipant(id: string, userId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}/participants/${userId}`);
  }
  updateStatus(id: string, body: { status: IncidentStatus; severityFinal?: string | null; harmLevelFinal?: HarmLevel | null; subCategory?: string | null; assignedTo?: string | null; assignedToId?: number | null; closureNotes?: string | null; unitId?: number | null }): Observable<{ data: Incident }> {
    return this.http.put<{ data: Incident }>(`${this.base}/${id}/status`, body);
  }
  addCapaAction(id: string, body: { kind: CapaActionKind; description: string; ownerId?: number | null; dueDate?: string | null }): Observable<{ data: CapaAction }> {
    return this.http.post<{ data: CapaAction }>(`${this.base}/${id}/capa/actions`, body);
  }
  updateCapaAction(id: string, actionId: string, body: Partial<{ kind: CapaActionKind; description: string; ownerId: number | null; dueDate: string | null; status: CapaActionStatus; completionNote: string | null }>): Observable<{ data: CapaAction }> {
    return this.http.put<{ data: CapaAction }>(`${this.base}/${id}/capa/actions/${actionId}`, body);
  }
  recordEffectiveness(id: string, reviewId: string, body: { outcome: EffectivenessOutcome; notes?: string | null }): Observable<{ data: EffectivenessReview; reopened: boolean }> {
    return this.http.post<{ data: EffectivenessReview; reopened: boolean }>(`${this.base}/${id}/effectiveness-reviews/${reviewId}`, body);
  }
  stats(): Observable<IncidentStats> {
    return this.http.get<IncidentStats>(`${this.base}/stats`);
  }
  upsertCapa(id: string, payload: CapaPayload): Observable<{ data: IncidentCapa }> {
    return this.http.put<{ data: IncidentCapa }>(`${this.base}/${id}/capa`, payload);
  }
  // Phase 5c — retag the incident with a QI indicator code (or clear with null).
  tagQi(id: string, qiCode: string | null): Observable<{ data: { id: string; code: string; qiCode: string | null } }> {
    return this.http.patch<{ data: { id: string; code: string; qiCode: string | null } }>(
      `${this.base}/${id}/qi-tag`, { qiCode });
  }
  // Phase 6f — upload an evidence file (label defaults to filename if blank).
  uploadEvidence(id: string, file: File, label?: string):
    Observable<{ data: { id: string; evidenceLinks: Array<{ label: string; url: string; uploadedBy?: string | null; uploadedAt?: string }>; newLink: { label: string; url: string } } }> {
    const fd = new FormData();
    fd.append('file', file);
    if (label) fd.append('label', label);
    return this.http.post<{ data: { id: string; evidenceLinks: Array<{ label: string; url: string; uploadedBy?: string | null; uploadedAt?: string }>; newLink: { label: string; url: string } } }>(
      `${this.base}/${id}/evidence`, fd);
  }
}
