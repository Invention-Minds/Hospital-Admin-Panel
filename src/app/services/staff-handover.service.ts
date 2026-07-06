import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Phase 7 — Staff handover / contingency reassignment service.
 *
 * All field names mirror the backend StaffHandover schema columns 1:1
 * (`eventType`, `shift`, `originatorSignatureId`, `receiverSignatureId`,
 * `supervisorSignatureId`, `patientsAffected`, `pendingTasks`, etc.).
 */

export type StaffHandoverEventType =
  | 'PLANNED_SHIFT'
  | 'UNPLANNED_ABSENCE'
  | 'RATIO_BREACH'
  | 'DOCTOR_UNAVAILABLE';

export type StaffHandoverShift = 'morning' | 'evening' | 'night' | 'adhoc';

export type StaffHandoverStatus = 'OPEN' | 'ACKNOWLEDGED' | 'CLOSED' | 'DECLINED';

export interface PatientsAffectedItem {
  admissionId: string;
  prn?: string;
  summary?: string;
}

export interface StaffHandover {
  id: string;
  eventType: StaffHandoverEventType;
  shift: StaffHandoverShift;
  department?: string | null;
  wardId?: string | null;
  status: StaffHandoverStatus;

  raisedAt: string;
  originatorName: string;
  originatorRole?: string | null;
  originatorBy?: string | null;
  originatorById?: number | null;
  originatorSignatureId?: string | null;

  acknowledgedAt?: string | null;
  receiverName?: string | null;
  receiverRole?: string | null;
  receiverBy?: string | null;
  receiverById?: number | null;
  receiverSignatureId?: string | null;

  supervisorName?: string | null;
  supervisorBy?: string | null;
  supervisorById?: number | null;
  supervisorSignatureId?: string | null;

  rationale: string;
  patientsAffected?: string | null; // JSON string of PatientsAffectedItem[]
  pendingTasks?: string | null;
  declineReason?: string | null;

  closedAt?: string | null;
  closedBy?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateHandoverPayload {
  eventType: StaffHandoverEventType;
  shift: StaffHandoverShift;
  department?: string;
  wardId?: string;
  originatorName: string;
  originatorRole?: string;
  originatorSignatureId?: string;
  rationale: string;
  patientsAffected?: PatientsAffectedItem[];
  pendingTasks?: string;
}

export interface AcknowledgeHandoverPayload {
  receiverName: string;
  receiverRole?: string;
  receiverSignatureId: string;
}

export interface DeclineHandoverPayload {
  receiverName: string;
  receiverRole?: string;
  declineReason: string;
}

export interface SupervisorSignPayload {
  supervisorName: string;
  supervisorSignatureId: string;
}

@Injectable({ providedIn: 'root' })
export class StaffHandoverService {
  private apiUrl = `${environment.apiUrl}/staff-handover`;

  constructor(private http: HttpClient) {}

  list(filters?: {
    status?: StaffHandoverStatus;
    eventType?: StaffHandoverEventType;
    wardId?: string;
  }): Observable<StaffHandover[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.eventType) params = params.set('eventType', filters.eventType);
    if (filters?.wardId) params = params.set('wardId', filters.wardId);
    return this.http.get<StaffHandover[]>(this.apiUrl, { params });
  }

  getById(id: string): Observable<StaffHandover> {
    return this.http.get<StaffHandover>(`${this.apiUrl}/${id}`);
  }

  create(payload: CreateHandoverPayload): Observable<StaffHandover> {
    return this.http.post<StaffHandover>(this.apiUrl, payload);
  }

  acknowledge(id: string, payload: AcknowledgeHandoverPayload): Observable<StaffHandover> {
    return this.http.post<StaffHandover>(`${this.apiUrl}/${id}/acknowledge`, payload);
  }

  decline(id: string, payload: DeclineHandoverPayload): Observable<StaffHandover> {
    return this.http.post<StaffHandover>(`${this.apiUrl}/${id}/decline`, payload);
  }

  supervisorSign(id: string, payload: SupervisorSignPayload): Observable<StaffHandover> {
    return this.http.post<StaffHandover>(`${this.apiUrl}/${id}/supervisor-sign`, payload);
  }

  close(id: string): Observable<StaffHandover> {
    return this.http.post<StaffHandover>(`${this.apiUrl}/${id}/close`, {});
  }

  /** Helper for templates — parse the JSON column safely. */
  parsePatients(row: StaffHandover): PatientsAffectedItem[] {
    if (!row.patientsAffected) return [];
    try {
      const arr = JSON.parse(row.patientsAffected);
      return Array.isArray(arr) ? (arr as PatientsAffectedItem[]) : [];
    } catch {
      return [];
    }
  }
}
