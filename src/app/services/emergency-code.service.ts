import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.20 — Hospital emergency codes.

export interface EmergencyCodeDef {
  code: string;
  label: string;
  situation: string;
  number: string;
  extra?: string;
}

export interface CodeActivation {
  id: number;
  code: string;
  situation: string;
  dialNumber: string;
  location: string;
  admissionId: string | null;
  emergencyId: number | null;
  patientName: string | null;
  status: 'active' | 'resolved';
  autoSuggested: boolean;
  note: string | null;
  triggeredByName: string | null;
  triggeredAt: string;
  resolvedByName: string | null;
  resolvedAt: string | null;
  // Phase 9.26 / Phase 5i — team arrival timestamp (powers PSQ-014).
  attendedAt: string | null;
  attendedByName: string | null;
}

export interface CodeSuggestion {
  code: string;
  label: string;
  situation: string;
  location: string;
  reason: string;
  admissionId?: string;
  patientName?: string;
}

export interface ActivateResponse {
  data: CodeActivation;
  dial: { number: string; script: string; extra: string | null };
}

export interface ActivatePayload {
  code: string;
  location: string;
  admissionId?: string | null;
  emergencyId?: number | null;
  patientName?: string | null;
  note?: string | null;
  autoSuggested?: boolean;
}

@Injectable({ providedIn: 'root' })
export class EmergencyCodeService {
  private base = `${environment.apiUrl}/emergency-codes`;

  constructor(private http: HttpClient) {}

  getCodes(): Observable<{ data: EmergencyCodeDef[] }> {
    return this.http.get<{ data: EmergencyCodeDef[] }>(`${this.base}`);
  }
  getSuggestions(): Observable<{ data: CodeSuggestion[] }> {
    return this.http.get<{ data: CodeSuggestion[] }>(`${this.base}/suggestions`);
  }
  listActivations(all = false): Observable<{ data: CodeActivation[] }> {
    return this.http.get<{ data: CodeActivation[] }>(`${this.base}/activations${all ? '?all=true' : ''}`);
  }
  activate(payload: ActivatePayload): Observable<ActivateResponse> {
    return this.http.post<ActivateResponse>(`${this.base}/activate`, payload);
  }
  resolve(id: number): Observable<{ data: CodeActivation }> {
    return this.http.post<{ data: CodeActivation }>(`${this.base}/activations/${id}/resolve`, {});
  }
  // Phase 9.26 / Phase 5i — mark team arrival (PSQ-014 numerator data).
  markAttended(id: number): Observable<{ data: CodeActivation }> {
    return this.http.post<{ data: CodeActivation }>(`${this.base}/activations/${id}/attend`, {});
  }
}
