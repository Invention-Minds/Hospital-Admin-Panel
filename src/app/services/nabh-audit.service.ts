import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Phase 10 — NABH audit pack service.
 *
 * Field names match the backend NabhAuditExport schema columns 1:1
 * (`scope`, `fromDate`, `toDate`, `status`, `filePath`, `downloadUrl`,
 * `rowCount`, `bundleBytes`, `errorDetail`, `requestedBy`, etc.).
 */

export type AuditPackScope =
  | 'full'
  | 'wf-1'
  | 'wf-2'
  | 'wf-3'
  | 'wf-4'
  | 'wf-5'
  | 'incident'
  | 'hmis';

export type AuditPackStatus = 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED';

export interface NabhAuditExport {
  id: string;
  scope: AuditPackScope;
  fromDate: string;
  toDate: string;
  status: AuditPackStatus;
  filePath?: string | null;
  downloadUrl?: string | null;
  rowCount?: number | null;
  bundleBytes?: number | null;
  errorDetail?: string | null;
  requestedBy?: string | null;
  requestedById?: number | null;
  requestedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface RequestExportPayload {
  scope: AuditPackScope;
  fromDate: string; // YYYY-MM-DD
  toDate: string;
}

/**
 * Compliance scorecard types — mirror the backend nabh-compliance.ts shape.
 * The scorecard groups checks into NABH chapters and gives a pass/warn/fail
 * verdict per standard with sample breach evidence.
 */
export type ComplianceCheckStatus = 'PASS' | 'WARNING' | 'FAIL' | 'NOT_APPLICABLE';

export interface ComplianceBreach {
  entityType: string;
  entityId: string;
  note: string;
}

export interface ComplianceStandard {
  code: string;
  name: string;
  description: string;
  status: ComplianceCheckStatus;
  numerator: number;
  denominator: number;
  percentage: number;
  threshold: number;
  breaches: ComplianceBreach[];
}

export interface ComplianceChapter {
  code: string;
  name: string;
  standards: ComplianceStandard[];
  passed: number;
  warning: number;
  failed: number;
}

export interface ComplianceReport {
  fromDate: string;
  toDate: string;
  generatedAt: string;
  overall: {
    totalChecks: number;
    passed: number;
    warning: number;
    failed: number;
    notApplicable: number;
    score: number; // 0..100
  };
  chapters: ComplianceChapter[];
}

@Injectable({ providedIn: 'root' })
export class NabhAuditService {
  private apiUrl = `${environment.apiUrl}/nabh-audit`;

  constructor(private http: HttpClient) {}

  list(): Observable<NabhAuditExport[]> {
    return this.http.get<NabhAuditExport[]>(`${this.apiUrl}/exports`);
  }

  getById(id: string): Observable<NabhAuditExport> {
    return this.http.get<NabhAuditExport>(`${this.apiUrl}/exports/${id}`);
  }

  /** Synchronous build — returns the READY row once the bundle is on disk. */
  requestExport(payload: RequestExportPayload): Observable<NabhAuditExport> {
    return this.http.post<NabhAuditExport>(`${this.apiUrl}/export`, payload);
  }

  /**
   * Run all NABH standard checks for a date range and return the
   * pass/warn/fail scorecard. Defaults to the last 30 days when omitted.
   */
  getComplianceReport(fromDate?: string, toDate?: string): Observable<ComplianceReport> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get<ComplianceReport>(`${this.apiUrl}/compliance-report`, { params });
  }
}
