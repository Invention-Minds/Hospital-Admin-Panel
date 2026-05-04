import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environment/environment.prod';

export interface EmergencyCase {
  id?: string;
  prn: string;
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
  status: string;
  docmindsCreated: boolean;
  hmisCreated: boolean;
  createdAt?: Date;
  updatedAt?: Date;
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

  // Get all emergency cases
  getAllEmergencyCases(): Observable<EmergencyCase[]> {
    return this.http.get<EmergencyCase[]>(`${this.apiUrl}/`);
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
