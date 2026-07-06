import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

export interface LamaRecord {
  id?: string;
  /** ER source — mutually exclusive with admissionId. */
  emergencyId?: string;
  /** IPD / post-op source — mutually exclusive with emergencyId. */
  admissionId?: string;
  lamaTime: Date;
  doctorAdvice: string;
  riskExplained: boolean;
  patientSignature?: string;
  witnessName?: string;
  witnessSignature?: string;
  reasonForLama: string;
  /** HMIS regulatory-system id — populated inline-await on create/update per Sprint 2f. Null = sync pending. */
  hmisLamaId?: string | null;
  createdAt?: Date;
  /** Linked emergency case (list/detail include) — for showing the ER PRN. */
  emergency?: { prn?: string; patientName?: string } | null;
  /** Linked IPD admission (list/detail include) — for showing the IPD source. */
  admission?: { admissionNo?: string; prn?: string } | null;
}

export interface DamaRecord {
  id?: string;
  /** ER source — mutually exclusive with admissionId. */
  emergencyId?: string;
  /** IPD / post-op source — mutually exclusive with emergencyId. */
  admissionId?: string;
  dischargeTime: Date;
  doctorRecommendation: string;
  patientDeclinesAdvice: boolean;
  patientSignature?: string;
  witnessName?: string;
  witnessSignature?: string;
  followUpAdvice?: string;
  /** HMIS regulatory-system id — populated inline-await on create/update per Sprint 2f. Null = sync pending. */
  hmisDamaId?: string | null;
  createdAt?: Date;
  /** Linked emergency case (list/detail include) — for showing the ER PRN. */
  emergency?: { prn?: string; patientName?: string } | null;
  /** Linked IPD admission (list/detail include) — for showing the IPD source. */
  admission?: { admissionNo?: string; prn?: string } | null;
}

@Injectable({
  providedIn: 'root'
})
export class LamaDamaService {
  private apiUrl = `${environment.apiUrl}/lama-dama`;

  constructor(private http: HttpClient) { }

  // Create LAMA record
  createLamaRecord(lamaData: LamaRecord): Observable<any> {
    return this.http.post(`${this.apiUrl}/lama`, lamaData);
  }

  // Create DAMA record
  createDamaRecord(damaData: DamaRecord): Observable<any> {
    return this.http.post(`${this.apiUrl}/dama`, damaData);
  }

  // Get LAMA record
  getLamaRecord(id: string): Observable<LamaRecord> {
    return this.http.get<LamaRecord>(`${this.apiUrl}/lama/${id}`);
  }

  // Get DAMA record
  getDamaRecord(id: string): Observable<DamaRecord> {
    return this.http.get<DamaRecord>(`${this.apiUrl}/dama/${id}`);
  }

  // Get LAMA record by emergency
  getLamaRecordByEmergency(emergencyId: string): Observable<LamaRecord> {
    const params = new HttpParams().set('emergencyId', emergencyId);
    return this.http.get<LamaRecord>(`${this.apiUrl}/lama`, { params });
  }

  // Get DAMA record by emergency
  getDamaRecordByEmergency(emergencyId: string): Observable<DamaRecord> {
    const params = new HttpParams().set('emergencyId', emergencyId);
    return this.http.get<DamaRecord>(`${this.apiUrl}/dama`, { params });
  }

  // Get all LAMA records
  getAllLamaRecords(): Observable<LamaRecord[]> {
    return this.http.get<LamaRecord[]>(`${this.apiUrl}/lama-list`);
  }

  // Get all DAMA records
  getAllDamaRecords(): Observable<DamaRecord[]> {
    return this.http.get<DamaRecord[]>(`${this.apiUrl}/dama-list`);
  }

  // Get LAMA/DAMA records by date range
  getRecordsByDateRange(fromDate: string, toDate: string): Observable<any> {
    let params = new HttpParams();
    params = params.set('fromDate', fromDate);
    params = params.set('toDate', toDate);
    return this.http.get<any>(`${this.apiUrl}/by-date`, { params });
  }

  // Update LAMA record
  updateLamaRecord(id: string, lamaData: Partial<LamaRecord>): Observable<any> {
    return this.http.put(`${this.apiUrl}/lama/${id}`, lamaData);
  }

  // Update DAMA record
  updateDamaRecord(id: string, damaData: Partial<DamaRecord>): Observable<any> {
    return this.http.put(`${this.apiUrl}/dama/${id}`, damaData);
  }

  // Upload patient signature (LAMA)
  uploadLamaPatientSignature(id: string, signatureFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', signatureFile);
    return this.http.post(`${this.apiUrl}/lama/${id}/upload-patient-signature`, formData);
  }

  // Upload witness signature (LAMA)
  uploadLamaWitnessSignature(id: string, signatureFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', signatureFile);
    return this.http.post(`${this.apiUrl}/lama/${id}/upload-witness-signature`, formData);
  }

  // Upload patient signature (DAMA)
  uploadDamaPatientSignature(id: string, signatureFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', signatureFile);
    return this.http.post(`${this.apiUrl}/dama/${id}/upload-patient-signature`, formData);
  }

  // Upload witness signature (DAMA)
  uploadDamaWitnessSignature(id: string, signatureFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', signatureFile);
    return this.http.post(`${this.apiUrl}/dama/${id}/upload-witness-signature`, formData);
  }

  // Get LAMA/DAMA statistics
  getStats(fromDate?: string, toDate?: string): Observable<any> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get<any>(`${this.apiUrl}/stats`, { params });
  }

  // Download LAMA documentation
  downloadLamaDocumentation(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/lama/${id}/download`, { responseType: 'blob' });
  }

  // Download DAMA documentation
  downloadDamaDocumentation(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/dama/${id}/download`, { responseType: 'blob' });
  }

  // Generate LAMA report
  generateLamaReport(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/lama/${id}/report-pdf`, { responseType: 'blob' });
  }

  // Generate DAMA report
  generateDamaReport(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/dama/${id}/report-pdf`, { responseType: 'blob' });
  }

  // Verify LAMA/DAMA documentation
  verifyDocumentation(recordType: 'lama' | 'dama', id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${recordType}/${id}/verify`, {});
  }

  // Get LAMA/DAMA compliance report
  getComplianceReport(fromDate?: string, toDate?: string): Observable<any> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get<any>(`${this.apiUrl}/compliance-report`, { params });
  }
}
