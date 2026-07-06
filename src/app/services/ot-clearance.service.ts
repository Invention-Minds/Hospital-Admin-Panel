import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.1c — OT Clearance (UHJ/IPS/F-32) service.

export type OtClearanceStatus = 'pending' | 'cleared' | 'rejected';

export interface OtClearance {
  id: string;
  scheduleId: string;
  paymentMode: 'cash' | 'insurance' | 'corporate' | 'other' | null;
  billingNotes: string | null;
  clearanceStatus: OtClearanceStatus;
  clearedBy: string | null;
  clearedById: number | null;
  clearedAt: string | null;
  clearedSignatureId: string | null;
  remarks: string | null;
  bypassReason: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class OtClearanceService {
  constructor(private http: HttpClient) {}

  private base(scheduleId: string) {
    return `${environment.apiUrl}/ot/schedules/${scheduleId}/clearance`;
  }

  get(scheduleId: string): Observable<{ data: OtClearance | null }> {
    return this.http.get<{ data: OtClearance | null }>(this.base(scheduleId));
  }

  upsert(scheduleId: string, body: { paymentMode?: string; billingNotes?: string; remarks?: string }): Observable<{ data: OtClearance }> {
    return this.http.put<{ data: OtClearance }>(this.base(scheduleId), body);
  }

  clear(scheduleId: string, body: { signatureId?: string; clearedBy?: string }): Observable<{ data: OtClearance }> {
    return this.http.post<{ data: OtClearance }>(`${this.base(scheduleId)}/clear`, body);
  }

  reject(scheduleId: string, reason: string): Observable<{ data: OtClearance }> {
    return this.http.post<{ data: OtClearance }>(`${this.base(scheduleId)}/reject`, { reason });
  }
  /** Phase 9.3d — undo cleared/rejected → pending */
  reset(scheduleId: string, reason?: string): Observable<{ data: OtClearance }> {
    return this.http.post<{ data: OtClearance }>(`${this.base(scheduleId)}/reset`, { reason });
  }
}
