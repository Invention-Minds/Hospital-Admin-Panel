import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.14 — Insulin Infusion Chart.

export interface InsulinReading {
  id: string;
  admissionId: string;
  recordedAt: string;
  bloodGlucoseMgDl: number | null;
  insulinOrder: string | null;
  doctorName: string | null;
  doctorSignatureId: string | null;
  nurseName: string | null;
  nurseSignatureId: string | null;
  remarks: string | null;
  recordedBy: string | null;
  createdAt: string;
}

export interface InsulinReadingBody {
  recordedAt?: string;
  bloodGlucoseMgDl?: number | null;
  insulinOrder?: string | null;
  doctorName?: string | null;
  doctorSignatureId?: string | null;
  nurseName?: string | null;
  nurseSignatureId?: string | null;
  remarks?: string | null;
}

// Phase 9.18 — doctor-ordered glucose monitoring cadence.
export interface GlucoseMonitoringOrder {
  glucoseMonitoringFrequency: string | null;
  glucoseMonitoringSetBy: string | null;
  glucoseMonitoringSetAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class InsulinInfusionService {
  private base = `${environment.apiUrl}/ipd`;

  constructor(private http: HttpClient) {}

  list(admissionId: string): Observable<{ data: InsulinReading[]; order: GlucoseMonitoringOrder }> {
    return this.http.get<{ data: InsulinReading[]; order: GlucoseMonitoringOrder }>(
      `${this.base}/admission/${admissionId}/insulin-chart`,
    );
  }

  setFrequency(admissionId: string, glucoseMonitoringFrequency: string | null): Observable<{ order: GlucoseMonitoringOrder }> {
    return this.http.put<{ order: GlucoseMonitoringOrder }>(
      `${this.base}/admission/${admissionId}/insulin-chart/frequency`,
      { glucoseMonitoringFrequency },
    );
  }

  create(admissionId: string, body: InsulinReadingBody): Observable<{ data: InsulinReading }> {
    return this.http.post<{ data: InsulinReading }>(
      `${this.base}/admission/${admissionId}/insulin-chart`, body,
    );
  }

  update(admissionId: string, id: string, body: InsulinReadingBody): Observable<{ data: InsulinReading }> {
    return this.http.put<{ data: InsulinReading }>(
      `${this.base}/admission/${admissionId}/insulin-chart/${id}`, body,
    );
  }

  remove(admissionId: string, id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/admission/${admissionId}/insulin-chart/${id}`,
    );
  }
}
