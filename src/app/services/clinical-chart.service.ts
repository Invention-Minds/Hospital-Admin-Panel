import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Clinical Chart service (Phase 2).
 *
 * Routes consumed (all under /api/ipd/admission/:admissionId/clinical-chart):
 *   GET    /                           grid (vitals + I/O + daily, grouped per day)
 *   POST   /vitals                     record a vitals reading
 *   DELETE /vitals/:id                 delete a vitals reading
 *   POST   /intake-output              record a fluid in/out event
 *   DELETE /intake-output/:id          delete an I/O entry
 *   POST   /daily                      upsert per-day text fields
 *   POST   /sign-shift                 nurse sign for M/E/N shift
 */

export interface ChartVitals {
  id: string;
  recordedAt: string;
  shift: 'M' | 'E' | 'N' | string | null;
  temperatureC: number | null;
  temperatureF: number | null;
  pulse: number | null;
  respiration: number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  spo2: number | null;
  painScore: number | null;
  sputum: string | null;
  notes: string | null;
  recordedBy: string | null;
  // Phase 9.13 — NEWS2 inputs
  consciousnessAcvpu?: string | null;
  onSupplementalOxygen?: boolean | null;
}

export type IntakeCategory = 'oral' | 'iv' | 'ng' | 'parenteral' | 'blood-product' | 'other';
export type OutputCategory = 'urine' | 'stool' | 'vomitus' | 'drain' | 'ng-aspirate' | 'blood' | 'other';

export interface IntakeOutputEntry {
  id: string;
  recordedAt: string;
  entryType: 'INTAKE' | 'OUTPUT';
  category: string;
  amountMl: number;
  description: string | null;
}

export interface DailyChartRow {
  id: string;
  admissionId: string;
  chartDate: string;
  postOpDay: number | null;
  postPartumDay: number | null;
  weightKg: number | null;
  heightCm: number | null;
  diet: string | null;
  bowels: string | null;
  urine: string | null;
  bloodTransfusion: string | null;
  bloodGroup: string | null;
  noOfTransfusions: number | null;
  antibiotics: string | null;
  bath: string | null;
  allergy: string | null;
  nurseSignMorningId: string | null;
  nurseSignMorningName: string | null;
  nurseSignMorningAt: string | null;
  nurseSignEveningId: string | null;
  nurseSignEveningName: string | null;
  nurseSignEveningAt: string | null;
  nurseSignNightId: string | null;
  nurseSignNightName: string | null;
  nurseSignNightAt: string | null;
}

export interface DayBlock {
  date: string;                                  // YYYY-MM-DD
  vitals: ChartVitals[];
  intakeTotalMl: number;
  outputTotalMl: number;
  intakeBreakdown: Record<string, number>;
  outputBreakdown: Record<string, number>;
  ioEntries: IntakeOutputEntry[];
  daily: DailyChartRow | null;
}

// Phase 9.13 — doctor-ordered vitals monitoring frequency, surfaced on the
// nurse's chart so they know how often to record vitals.
export interface ChartMonitoring {
  frequency: string | null;   // 'continuous'|'1h'|'2h'|'4h'|'6h'|'8h'|'12h'|'bd'
  setBy: string | null;
  setAt: string | null;
  lastVitalsAt: string | null;
}

export interface ChartResponse {
  admissionId: string;
  from: string;
  to: string;
  days: DayBlock[];
  monitoring?: ChartMonitoring;
}

@Injectable({ providedIn: 'root' })
export class ClinicalChartService {
  private base = `${environment.apiUrl}/ipd`;

  constructor(private http: HttpClient) {}

  getChart(admissionId: string, from?: string, to?: string): Observable<ChartResponse> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<ChartResponse>(
      `${this.base}/admission/${admissionId}/clinical-chart`,
      { params },
    );
  }

  createVitals(admissionId: string, body: Partial<ChartVitals> & { recordedAt?: string }): Observable<ChartVitals> {
    return this.http.post<ChartVitals>(
      `${this.base}/admission/${admissionId}/clinical-chart/vitals`,
      body,
    );
  }
  deleteVitals(admissionId: string, id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/admission/${admissionId}/clinical-chart/vitals/${id}`);
  }

  createIntakeOutput(admissionId: string, body: {
    recordedAt?: string;
    entryType: 'INTAKE' | 'OUTPUT';
    category: string;
    amountMl: number;
    description?: string | null;
  }): Observable<IntakeOutputEntry> {
    return this.http.post<IntakeOutputEntry>(
      `${this.base}/admission/${admissionId}/clinical-chart/intake-output`,
      body,
    );
  }
  deleteIntakeOutput(admissionId: string, id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/admission/${admissionId}/clinical-chart/intake-output/${id}`);
  }

  upsertDaily(admissionId: string, body: Partial<DailyChartRow> & { chartDate: string }): Observable<DailyChartRow> {
    return this.http.post<DailyChartRow>(
      `${this.base}/admission/${admissionId}/clinical-chart/daily`,
      body,
    );
  }

  signShift(admissionId: string, body: {
    chartDate: string;
    shift: 'M' | 'E' | 'N';
    signatureId: string;
    nurseName?: string;
  }): Observable<DailyChartRow> {
    return this.http.post<DailyChartRow>(
      `${this.base}/admission/${admissionId}/clinical-chart/sign-shift`,
      body,
    );
  }
}
