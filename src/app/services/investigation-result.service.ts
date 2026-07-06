import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.11 — Lab & Radiology results.
//
// Backs the upload (lab/radiology coordinator), patient profile "Reports"
// tab, IPD admission "Reports" tab, and the critical-result banner.

export type ResultDepartment = 'lab' | 'radiology';
export type ResultStatus = 'pending' | 'partial' | 'final';

export interface InvestigationResult {
  id: number;
  orderId: number;
  prn: string;
  testName: string;
  department: ResultDepartment;
  result: string | null;
  unit: string | null;
  referenceRange: string | null;
  findings: string | null;
  impression: string | null;
  criticalFlag: boolean;
  reportUrl: string | null;
  reportedAt: string | null;
  hmisResultId: string | null;
  status: ResultStatus;
  uploadedBy: string | null;
  uploadedById: number | null;
  uploadedAt: string | null;
  acknowledgedBy: string | null;
  acknowledgedById: number | null;
  acknowledgedAt: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  order?: { id: number; doctorId: number; doctorName: string; date: string; remarks?: string };
}

export interface PendingTest {
  name: string;
  dept: ResultDepartment;
}

export interface PendingOrderRow {
  id: number;
  prn: string;
  date: string;
  doctorId: number;
  doctorName: string;
  remarks: string | null;
  labTests: Array<{ id: number; description: string; department: string }>;
  radiologyTests: Array<{ id: number; description: string; department: string }>;
  results: Array<{ id: number; testName: string; department: string; status: string; criticalFlag: boolean; createdAt: string }>;
  pendingTests: PendingTest[];
  isComplete: boolean;
  createdAt: string;
}

export interface UploadResultBody {
  orderId: number;
  testName: string;
  department: ResultDepartment;
  status: ResultStatus;
  result?: string | null;
  unit?: string | null;
  referenceRange?: string | null;
  findings?: string | null;
  impression?: string | null;
  criticalFlag?: boolean;
  reportedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class InvestigationResultService {
  private base = `${environment.apiUrl}/investigation-results`;

  constructor(private http: HttpClient) {}

  // ─── Upload (multipart) ────────────────────────────────────────────

  upload(body: UploadResultBody, file?: File | null): Observable<{ data: InvestigationResult }> {
    const form = new FormData();
    form.set('orderId', String(body.orderId));
    form.set('testName', body.testName);
    form.set('department', body.department);
    form.set('status', body.status);
    if (body.result != null) form.set('result', body.result);
    if (body.unit != null) form.set('unit', body.unit);
    if (body.referenceRange != null) form.set('referenceRange', body.referenceRange);
    if (body.findings != null) form.set('findings', body.findings);
    if (body.impression != null) form.set('impression', body.impression);
    if (body.criticalFlag !== undefined) form.set('criticalFlag', body.criticalFlag ? 'true' : 'false');
    if (body.reportedAt) form.set('reportedAt', body.reportedAt);
    if (file) form.set('file', file, file.name);
    return this.http.post<{ data: InvestigationResult }>(this.base, form);
  }

  update(id: number, body: Partial<UploadResultBody>, file?: File | null): Observable<{ data: InvestigationResult }> {
    const form = new FormData();
    if (body.testName !== undefined) form.set('testName', body.testName);
    if (body.department !== undefined) form.set('department', body.department);
    if (body.status !== undefined) form.set('status', body.status);
    if (body.result !== undefined) form.set('result', body.result ?? '');
    if (body.unit !== undefined) form.set('unit', body.unit ?? '');
    if (body.referenceRange !== undefined) form.set('referenceRange', body.referenceRange ?? '');
    if (body.findings !== undefined) form.set('findings', body.findings ?? '');
    if (body.impression !== undefined) form.set('impression', body.impression ?? '');
    if (body.criticalFlag !== undefined) form.set('criticalFlag', body.criticalFlag ? 'true' : 'false');
    if (body.reportedAt !== undefined && body.reportedAt) form.set('reportedAt', body.reportedAt);
    if (file) form.set('file', file, file.name);
    return this.http.patch<{ data: InvestigationResult }>(`${this.base}/${id}`, form);
  }

  // ─── Reads ─────────────────────────────────────────────────────────

  listByPrn(prn: string, filters: { department?: ResultDepartment; status?: ResultStatus; from?: string; to?: string } = {}): Observable<{ data: InvestigationResult[] }> {
    let params = new HttpParams();
    if (filters.department) params = params.set('department', filters.department);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    return this.http.get<{ data: InvestigationResult[] }>(`${this.base}/patient/${encodeURIComponent(prn)}`, { params });
  }

  listByAdmission(admissionId: string): Observable<{ data: InvestigationResult[]; window?: { from: string; to: string } }> {
    return this.http.get<{ data: InvestigationResult[]; window?: { from: string; to: string } }>(`${this.base}/admission/${encodeURIComponent(admissionId)}`);
  }

  listByOrder(orderId: number): Observable<{ data: InvestigationResult[] }> {
    return this.http.get<{ data: InvestigationResult[] }>(`${this.base}/order/${orderId}`);
  }

  pendingOrders(filters: { department?: ResultDepartment; days?: number } = {}): Observable<{ data: PendingOrderRow[] }> {
    let params = new HttpParams();
    if (filters.department) params = params.set('department', filters.department);
    if (filters.days !== undefined) params = params.set('days', String(filters.days));
    return this.http.get<{ data: PendingOrderRow[] }>(`${this.base}/pending-orders`, { params });
  }

  get(id: number): Observable<{ data: InvestigationResult }> {
    return this.http.get<{ data: InvestigationResult }>(`${this.base}/${id}`);
  }

  unackCritical(prn: string, days = 7): Observable<{ data: InvestigationResult[] }> {
    const params = new HttpParams().set('prn', prn).set('days', String(days));
    return this.http.get<{ data: InvestigationResult[] }>(`${this.base}/unack-critical`, { params });
  }

  acknowledge(id: number): Observable<{ data: { id: number; acknowledgedAt: string; acknowledgedBy?: string; alreadyAcked?: boolean } }> {
    return this.http.post<{ data: { id: number; acknowledgedAt: string; acknowledgedBy?: string; alreadyAcked?: boolean } }>(`${this.base}/${id}/ack`, {});
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
