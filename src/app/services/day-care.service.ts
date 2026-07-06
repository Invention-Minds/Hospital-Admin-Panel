import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Day-Care Monitoring service (Phase 5 — NABH COP.6).
 *
 * For outpatient day-procedure sessions (dialysis, chemo, endoscopy,
 * day-surgery). Session = one visit; readings = per-time-row vitals during
 * the procedure. Doctor sets per-patient alert thresholds at start of
 * session; backend stamps `alertsTriggered` on each reading that breaches.
 */

export type ProcedureType = 'chemo' | 'dialysis' | 'endoscopy' | 'day-surgery' | 'other';
export type DayCareStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'DISCHARGED' | 'CANCELLED';

export interface DayCareReading {
  id: string;
  sessionId: string;
  recordedAt: string;
  spo2: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  hr: number | null;
  rr: number | null;
  tempF: number | null;
  uopMl: number | null;
  ivPatency: 'patent' | 'blocked' | 'na' | null;
  consciousnessLevel: number | null;        // 1..4
  remarks: string | null;
  alertsTriggered: string | null;           // JSON-stringified array, e.g. '["SpO2<92","HR>110"]'
  recordedBy: string | null;
  signatureId: string | null;
}

export interface DayCareSession {
  id: string;
  prn: string | null;
  patientName: string;
  age: number | null;
  gender: string | null;
  dateOfService: string;
  procedureType: ProcedureType | string;
  procedureDetails: string | null;
  allergies: string | null;
  consultantName: string | null;

  spo2Low: number | null;          spo2High: number | null;
  bpSystolicLow: number | null;    bpSystolicHigh: number | null;
  bpDiastolicLow: number | null;   bpDiastolicHigh: number | null;
  hrLow: number | null;            hrHigh: number | null;
  rrLow: number | null;            rrHigh: number | null;
  tempLow: number | null;          tempHigh: number | null;
  uopLow: number | null;           uopHigh: number | null;

  startedAt: string | null;
  completedAt: string | null;
  dischargedAt: string | null;
  status: DayCareStatus;

  readings?: DayCareReading[];
  createdAt: string;
  updatedAt: string;
}

export type DayCareUpsertPayload = Partial<Omit<DayCareSession,
  'id' | 'readings' | 'createdAt' | 'updatedAt'
>>;

export interface DayCareReadingPayload {
  recordedAt?: string;
  spo2?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  hr?: number | null;
  rr?: number | null;
  tempF?: number | null;
  uopMl?: number | null;
  ivPatency?: 'patent' | 'blocked' | 'na' | null;
  consciousnessLevel?: number | null;
  remarks?: string | null;
}

@Injectable({ providedIn: 'root' })
export class DayCareService {
  private base = `${environment.apiUrl}/day-care`;

  constructor(private http: HttpClient) {}

  listSessions(filters: { date?: string; status?: DayCareStatus } = {}): Observable<DayCareSession[]> {
    let params = new HttpParams();
    if (filters.date) params = params.set('date', filters.date);
    if (filters.status) params = params.set('status', filters.status);
    return this.http.get<DayCareSession[]>(`${this.base}/sessions`, { params });
  }

  getSession(id: string): Observable<DayCareSession> {
    return this.http.get<DayCareSession>(`${this.base}/sessions/${id}`);
  }

  createSession(payload: DayCareUpsertPayload): Observable<DayCareSession> {
    return this.http.post<DayCareSession>(`${this.base}/sessions`, payload);
  }
  updateSession(id: string, payload: DayCareUpsertPayload): Observable<DayCareSession> {
    return this.http.put<DayCareSession>(`${this.base}/sessions/${id}`, payload);
  }

  addReading(sessionId: string, payload: DayCareReadingPayload): Observable<DayCareReading> {
    return this.http.post<DayCareReading>(`${this.base}/sessions/${sessionId}/readings`, payload);
  }
  deleteReading(sessionId: string, readingId: string): Observable<unknown> {
    return this.http.delete(`${this.base}/sessions/${sessionId}/readings/${readingId}`);
  }
}
