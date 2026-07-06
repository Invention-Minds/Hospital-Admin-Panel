import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.13 — Treatment Dashboard (NEWS2 deterioration watchboard).

export type EwsBand = 'low' | 'low-medium' | 'medium' | 'high';
export type AcuitySource = 'IPD' | 'ICU';
export type AcuityTrend = 'improving' | 'stable' | 'worsening';

export interface AlertChip {
  kind: 'critical-lab' | 'attender-concern' | 'no-progress-note' | 'overdue-vitals'
    | 'rising-streak' | 'critical-glucose';
  label: string;
  count?: number;
}

export interface WatchboardRow {
  admissionId: string;
  admissionNo: string;
  prn: string | null;
  patientName: string | null;
  age: string | null;
  gender: string | null;
  source: AcuitySource;
  department: string;
  ward: string | null;
  bed: string | null;
  admittingDoctor: string;
  admissionDate: string;
  ewsScore: number | null;
  ewsBand: EwsBand | null;
  trend: AcuityTrend | null;
  risingStreak: boolean;
  ewsHistory: number[];
  vitalsRecordedAt: string | null;
  acuityComputedAt: string | null;
  vitalsMonitoringFrequency: string | null;
  vitalsMonitoringSetBy: string | null;
  chips: AlertChip[];
  alertCount: number;
}

export interface WatchboardKpis {
  total: number;
  high: number;
  medium: number;
  deteriorating: number;
  criticalLabs: number;
  careGaps: number;
  icu: number;
}

export interface AcuitySnapshot {
  id: string;
  admissionId: string;
  source: AcuitySource;
  ewsScore: number;
  ewsBand: EwsBand;
  componentScores: string | null;
  trend: AcuityTrend | null;
  risingStreak: boolean;
  vitalsRecordedAt: string | null;
  computedAt: string;
}

export interface AcuityEscalation {
  id: string;
  admissionId: string;
  action: 'ACKNOWLEDGE' | 'ESCALATE' | 'REVIEW';
  ewsScore: number | null;
  note: string | null;
  byName: string | null;
  createdAt: string;
}

// Loose-typed vitals row — IPD and ICU readings differ in column names; the
// component normalises what it needs for the graph.
export interface VitalsRow {
  id: string;
  recordedAt: string;
  [key: string]: unknown;
}

export interface PatientAcuityDetail {
  admission: {
    id: string;
    prn: string | null;
    admissionNo: string;
    admittingDoctor: string;
    department: string;
    diagnosis: string;
    admissionDate: string;
    source: AcuitySource;
    patientName: string | null;
    age: string | null;
    gender: string | null;
    bloodGroup: string | null;
    ward?: { wardName: string; wardCode: string } | null;
    bed?: { bedNumber: string } | null;
  };
  snapshots: AcuitySnapshot[];
  latestSnapshot: AcuitySnapshot | null;
  vitalsTrend: VitalsRow[];
  results: Array<Record<string, unknown>>;
  criticalResults: Array<Record<string, unknown>>;
  latestProgressNote: Record<string, unknown> | null;
  escalations: AcuityEscalation[];
}

export interface WatchboardFilters {
  source?: 'ipd' | 'icu' | 'all';
  wardId?: string;
  doctor?: string;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class TreatmentDashboardService {
  private base = `${environment.apiUrl}/treatment-dashboard`;

  constructor(private http: HttpClient) {}

  watchboard(filters: WatchboardFilters = {}): Observable<{ data: WatchboardRow[]; kpis: WatchboardKpis }> {
    let params = new HttpParams();
    if (filters.source) params = params.set('source', filters.source);
    if (filters.wardId) params = params.set('wardId', filters.wardId);
    if (filters.doctor) params = params.set('doctor', filters.doctor);
    if (filters.search) params = params.set('search', filters.search);
    return this.http.get<{ data: WatchboardRow[]; kpis: WatchboardKpis }>(`${this.base}/watchboard`, { params });
  }

  patient(admissionId: string): Observable<{ data: PatientAcuityDetail }> {
    return this.http.get<{ data: PatientAcuityDetail }>(`${this.base}/patient/${admissionId}`);
  }

  escalate(
    admissionId: string,
    body: { action: 'ACKNOWLEDGE' | 'ESCALATE' | 'REVIEW'; note?: string; ewsScore?: number },
  ): Observable<{ data: AcuityEscalation }> {
    return this.http.post<{ data: AcuityEscalation }>(`${this.base}/patient/${admissionId}/escalate`, body);
  }

  refresh(): Observable<{ data: { processed: number; scored: number } }> {
    return this.http.post<{ data: { processed: number; scored: number } }>(`${this.base}/refresh`, {});
  }
}
