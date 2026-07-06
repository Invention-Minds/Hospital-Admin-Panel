import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.5b — OT Discharge Summary aggregator service.
//
// Single GET that returns admission + schedules + operative notes +
// progress notes + discharge + diagnosis codes for the tabbed Discharge
// Summary modal launched from the OT workbench.

export interface OtDsAdmission {
  id: string;
  admissionNo: string;
  prn: string;
  admissionDate: string;
  admissionTime: string;
  admissionType: string;
  admittingDoctor: string;
  department: string;
  roomType: string;
  diagnosis: string;
  status: string;
}

export interface OtDsSchedule {
  id: string;
  date: string;
  procedureName: string;
  surgeonName: string | null;
  anaesthesiologistName: string | null;
  otRoom: string | null;
}

export interface OtDsOperativeNote {
  id: string;
  noteNumber: number;
  scheduleId: string;
  scheduleDate: string;
  procedureName: string;
  otRoom: string | null;
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
  caseType: string | null;
  signedAt: string | null;
  signedBy: string | null;
}

export interface OtDsProgressNote {
  id: string;
  date: string;
  doctorName: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface OtDsDischarge {
  id: string;
  dischargeDate: string;
  dischargeTime: string;
  dischargeType: string;
  finalDiagnosis: string;
  proceduresDone: string | null;
  conditionAtDischarge: string;
  dischargeSummary: string;
  followUpDate: string | null;
  followUpDoctor: string | null;
  medications: string;
  advice: string | null;
  summaryStatus: string;
}

export interface OtDsDiagnosisCode {
  id: string;
  admissionId: string;
  category: 'icd-provisional' | 'icd-final' | 'cpt';
  code: string;
  description: string;
}

export interface OtDischargeSummaryResponse {
  data: {
    admission: OtDsAdmission;
    schedules: OtDsSchedule[];
    operativeNotes: OtDsOperativeNote[];
    progressNotes: OtDsProgressNote[];
    discharge: OtDsDischarge | null;
    diagnosisCodes: OtDsDiagnosisCode[];
  };
}

@Injectable({ providedIn: 'root' })
export class OtDischargeSummaryService {
  constructor(private http: HttpClient) {}

  get(admissionId: string): Observable<OtDischargeSummaryResponse> {
    return this.http.get<OtDischargeSummaryResponse>(
      `${environment.apiUrl}/ot/admission/${admissionId}/discharge-summary`,
    );
  }
}
