import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.4c — per-role surgery billing lines service.

export type EstimationSurgeryRole =
  | 'surgeon' | 'co-surgeon' | 'assistant-surgeon' | 'anaesthetist'
  | 'ot-rent' | 'other';

export interface EstimationSurgeryLine {
  id: number;
  estimationId: string;
  surgeryName: string;
  departmentName: string | null;
  categoryCode: string | null;
  role: EstimationSurgeryRole;
  serviceCode: string | null;
  serviceName: string;
  renderedBy: string | null;
  rate: number;
  quantity: number;
  discountPercent: number;
  discountReason: string | null;
  adjustmentAmount: number;
  adjustmentReason: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class EstimationSurgeryLineService {
  private apiUrl = `${environment.apiUrl}/estimation`;

  constructor(private http: HttpClient) {}

  // Estimation IDs contain a slash (e.g. "JMRH FY2025/26 - 005"), so each id
  // segment must be encodeURIComponent'd — otherwise the "/" splits the path
  // and the :estimationId route 404s.
  list(estimationId: string): Observable<{ data: EstimationSurgeryLine[]; subtotal: number }> {
    return this.http.get<{ data: EstimationSurgeryLine[]; subtotal: number }>(
      `${this.apiUrl}/${encodeURIComponent(estimationId)}/surgery-lines`);
  }
  add(estimationId: string, body: Partial<EstimationSurgeryLine>): Observable<{ data: EstimationSurgeryLine }> {
    return this.http.post<{ data: EstimationSurgeryLine }>(
      `${this.apiUrl}/${encodeURIComponent(estimationId)}/surgery-lines`, body);
  }
  update(estimationId: string, id: number, body: Partial<EstimationSurgeryLine>): Observable<{ data: EstimationSurgeryLine }> {
    return this.http.put<{ data: EstimationSurgeryLine }>(
      `${this.apiUrl}/${encodeURIComponent(estimationId)}/surgery-lines/${id}`, body);
  }
  remove(estimationId: string, id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${encodeURIComponent(estimationId)}/surgery-lines/${id}`);
  }
}
