import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.25 / Phase 4 — Patient complaint workflow API.

export type ComplaintStatus = 'open' | 'acknowledged' | 'resolved' | 'escalated';
export type ComplaintSeverity = 'low' | 'medium' | 'high';
export type ComplaintChannel = 'sms' | 'whatsapp' | 'kiosk' | 'phone' | 'in-person' | 'survey-auto';

// Mirrors ALLOWED_TRANSITIONS in the backend complaint.controller. resolved → acknowledged is a reopen.
export const COMPLAINT_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  open: ['acknowledged', 'escalated'],
  acknowledged: ['resolved', 'escalated'],
  escalated: ['acknowledged', 'resolved'],
  resolved: ['acknowledged'],
};

export interface Complaint {
  id: string;
  code: string;
  patientPrn: string | null;
  patientName: string | null;
  raisedAt: string;
  channel: ComplaintChannel;
  source: 'survey' | 'manual';
  feedbackSurveyId: string | null;
  description: string;
  severity: ComplaintSeverity;
  department?: string | null;
  raisedById?: number | null;
  assignedTo: string | null;
  assignedToId?: number | null;
  status: ComplaintStatus;
  resolutionNotes: string | null;
  slaDueAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  escalatedAt?: string | null;
  // Phase 6 / Option A — cross-module link columns.
  appointmentId?: number | null;
  admissionId?: string | null;
  emergencyId?: number | null;
  relatedIncidentIds?: string | null;
  // Resolved by GET /complaints/:id.
  relatedIncidents?: Array<{ id: string; code: string; category: string; severity: string; status: string }>;
  raisedByName?: string | null;
}

export interface ComplaintStats {
  byStatus: Record<string, number>;
  activeBySeverity: Record<string, number>;
  slaBreached: number;
}

export interface ComplaintListFilters {
  status?: string; severity?: string; source?: string; patientPrn?: string; department?: string;
  from?: string; to?: string; mine?: boolean; take?: number; skip?: number;
}

export interface ComplaintCreateBody {
  patientPrn?: string | null; patientName?: string | null;
  channel: ComplaintChannel; description: string; severity: ComplaintSeverity;
  department?: string | null;
  appointmentId?: number | null; admissionId?: string | null; emergencyId?: number | null;
  proceedDespiteDuplicate?: boolean;
}

/** 409 body when the raise matches open complaints on the same patient / encounter. */
export interface ComplaintDuplicate { id: string; code: string; status: string; raisedAt: string }

export interface BulkStatusResult {
  requested: number; updated: number; skipped: number;
  skippedRows?: Array<{ id: string; code?: string; reason: string }>;
}

@Injectable({ providedIn: 'root' })
export class ComplaintService {
  private base = `${environment.apiUrl}/complaints`;
  constructor(private http: HttpClient) {}

  list(filters?: ComplaintListFilters): Observable<{ data: Complaint[]; total: number; take: number; skip: number }> {
    let params = new HttpParams();
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        if (v === undefined || v === null || v === '' || v === false) continue;
        params = params.set(k, String(v));
      }
    }
    return this.http.get<{ data: Complaint[]; total: number; take: number; skip: number }>(this.base, { params });
  }
  stats(): Observable<ComplaintStats> { return this.http.get<ComplaintStats>(`${this.base}/stats`); }
  get(id: string): Observable<{ data: Complaint }> { return this.http.get<{ data: Complaint }>(`${this.base}/${id}`); }
  create(body: ComplaintCreateBody): Observable<{ data: Complaint }> {
    return this.http.post<{ data: Complaint }>(this.base, body);
  }
  updateStatus(id: string, body: {
    status: ComplaintStatus; assignedTo?: string | null; assignedToId?: number | null;
    resolutionNotes?: string | null; department?: string | null;
  }): Observable<{ data: Complaint }> {
    return this.http.put<{ data: Complaint }>(`${this.base}/${id}/status`, body);
  }
  // Phase 6h — bulk status change from the grievance inbox.
  bulkUpdateStatus(ids: string[], status: ComplaintStatus, resolutionNotes?: string | null): Observable<{ data: BulkStatusResult }> {
    return this.http.put<{ data: BulkStatusResult }>(`${this.base}/bulk-status`, { ids, status, resolutionNotes });
  }
}
