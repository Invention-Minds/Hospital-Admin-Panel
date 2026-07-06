import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.17 — assembled discharge summary context (paper layout).

export interface DischargeContext {
  admission: {
    id: string; admissionNo: string; prn: string | null;
    admissionDate: string; admissionTime: string;
    department: string; admittingDoctor: string; roomType: string;
    ward?: { wardName: string; wardCode: string; floor: string | null } | null;
    bed?: { bedNumber: string } | null;
    diagnosis: string;
  };
  patient: { name: string; age: string | null; gender: string | null; bloodGroup: string | null; mobileNo: string | null } | null;
  allergies: string[];
  initialAssessment: Record<string, unknown> | null;
  discharge: Record<string, unknown> | null;
  otSchedules: Array<{
    id: string; procedureName: string; surgeonName: string | null; anaesthesiologistName: string | null;
    plannedStart: string; actualStart: string | null;
    intraOpNotes: Array<{
      noteNumber: number; startAt: string; endAt: string | null; anaesthesiaType: string | null;
      surgeons: string | null; findings: string | null; procedureDone: string | null; complications: string | null;
    }>;
  }>;
  results: Array<{
    testName: string; department: string; result: string | null; unit: string | null;
    referenceRange: string | null; impression: string | null; reportedAt: string | null; criticalFlag: boolean;
  }>;
}

@Injectable({ providedIn: 'root' })
export class DischargeSummaryService {
  private base = `${environment.apiUrl}/ipd`;
  constructor(private http: HttpClient) {}

  context(admissionId: string): Observable<{ data: DischargeContext }> {
    return this.http.get<{ data: DischargeContext }>(`${this.base}/admission/${admissionId}/discharge-context`);
  }
}
