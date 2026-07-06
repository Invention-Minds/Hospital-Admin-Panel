import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

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
  source: 'auto-rule' | 'manual';
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
  status: IncidentStatus;
  severityFinal: string | null;
  nabhClause: string | null;
  qiCode: string | null;          // Phase 5c — QI indicator tag
  evidenceLinks: string | null;
  assignedTo: string | null;
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
}

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
  severity: IncidentSeverity;
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
  evidenceLinks?: Array<{ label: string; url: string }>;
}

@Injectable({ providedIn: 'root' })
export class IncidentService {
  private base = `${environment.apiUrl}/incidents`;
  constructor(private http: HttpClient) {}

  create(payload: CreateIncidentPayload): Observable<{ data: Incident }> {
    return this.http.post<{ data: Incident }>(this.base, payload);
  }
  list(filters?: { status?: string; severity?: string; category?: string; source?: string; patientPrn?: string; from?: string; to?: string; nabhClause?: string; qiCode?: string; mine?: boolean; assignedToId?: number }): Observable<{ data: Incident[] }> {
    let params = new HttpParams();
    if (filters) for (const [k, v] of Object.entries(filters)) if (v) params = params.set(k, v);
    return this.http.get<{ data: Incident[] }>(this.base, { params });
  }
  get(id: string): Observable<{ data: Incident }> {
    return this.http.get<{ data: Incident }>(`${this.base}/${id}`);
  }
  updateStatus(id: string, body: { status: IncidentStatus; severityFinal?: string | null; assignedTo?: string | null; assignedToId?: number | null; closureNotes?: string | null }): Observable<{ data: Incident }> {
    return this.http.put<{ data: Incident }>(`${this.base}/${id}/status`, body);
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
