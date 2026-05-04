import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

export interface IpdPrescription {
  id?: string;
  admissionId: string;
  prescriptionId?: string;
  prescribedBy: string;
  prescribedDate?: Date;
  carryOverFrom?: 'opd' | 'emergency';
  genericName: string;
  brandName?: string;
  dose: string;
  frequency: string;
  duration: string;
  route: string;
  instructions?: string;
  quantity: number;
  isCarryOver: boolean;
  lastAdminTime?: Date;
  nextAdminTime?: Date;
  adminStatus: 'pending' | 'administered' | 'skipped' | 'stopped';
  status: 'active' | 'paused' | 'discontinued';
  hmisRxId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MedicationAdminLog {
  id?: string;
  prescriptionId: string;
  adminTime: Date;
  administeredBy: string;
  dose: string;
  route: string;
  notes?: string;
  signatureUrl?: string;
}

/**
 * Sprint 3c — expanded response shapes from the Sprint 2d backend contract
 * expansion (see docs/modules/ipd-pharmacy-sync.md § Sprint 3c Contract
 * Expansion). The expansion added drug-detail fields so the pharmacy and
 * MAR UIs can render without N+1 follow-up fetches.
 */

/** Nested tablet row carried on each carryover prescription. */
export interface CarryoverTablet {
  id: number;
  genericName: string;
  brandName: string;
  frequency: string;
  duration: string;
  route: string | null;        // default 'oral' at DB layer
  quantity: number;
  instructions: string;
}

/** A carryover prescription row as returned by reviewCarryoverPrescriptions. */
export interface CarryoverPrescription {
  prescriptionId: string;
  prescribedBy: string;
  prescribedDate: string;
  patientName: string;
  tablets: CarryoverTablet[];
}

/** Drug-detail slice joined onto MAR log rows. */
export interface MarLogPrescriptionInfo {
  id: string;
  genericName: string;
  brandName: string | null;
  frequency: string;
  route: string;
}

/** An administered-med log row as returned by getMedicationAdministrationRecord. */
export interface MarLogEntry {
  id: string;
  prescriptionId: string;
  admissionId: string;
  administeredAt: string | Date;
  administeredBy: string;
  quantity: number;
  route: string;
  remarks: string | null;
  createdAt: string | Date;
  prescription: MarLogPrescriptionInfo | null;
}

/** Paginated MAR response envelope. */
export interface MarResponse {
  message: string;
  data: MarLogEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/** Envelope for the carryover list. */
export interface CarryoverResponse {
  message: string;
  data: CarryoverPrescription[];
}

@Injectable({
  providedIn: 'root'
})
export class IpdPrescriptionService {
  private apiUrl = `${environment.apiUrl}/ipd-pharmacy`;

  constructor(private http: HttpClient) { }

  // Review carryover prescriptions from OPD/Emergency
  reviewCarryoverPrescriptions(admissionId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admission/${admissionId}/review-carryover`);
  }

  // Continue a prescription from OPD/Emergency into IPD
  continuePrescription(admissionId: string, prescriptionData: IpdPrescription): Observable<any> {
    return this.http.post(`${this.apiUrl}/admission/${admissionId}/continue`, prescriptionData);
  }

  // Modify a prescription (dose, frequency, duration)
  modifyPrescription(prescriptionId: string, modificationData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/prescription/${prescriptionId}/modify`, modificationData);
  }

  // Discontinue a prescription
  discontinuePrescription(prescriptionId: string, reason?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/prescription/${prescriptionId}/discontinue`, { reason });
  }

  // Create new prescription in IPD
  createNewPrescription(admissionId: string, prescriptionData: IpdPrescription): Observable<any> {
    return this.http.post(`${this.apiUrl}/admission/${admissionId}/prescription`, prescriptionData);
  }

  // Get all prescriptions for admission
  getAdmissionPrescriptions(admissionId: string): Observable<IpdPrescription[]> {
    return this.http.get<IpdPrescription[]>(`${this.apiUrl}/admission/${admissionId}/prescriptions`);
  }

  // Get pending medications to be administered
  getPendingMedications(admissionId: string): Observable<IpdPrescription[]> {
    return this.http.get<IpdPrescription[]>(`${this.apiUrl}/admission/${admissionId}/pending`);
  }

  // Mark medication as administered
  administerMedication(prescriptionId: string, adminLog: MedicationAdminLog): Observable<any> {
    return this.http.post(`${this.apiUrl}/prescription/${prescriptionId}/administer`, adminLog);
  }

  // Get medication administration record (MAR)
  getMedicationAdministrationRecord(admissionId: string): Observable<MedicationAdminLog[]> {
    return this.http.get<MedicationAdminLog[]>(`${this.apiUrl}/admission/${admissionId}/mar`);
  }

  // Skip medication administration
  skipMedication(prescriptionId: string, reason?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/prescription/${prescriptionId}/skip`, { reason });
  }

  // Get prescription by ID
  getPrescription(prescriptionId: string): Observable<IpdPrescription> {
    return this.http.get<IpdPrescription>(`${this.apiUrl}/prescription/${prescriptionId}`);
  }

  // Get MAR report for a date range
  getMARReport(admissionId: string, fromDate?: string, toDate?: string): Observable<any> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get<any>(`${this.apiUrl}/admission/${admissionId}/mar-report`, { params });
  }

  // Get prescription history
  getPrescriptionHistory(admissionId: string): Observable<IpdPrescription[]> {
    return this.http.get<IpdPrescription[]>(`${this.apiUrl}/admission/${admissionId}/history`);
  }

  // Download medication list
  downloadMedicationList(admissionId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/admission/${admissionId}/download-medication-list`, { responseType: 'blob' });
  }

  // Sync prescription with HMIS
  syncWithHMIS(prescriptionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/prescription/${prescriptionId}/sync-hmis`, {});
  }
}
