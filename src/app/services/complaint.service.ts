import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.25 / Phase 4 — Patient complaint workflow API.

export type ComplaintStatus = 'open' | 'acknowledged' | 'resolved' | 'escalated';
export type ComplaintSeverity = 'low' | 'medium' | 'high';
export type ComplaintChannel = 'sms' | 'whatsapp' | 'kiosk' | 'phone' | 'in-person' | 'survey-auto';

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
  assignedTo: string | null;
  status: ComplaintStatus;
  resolutionNotes: string | null;
  slaDueAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  // Phase 6 / Option A — cross-module link columns.
  appointmentId?: number | null;
  admissionId?: string | null;
  emergencyId?: number | null;
  relatedIncidentIds?: string | null;
  // Resolved by GET /complaints/:id.
  relatedIncidents?: Array<{ id: string; code: string; category: string; severity: string; status: string }>;
}

export interface ComplaintStats {
  byStatus: Record<string, number>;
  activeBySeverity: Record<string, number>;
  slaBreached: number;
}

@Injectable({ providedIn: 'root' })
export class ComplaintService {
  private base = `${environment.apiUrl}/complaints`;
  constructor(private http: HttpClient) {}

  list(filters?: { status?: string; severity?: string; source?: string; patientPrn?: string }): Observable<{ data: Complaint[] }> {
    let params = new HttpParams();
    if (filters) for (const [k, v] of Object.entries(filters)) if (v) params = params.set(k, v);
    return this.http.get<{ data: Complaint[] }>(this.base, { params });
  }
  stats(): Observable<ComplaintStats> { return this.http.get<ComplaintStats>(`${this.base}/stats`); }
  get(id: string): Observable<{ data: Complaint }> { return this.http.get<{ data: Complaint }>(`${this.base}/${id}`); }
  create(body: {
    patientPrn?: string | null; patientName?: string | null;
    channel: ComplaintChannel; description: string; severity: ComplaintSeverity;
    appointmentId?: number | null; admissionId?: string | null; emergencyId?: number | null;
    proceedDespiteDuplicate?: boolean;
  }): Observable<{ data: Complaint }> {
    return this.http.post<{ data: Complaint }>(this.base, body);
  }
  updateStatus(id: string, body: { status: ComplaintStatus; assignedTo?: string | null; assignedToId?: number | null; resolutionNotes?: string | null }): Observable<{ data: Complaint }> {
    return this.http.put<{ data: Complaint }>(`${this.base}/${id}/status`, body);
  }
  // Phase 6h — bulk status change from the grievance inbox.
  bulkUpdateStatus(ids: string[], status: ComplaintStatus, resolutionNotes?: string | null):
    Observable<{ data: { requested: number; updated: number; skipped: number } }> {
    return this.http.put<{ data: { requested: number; updated: number; skipped: number } }>(
      `${this.base}/bulk-status`, { ids, status, resolutionNotes });
  }
}
