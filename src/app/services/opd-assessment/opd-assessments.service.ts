import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';
@Injectable({
  providedIn: 'root'
})
export class OpdAssessmentsService {


  apiUrl: string = `${environment.apiUrl}/opd`;

  constructor(private http: HttpClient) {}

  saveAssessment(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getAssessmentById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  updateAssessment(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }
  getAssessmentByAppointmentId(appointmentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/by-appointment/${appointmentId}`);
  }

  /**
   * Phase 9.21 — AI auto-fill of the selected note template from the doctor's
   * dictation. Returns { templatedValueMap, modelVersion, generatedAt }.
   */
  aiDraft(payload: {
    noteTemplateId: string;
    dictation: string;
    header?: { name?: string | null; age?: string | null; gender?: string | null; vitals?: string | null };
  }): Observable<{ templatedValueMap: Record<string, unknown>; modelVersion: string; generatedAt: string }> {
    return this.http.post<{ templatedValueMap: Record<string, unknown>; modelVersion: string; generatedAt: string }>(
      `${this.apiUrl}/ai-draft`, payload,
    );
  }

  /**
   * Sprint 3f — admit OPD patient to IPD via convertOpdToIpd helper.
   * POST /api/opd/admit-to-ipd returns { ipdAdmission, pendingPrescriptions, pendingInvestigations }.
   */
  admitToIpd(payload: {
    appointmentId: number;
    wardId: string;
    bedId: string;
    admittingDoctorId: number | null;
    admittingDoctorName: string;
    admissionType: 'elective' | 'emergency' | 'transfer' | 'routine';
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/admit-to-ipd`, payload);
  }

  /**
   * Phase 3 (WF-2) — refer this OPD patient for admission. Creates a PROPOSED
   * IpdAdmission + a REQUESTED IpdBedRequest visible in the NS queue. The
   * patient is NOT 'admitted' until NS accepts and the attender signs at the
   * bedside.
   */
  referForAdmission(payload: {
    appointmentId: number;
    diagnosis: string;
    urgency: 'routine' | 'urgent' | 'emergency';
    preferredBedType?: string;
    preferredWardId?: string;
    admittingDoctorId?: number | null;
    admittingDoctorName: string;
    admissionType?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/refer-for-admission`, payload);
  }
}
