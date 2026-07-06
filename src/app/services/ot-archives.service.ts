import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.5c — OT Archives service (patient profile view).

export interface ArchivesPatient {
  prn: number;
  name: string;
  age: string | null;
  gender: string | null;
  contactNo: string | null;
  mobileNo: string | null;
  email: string | null;
  address: string | null;
  patientType: string | null;
  bloodGroup: string | null;
}

export interface ArchivesOpVisit {
  id: number;
  date: string;
  time: string;
  doctorName: string;
  department: string;
  status: string;
  type: string | null;
}

export interface ArchivesIpVisit {
  id: string;
  admissionNo: string;
  admissionDate: string;
  admissionTime: string;
  admissionType: string;
  admittingDoctor: string;
  department: string;
  roomType: string;
  status: string;
  diagnosis: string;
}

export interface ArchivesReport {
  id: number;
  orderId: number;
  testName: string;
  department: string;
  status: string;
  result: string | null;
  unit: string | null;
  referenceRange: string | null;
  criticalFlag: boolean;
  reportUrl: string | null;
  reportedAt: string | null;
  createdAt: string;
}

export interface ArchivesSurgery {
  id: string;
  date: string;
  procedureName: string;
  surgeonName: string | null;
  anaesthesiologistName: string | null;
  urgency: string;
  status: string;
  otRoom: string | null;
}

export interface ArchivesDischarge {
  id: string;
  admissionId: string;
  dischargeDate: string;
  dischargeType: string;
  finalDiagnosis: string;
  conditionAtDischarge: string;
  summaryStatus: string;
}

export interface OtArchivesResponse {
  data: {
    patient: ArchivesPatient | null;
    opVisits: ArchivesOpVisit[];
    ipVisits: ArchivesIpVisit[];
    labReports: ArchivesReport[];
    radiologyReports: ArchivesReport[];
    surgicalHistory: ArchivesSurgery[];
    discharges: ArchivesDischarge[];
  };
  meta: { from: string; to: string; prn: string };
}

@Injectable({ providedIn: 'root' })
export class OtArchivesService {
  constructor(private http: HttpClient) {}

  get(prn: string, opts?: { fromDate?: string; toDate?: string; reportLimit?: number }): Observable<OtArchivesResponse> {
    let params = new HttpParams();
    if (opts?.fromDate) params = params.set('fromDate', opts.fromDate);
    if (opts?.toDate) params = params.set('toDate', opts.toDate);
    if (opts?.reportLimit) params = params.set('reportLimit', String(opts.reportLimit));
    return this.http.get<OtArchivesResponse>(`${environment.apiUrl}/ot/patient/${prn}/archives`, { params });
  }
}
