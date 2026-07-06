import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environment/environment.prod';

export interface EmergencyCase {
  id?: string;
  prn: string; // ER case number (server-generated, JMRH-ER-…)
  patientPrn?: string; // patient master PRN sent from the intake picker
  patientName?: string;
  phoneNumber?: string;
  age?: number | null;
  gender?: string;
  allergies?: string;
  triageCategory: 'red' | 'yellow' | 'green' | 'black';
  presentingComplaint: string;
  abcdeAssessment: string;
  traumaScore?: number;
  vitalsBP: string;
  vitalsHR: number;
  vitalsRR: number;
  vitalsSpO2: number;
  vitalsTemp: number;
  proceduresDone?: string;
  // Phase 6 — UHJ/EMR/F-01 intake fields (all optional).
  modeOfArrival?: string;
  broughtBy?: string;
  historyGivenBy?: string;
  referralFrom?: string;
  referredTo?: string;
  identificationMark?: string;
  policeInformationGiven?: boolean;
  reasonsForMlc?: string;
  painScore?: number;
  airway?: string;
  breathing?: string;
  circulation?: string;
  mentalStatus?: string;
  pupilsRight?: string;
  pupilsLeft?: string;
  secondarySurvey?: string;
  workingDiagnosis?: string;
  conditionAtDisposition?: string;
  disposition?: string;
  handOffDoctorName?: string;
  receivingDoctorName?: string;
  handOffNurseName?: string;
  receivingNurseName?: string;
  status: string;
  docmindsCreated: boolean;
  hmisCreated: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Slim shape for the MLC register picker — what the dropdown needs to render
 * a useful label (id + PRN + name + triage + age + when).
 */
export interface MlcPickerEmergency {
  id: number;
  prn: string;
  patientName: string;
  age?: number | null;
  triageCategory: 'red' | 'yellow' | 'green' | 'black';
  status: string;
  createdAt: string;
}

export interface EmergencyProgressNote {
  id?: string;
  emergencyId: string;
  time?: Date;
  doctorName: string;
  observation: string;
  vitalsUpdate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmergencyService {
  private apiUrl = `${environment.apiUrl}/emergency`;
  private emergencyCasesSource = new BehaviorSubject<EmergencyCase[]>([]);
  emergencyCases$ = this.emergencyCasesSource.asObservable();

  constructor(private http: HttpClient) { }

  // Create emergency case
  createEmergencyCase(caseData: EmergencyCase): Observable<any> {
    return this.http.post(`${this.apiUrl}/`, caseData);
  }

  // Get emergency case by ID
  getEmergencyCase(id: string): Observable<EmergencyCase> {
    return this.http.get<EmergencyCase>(`${this.apiUrl}/${id}`);
  }

  // Get all emergency cases. The backend wraps the response in
  // `{ data, pagination }` with a default limit of 10, so we unwrap `.data`
  // and request a wide page (the list/overview paginate client-side).
  getAllEmergencyCases(): Observable<EmergencyCase[]> {
    const params = new HttpParams().set('limit', '500');
    return this.http
      .get<{ data: EmergencyCase[]; pagination?: unknown } | EmergencyCase[]>(`${this.apiUrl}/`, { params })
      .pipe(map((res) => (Array.isArray(res) ? res : res?.data ?? [])));
  }

  /**
   * Picker list for MLC registration. Returns only emergencies that don't
   * already have an MLC case (filtered server-side via ?withoutMlc=true).
   *
   * Backend wraps the response in `{ data, pagination }` with default limit=10,
   * so we unwrap `.data` and request a wide page so dropdowns aren't truncated.
   */
  getEmergenciesForMlcPicker(): Observable<MlcPickerEmergency[]> {
    const params = new HttpParams()
      .set('withoutMlc', 'true')
      .set('limit', '500');
    return this.http
      .get<{ data: MlcPickerEmergency[]; pagination?: unknown } | MlcPickerEmergency[]>(
        `${this.apiUrl}/`,
        { params },
      )
      .pipe(map((res) => (Array.isArray(res) ? res : res?.data ?? [])));
  }

  // Get emergency cases by date
  getEmergencyCasesByDate(date: string): Observable<EmergencyCase[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<EmergencyCase[]>(`${this.apiUrl}/by-date`, { params });
  }

  // Update emergency case
  updateEmergencyCase(id: string, caseData: EmergencyCase): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, caseData);
  }

  // Update emergency case status
  updateEmergencyCaseStatus(id: string, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/status`, { status });
  }

  // Add progress note
  addProgressNote(emergencyId: string, note: EmergencyProgressNote): Observable<any> {
    return this.http.post(`${this.apiUrl}/${emergencyId}/progress-note`, note);
  }

  // Get progress notes
  getProgressNotes(emergencyId: string): Observable<EmergencyProgressNote[]> {
    return this.http.get<EmergencyProgressNote[]>(`${this.apiUrl}/${emergencyId}/progress-notes`);
  }

  // Convert emergency to IPD
  convertToIPD(emergencyId: string, admissionData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${emergencyId}/convert-to-ipd`, admissionData);
  }

  // Get emergency queue (pending cases)
  getEmergencyQueue(): Observable<EmergencyCase[]> {
    return this.http.get<EmergencyCase[]>(`${this.apiUrl}/queue/pending`);
  }

  // Get emergency statistics
  getEmergencyStats(fromDate?: string, toDate?: string): Observable<any> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get<any>(`${this.apiUrl}/stats`, { params });
  }
}
