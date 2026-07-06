import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Medication Reconciliation service (Phase 4a — NABH MOM.1.c).
 *
 * Reads the prescription list for an admission and lets the admitting team
 * stamp a per-row decision (CONTINUE / CHANGE / HOLD / DISCONTINUE / RECONCILE).
 */

export type PrescriptionType = 'STAT' | 'VARIABLE' | 'REGULAR';
export type ReconciliationAction = 'CONTINUE' | 'CHANGE' | 'HOLD' | 'DISCONTINUE' | 'RECONCILE';

export interface ReconciliationRow {
  id: string;
  admissionId: string;
  genericName: string;
  brandName: string | null;
  dose: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string | null;
  isCarryOver: boolean;
  carryOverFrom: string | null;
  status: string;
  prescriptionType: PrescriptionType | null;
  reconciliationAction: ReconciliationAction | null;
  reconciliationReason: string | null;
  reconciledAt: string | null;
  reconciledBy: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class MedicationReconciliationService {
  private base = `${environment.apiUrl}/ipd`;

  constructor(private http: HttpClient) {}

  list(admissionId: string): Observable<ReconciliationRow[]> {
    return this.http.get<ReconciliationRow[]>(
      `${this.base}/admission/${admissionId}/medication-reconciliation`,
    );
  }

  setAction(admissionId: string, prescriptionId: string, body: {
    prescriptionType?: PrescriptionType | null;
    reconciliationAction?: ReconciliationAction | null;
    reconciliationReason?: string | null;
  }): Observable<ReconciliationRow> {
    return this.http.post<ReconciliationRow>(
      `${this.base}/admission/${admissionId}/medication-reconciliation/${prescriptionId}`,
      body,
    );
  }
}
