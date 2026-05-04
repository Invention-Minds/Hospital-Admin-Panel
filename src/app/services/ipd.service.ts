import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environment/environment.prod';

export interface IpdAdmission {
  id?: string;
  admissionNo?: string;
  prn: string;
  admissionDate: Date;
  admissionTime: string;
  admissionType: 'elective' | 'emergency' | 'transfer';
  sourceModule?: 'opd' | 'emergency' | 'direct';
  referralOpdId?: string;
  referralEmergencyId?: string;
  referralMlcId?: string;
  referringDoctor?: string;
  admittingDoctor: string;
  department: string;
  wardId: string;
  bedId: string;
  // Backend GET /ipd/admissions includes the joined ward + bed objects.
  ward?: { id: string; wardName: string; wardCode: string };
  bed?: { id: string; bedNumber: string; bedType: string; status: string };
  roomType: 'general' | 'semi-private' | 'private' | 'ICU' | 'HDU';
  diagnosis: string;
  status: 'admitted' | 'transferred' | 'discharged' | 'LAMA' | 'DAMA' | 'expired';
  hmisAdmissionId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IpdProgressNote {
  id?: string;
  admissionId: string;
  date?: Date;
  doctorName: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  nursingNotes?: string;
  vitalsBP?: string;
  vitalsHR?: string;
  vitalsTemp?: string;
  vitalsSpO2?: string;
  vitalsRR?: string;
}

export interface IpdDischarge {
  id?: string;
  admissionId: string;
  dischargeDate: Date;
  dischargeTime: string;
  dischargeType: 'regular' | 'LAMA' | 'transfer' | 'expired';
  finalDiagnosis: string;
  proceduresDone?: string;
  conditionAtDischarge: string;
  dischargeSummary: string;
  followUpDate?: Date;
  followUpDoctor?: string;
  medications: any[];
  advice?: string;
  hmisDischargeId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class IpdService {
  private apiUrl = `${environment.apiUrl}/ipd`;
  private admissionsSource = new BehaviorSubject<IpdAdmission[]>([]);
  admissions$ = this.admissionsSource.asObservable();

  constructor(private http: HttpClient) { }

  // Create IPD admission
  createAdmission(admissionData: IpdAdmission): Observable<any> {
    return this.http.post(`${this.apiUrl}/admission`, admissionData);
  }

  // Get all admissions
  getAllAdmissions(): Observable<IpdAdmission[]> {
    return this.http.get<IpdAdmission[]>(`${this.apiUrl}/admissions`);
  }

  // Get admission by ID
  getAdmission(id: string): Observable<IpdAdmission> {
    return this.http.get<IpdAdmission>(`${this.apiUrl}/admission/${id}`);
  }

  // Get admissions by PRN
  getAdmissionsByPrn(prn: string): Observable<IpdAdmission[]> {
    const params = new HttpParams().set('prn', prn);
    return this.http.get<IpdAdmission[]>(`${this.apiUrl}/admissions`, { params });
  }

  // Get active admissions
  getActiveAdmissions(): Observable<IpdAdmission[]> {
    const params = new HttpParams().set('status', 'admitted');
    return this.http.get<IpdAdmission[]>(`${this.apiUrl}/admissions`, { params });
  }

  // Update admission
  updateAdmission(id: string, admissionData: Partial<IpdAdmission>): Observable<any> {
    return this.http.put(`${this.apiUrl}/admission/${id}`, admissionData);
  }

  // Add progress note
  addProgressNote(admissionId: string, note: IpdProgressNote): Observable<any> {
    return this.http.post(`${this.apiUrl}/admission/${admissionId}/progress-note`, note);
  }

  // Get progress notes
  getProgressNotes(admissionId: string): Observable<IpdProgressNote[]> {
    return this.http.get<IpdProgressNote[]>(`${this.apiUrl}/admission/${admissionId}/progress-notes`);
  }

  // Create discharge
  createDischarge(admissionId: string, dischargeData: IpdDischarge): Observable<any> {
    return this.http.post(`${this.apiUrl}/admission/${admissionId}/discharge`, dischargeData);
  }

  // Get discharge summary
  getDischarge(admissionId: string): Observable<IpdDischarge> {
    return this.http.get<IpdDischarge>(`${this.apiUrl}/admission/${admissionId}/discharge`);
  }

  // Download discharge PDF
  downloadDischargePDF(admissionId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/admission/${admissionId}/discharge-pdf`, { responseType: 'blob' });
  }

  // Transfer patient to different bed/ward
  transferPatient(admissionId: string, transferData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admission/${admissionId}/transfer`, transferData);
  }

  // Get bed census (current occupancy)
  getBedCensus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/bed-census`);
  }

  // Get all wards
  getAllWards(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/wards`);
  }

  // Get ward by ID
  getWardDetails(wardId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ward/${wardId}`);
  }

  // Get available beds
  getAvailableBeds(wardId?: string): Observable<any[]> {
    let params = new HttpParams();
    if (wardId) params = params.set('wardId', wardId);
    return this.http.get<any[]>(`${this.apiUrl}/beds/available`, { params });
  }

  // Update bed status
  updateBedStatus(bedId: string, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/bed/${bedId}/status`, { status });
  }

  // Get admission admissions by ward
  getAdmissionsByWard(wardId: string): Observable<IpdAdmission[]> {
    const params = new HttpParams().set('wardId', wardId);
    return this.http.get<IpdAdmission[]>(`${this.apiUrl}/admissions`, { params });
  }

  // Get IPD statistics
  getIPDStats(fromDate?: string, toDate?: string): Observable<any> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get<any>(`${this.apiUrl}/stats`, { params });
  }
}
