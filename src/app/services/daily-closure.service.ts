import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Phase 4 (WF-3) — Daily-closure service.
 *
 * One row per (admissionId, closureDate). The morning open is created
 * automatically (or on demand by ward staff); the row is locked when
 * the attender signs off on the day.
 */

export type DailyClosureStatus = 'OPEN' | 'CLOSED';

export interface DailyClosure {
  id: string;
  admissionId: string;
  closureDate: string;
  doctorVisitedAt?: string | null;
  doctorVisitedBy?: string | null;
  nursingSummary?: string | null;
  vitalsSummary?: string | null;
  satisfactionScore?: number | null;
  concerns?: string | null;
  negativeFlag: boolean;
  status: DailyClosureStatus;
  attenderName?: string | null;
  attenderRelation?: string | null;
  attenderSignatureId?: string | null;
  closedAt?: string | null;
  closedBy?: string | null;
  admission?: any;
}

export interface OpenClosurePayload {
  admissionId: string;
  closureDate?: string;
  doctorVisitedAt?: string;
  doctorVisitedBy?: string;
  nursingSummary?: string;
  vitalsSummary?: string;
}

export interface SubmitClosurePayload {
  satisfactionScore: number;
  concerns?: string;
  doctorVisitedAt?: string;
  doctorVisitedBy?: string;
  nursingSummary?: string;
  vitalsSummary?: string;
  attenderName: string;
  attenderRelation: string;
  attenderSignatureId: string;
}

@Injectable({ providedIn: 'root' })
export class DailyClosureService {
  private apiUrl = `${environment.apiUrl}/daily-closure`;

  constructor(private http: HttpClient) {}

  list(filters?: { admissionId?: string; date?: string }): Observable<DailyClosure[]> {
    let params = new HttpParams();
    if (filters?.admissionId) params = params.set('admissionId', filters.admissionId);
    if (filters?.date) params = params.set('date', filters.date);
    return this.http.get<DailyClosure[]>(this.apiUrl, { params });
  }

  getById(id: string): Observable<DailyClosure> {
    return this.http.get<DailyClosure>(`${this.apiUrl}/${id}`);
  }

  open(payload: OpenClosurePayload): Observable<DailyClosure> {
    return this.http.post<DailyClosure>(this.apiUrl, payload);
  }

  submit(id: string, payload: SubmitClosurePayload): Observable<DailyClosure> {
    return this.http.post<DailyClosure>(`${this.apiUrl}/${id}/submit`, payload);
  }
}
