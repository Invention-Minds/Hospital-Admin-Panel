import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

export interface MlcCase {
  id?: string;
  emergencyId: string;
  mlcNo?: string;
  caseType: 'accident' | 'assault' | 'poison' | 'burn' | 'other';
  policeStationName?: string;
  fir_No?: string;
  fir_Date?: Date;
  investigatingOfficer?: string;
  // --- Incident details (NABH MLC expansion) ---
  incidentDateTime?: Date;
  incidentPlace?: string;
  allegedCause?: string;
  weaponType?: string;
  // --- Brought by / informant ---
  broughtBy?: string;
  broughtByDetail?: string;
  informantName?: string;
  informantRelation?: string;
  // --- Identification ---
  identificationMark1?: string;
  identificationMark2?: string;
  // --- Consent for examination ---
  consentForExamination?: boolean;
  consentForExamTime?: Date;
  // --- Opinion / police intimation ---
  injuryOpinion?: string;
  policeIntimationTime?: Date;
  policeIntimationMode?: string;
  policeIntimationBy?: string;
  // --- Examining doctor / referral ---
  examiningDoctorRegNo?: string;
  referredTo?: string;
  patientConsent: boolean;
  consentTime?: Date;
  firstExaminationDone: boolean;
  firstExaminationTime?: Date;
  examinerName?: string;
  examinerSignature?: string;
  injuries: string;
  photographsTaken: boolean;
  photoUrls?: string[];
  samplesCollected?: string;
  sampleStorageInfo?: string;
  followUpExams?: string;
  finalReport?: string;
  reportSubmittedTo?: string;
  submissionDate?: Date;
  submissionProof?: string;
  status: 'documented' | 'examination-done' | 'samples-collected' | 'report-submitted' | 'closed';
  injuries_detail?: MlcInjury[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MlcInjury {
  id?: number;
  site: string;
  injuryType?: string;
  size?: string;
  ageOfInjury?: string;
  weaponLikely?: string;
  simpleOrGrievous?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MlcService {
  private apiUrl = `${environment.apiUrl}/mlc`;

  constructor(private http: HttpClient) { }

  // Register MLC case
  registerMlcCase(mlcData: MlcCase): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, mlcData);
  }

  // Get MLC case by ID
  getMlcCase(id: string): Observable<MlcCase> {
    return this.http.get<MlcCase>(`${this.apiUrl}/${id}`);
  }

  // Get MLC case by case number
  getMlcCaseByNumber(mlcNo: string): Observable<MlcCase> {
    const params = new HttpParams().set('mlcNo', mlcNo);
    return this.http.get<MlcCase>(`${this.apiUrl}/by-number`, { params });
  }

  // Get all MLC cases
  getAllMlcCases(): Observable<MlcCase[]> {
    return this.http.get<MlcCase[]>(`${this.apiUrl}/`);
  }

  /** MLC cases linked to emergencies referred/assigned to the logged-in doctor. */
  getMyMlcCases(): Observable<{ data: MlcCase[] }> {
    return this.http.get<{ data: MlcCase[] }>(`${this.apiUrl}/mine`);
  }

  // Get pending MLC cases (awaiting examination/sample/submission)
  getPendingMlcCases(): Observable<MlcCase[]> {
    return this.http.get<MlcCase[]>(`${this.apiUrl}/pending-reports`);
  }

  // Get MLC cases by date
  getMlcCasesByDate(fromDate: string, toDate: string): Observable<MlcCase[]> {
    let params = new HttpParams();
    params = params.set('fromDate', fromDate);
    params = params.set('toDate', toDate);
    return this.http.get<MlcCase[]>(`${this.apiUrl}/by-date`, { params });
  }

  // Update MLC case
  updateMlcCase(id: string, mlcData: Partial<MlcCase>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, mlcData);
  }

  // Record examination findings
  recordExamination(id: string, examinationData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/examination`, examinationData);
  }

  // Record sample collection
  recordSampleCollection(id: string, sampleData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/samples`, sampleData);
  }

  // Submit final report
  submitFinalReport(id: string, reportData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/report`, reportData);
  }

  // Upload photographs
  uploadPhotographs(id: string, files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return this.http.post(`${this.apiUrl}/${id}/upload-photos`, formData);
  }

  // Upload examiner signature
  uploadExaminerSignature(id: string, signatureFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', signatureFile);
    return this.http.post(`${this.apiUrl}/${id}/upload-signature`, formData);
  }

  // Upload submission proof
  uploadSubmissionProof(id: string, proofFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', proofFile);
    return this.http.post(`${this.apiUrl}/${id}/upload-submission-proof`, formData);
  }

  // Get pending reports (awaiting submission)
  getPendingReports(): Observable<MlcCase[]> {
    return this.http.get<MlcCase[]>(`${this.apiUrl}/pending-reports`);
  }

  // Get MLC cases by emergency
  getMlcCaseByEmergency(emergencyId: string): Observable<MlcCase> {
    const params = new HttpParams().set('emergencyId', emergencyId);
    return this.http.get<MlcCase>(`${this.apiUrl}/by-emergency`, { params });
  }

  // Get MLC statistics
  getMlcStats(fromDate?: string, toDate?: string): Observable<any> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get<any>(`${this.apiUrl}/stats`, { params });
  }

  // Download MLC documentation
  downloadMlcDocumentation(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/download`, { responseType: 'blob' });
  }

  // Generate MLC report
  generateMlcReport(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/report-pdf`, { responseType: 'blob' });
  }

  // Close MLC case
  closeMlcCase(id: string, closureNotes?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/close`, { closureNotes });
  }

  // Get MLC case history
  getMlcCaseHistory(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/history`);
  }

  // Get injuries detail for an MLC case
  getInjuries(id: string): Observable<MlcInjury[]> {
    return this.http.get<MlcInjury[]>(`${this.apiUrl}/${id}/injuries`);
  }

  // Add an injury to an MLC case
  addInjury(id: string, body: Partial<MlcInjury>): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/injuries`, body);
  }

  // Delete an injury from an MLC case
  deleteInjury(id: string, injuryId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}/injuries/${injuryId}`);
  }
}
