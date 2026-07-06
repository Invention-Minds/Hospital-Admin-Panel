import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.3b — operative notes by admission (read-only for the DS view).

export interface AdmissionOperativeNote {
  scheduleId: string;
  scheduleDate: string;
  procedureName: string;
  otRoom: string | null;
  scheduleSurgeon: string | null;
  scheduleAnaesthesiologist: string | null;
  id: string;
  noteNumber: number;
  startAt: string;
  endAt: string | null;
  anaesthesiaType: string | null;
  surgeons: string | null;
  assistants: string | null;
  preOpDiagnosis: string | null;
  postOpDiagnosis: string | null;
  postOpDiagnosisSame: boolean;
  findings: string | null;
  procedureDone: string | null;
  procedureSteps: string | null;
  position: string | null;
  incision: string | null;
  bloodLossMl: number | null;
  fluidsMl: number | null;
  complications: string | null;
  significantIntraOpEvent: string | null;
  drains: string | null;
  implants: string | null;
  prosthesisLabel: string | null;
  disposition: string | null;
  signedAt: string | null;
  signedBy: string | null;
}

@Injectable({ providedIn: 'root' })
export class OtOperativeNotesService {
  constructor(private http: HttpClient) {}

  byAdmission(admissionId: string): Observable<{ data: AdmissionOperativeNote[]; schedules: number; notes: number }> {
    return this.http.get<{ data: AdmissionOperativeNote[]; schedules: number; notes: number }>(
      `${environment.apiUrl}/ot/admission/${admissionId}/operative-notes`);
  }
}
