import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase D — Discharge clearance chain API client.

export type DischargeDepartment =
  | 'OT' | 'BILLING' | 'NURSING' | 'PHARMACY' | 'LAB_RAD' | 'DIET' | 'MLC';
export type ClearanceStatus = 'pending' | 'cleared' | 'rejected';

export const DISCHARGE_DEPARTMENTS: DischargeDepartment[] =
  ['OT', 'BILLING', 'NURSING', 'PHARMACY', 'LAB_RAD', 'DIET', 'MLC'];

export interface DischargeClearance {
  id: string;
  admissionId: string;
  department: DischargeDepartment;
  status: ClearanceStatus;
  blockingReason: string | null;
  clearedAt: string | null;
  clearedBy: string | null;
  clearedNotes: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  createdAt: string;
}

export interface DischargeGate {
  eligible: boolean;
  blockers: string[];
  clearances: Array<{ department: string; status: string; blockingReason: string | null }>;
}

export interface ClearanceListResponse {
  gate: DischargeGate;
  rows: DischargeClearance[];
}

export interface QueueRow {
  id: string;
  admissionId: string;
  department: DischargeDepartment;
  status: ClearanceStatus;
  blockingReason: string | null;
  createdAt: string;
  admission: {
    id: string; admissionNo: string; prn: string;
    admittingDoctor: string | null; department: string;
    ward?: { wardName: string } | null;
    bed?: { bedNumber: string } | null;
    dischargeReadyAt: string | null;
    discharge?: { summaryStatus: string; clinicianSignedAt: string | null } | null;
  };
}

export interface MtQueueRow {
  id: string; admissionNo: string; prn: string;
  admittingDoctor: string | null; department: string;
  ward?: { wardName: string } | null;
  bed?: { bedNumber: string } | null;
  dischargeReadyAt: string;
  discharge?: { summaryStatus: string; mtAcknowledgedAt: string | null; clinicianSignedAt: string | null } | null;
}

@Injectable({ providedIn: 'root' })
export class DischargeClearanceService {
  private base = `${environment.apiUrl}/ipd`;
  constructor(private http: HttpClient) {}

  // Ward doctor flips "ready for discharge".
  setReady(admissionId: string, ready = true): Observable<{ data: { admissionId: string; dischargeReadyAt: string | null } }> {
    return this.http.post<{ data: { admissionId: string; dischargeReadyAt: string | null } }>(
      `${this.base}/admission/${admissionId}/discharge/ready`, { ready });
  }

  // MT claims a case off the queue.
  mtAck(admissionId: string): Observable<{ data: { admissionId: string; mtAcknowledgedAt: string } }> {
    return this.http.post<{ data: { admissionId: string; mtAcknowledgedAt: string } }>(
      `${this.base}/admission/${admissionId}/discharge/mt-ack`, {});
  }

  list(admissionId: string): Observable<{ data: ClearanceListResponse }> {
    return this.http.get<{ data: ClearanceListResponse }>(
      `${this.base}/admission/${admissionId}/discharge/clearances`);
  }

  clear(admissionId: string, dept: DischargeDepartment, body: { notes?: string; signatureId?: string }):
    Observable<{ data: DischargeClearance; gate: DischargeGate }> {
    return this.http.post<{ data: DischargeClearance; gate: DischargeGate }>(
      `${this.base}/admission/${admissionId}/discharge/clearances/${dept}/clear`, body);
  }

  reject(admissionId: string, dept: DischargeDepartment, reason: string):
    Observable<{ data: DischargeClearance }> {
    return this.http.post<{ data: DischargeClearance }>(
      `${this.base}/admission/${admissionId}/discharge/clearances/${dept}/reject`, { reason });
  }

  finalize(admissionId: string): Observable<{ data: { admissionId: string; status: string } }> {
    return this.http.post<{ data: { admissionId: string; status: string } }>(
      `${this.base}/admission/${admissionId}/discharge/finalize`, {});
  }

  abandon(admissionId: string, reason: string): Observable<{ data: { admissionId: string; abandoned: boolean } }> {
    return this.http.post<{ data: { admissionId: string; abandoned: boolean } }>(
      `${this.base}/admission/${admissionId}/discharge/abandon`, { reason });
  }

  departmentQueue(dept: DischargeDepartment): Observable<{ data: QueueRow[] }> {
    return this.http.get<{ data: QueueRow[] }>(`${this.base}/discharge-queue/${dept}`);
  }

  mtQueue(): Observable<{ data: MtQueueRow[] }> {
    return this.http.get<{ data: MtQueueRow[] }>(`${this.base}/mt-queue`);
  }
}
