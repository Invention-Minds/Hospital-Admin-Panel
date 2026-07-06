import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * IPD per-admission Hand-off service (Phase 3 SBAR).
 *
 * Two endpoint groups:
 *   • CRUD on the handover row itself.
 *   • `pull(date, shift)` — live aggregation. Returns the auto-populated
 *     context (drugs given, drugs due, vitals trend, I/O totals, current
 *     problems from the initial assessment). Always fresh on every call.
 */

export type HandoverStatus = 'DRAFT' | 'HANDED_OVER' | 'ACKNOWLEDGED';
export type Shift = 'M' | 'E' | 'N';

export interface IpdHandover {
  id: string;
  admissionId: string;
  chartDate: string;
  shift: Shift;

  postOpDay: number | null;
  diet: string | null;
  ventilation: string | null;
  invasiveLines: string | null;

  infusionsTransfusions: string | null;
  puProphylaxis: string | null;
  dvtProphylaxis: string | null;
  painScale: number | null;
  gcsLoc: string | null;
  skinIntegrity: string | null;
  restraints: string | null;
  fallRisk: string | null;
  adl: string | null;
  ambulation: string | null;
  criticalLabValues: string | null;
  currentProblems: string | null;

  investigationsOrdered: string | null;
  reportsPending: string | null;
  referrals: string | null;
  nextShiftPriorities: string | null;

  handedOverById: number | null;
  handedOverByName: string | null;
  handedOverBySignatureId: string | null;
  handedOverAt: string | null;
  takenOverById: number | null;
  takenOverByName: string | null;
  takenOverBySignatureId: string | null;
  takenOverAt: string | null;

  status: HandoverStatus;
  createdAt: string;
  updatedAt: string;
}

export type HandoverUpsertPayload = Partial<Omit<IpdHandover,
  'id' | 'admissionId' | 'status' | 'createdAt' | 'updatedAt'
  | 'handedOverById' | 'handedOverByName' | 'handedOverBySignatureId' | 'handedOverAt'
  | 'takenOverById' | 'takenOverByName' | 'takenOverBySignatureId' | 'takenOverAt'
>> & { chartDate: string; shift: Shift };

export interface HandoverPull {
  admissionId: string;
  date: string;
  shift: Shift;
  shiftWindow: { start: string; end: string };
  admission: {
    admissionNo: string;
    prn: string;
    diagnosis: string;
    department: string;
    admittingDoctor: string;
    admissionDate: string;
    bed: { bedNumber: string } | null;
    ward: { wardName: string; wardCode: string } | null;
  } | null;
  allergies: {
    drug: boolean;
    food: boolean;
    transfusion: boolean;
    others: string | null;
  } | null;
  coMorbidities: string[];
  problemsAtAdmission: string | null;
  provisionalDiagnosis: string | null;
  medsGivenInShift: Array<{
    id: string;
    administeredAt: string;
    administeredBy: string;
    route: string;
    quantity: number;
    drug: { genericName: string; brandName: string | null; dose: string; route: string } | null;
    remarks: string | null;
  }>;
  activePrescriptions: Array<{
    id: string;
    genericName: string;
    brandName: string | null;
    dose: string;
    frequency: string;
    route: string;
    nextAdminTime: string | null;
    adminStatus: string;
    prescriptionType: string | null;
  }>;
  vitalsToday: Array<{
    recordedAt: string;
    shift: string | null;
    temperatureF: number | null;
    temperatureC: number | null;
    pulse: number | null;
    respiration: number | null;
    bpSystolic: number | null;
    bpDiastolic: number | null;
    spo2: number | null;
    painScore: number | null;
  }>;
  intakeTotalMl: number;
  outputTotalMl: number;
}

@Injectable({ providedIn: 'root' })
export class IpdHandoverService {
  private base = `${environment.apiUrl}/ipd`;

  constructor(private http: HttpClient) {}

  list(admissionId: string, from?: string, to?: string): Observable<IpdHandover[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<IpdHandover[]>(`${this.base}/admission/${admissionId}/handovers`, { params });
  }

  upsert(admissionId: string, payload: HandoverUpsertPayload): Observable<IpdHandover> {
    return this.http.post<IpdHandover>(`${this.base}/admission/${admissionId}/handover`, payload);
  }

  signHandedOver(admissionId: string, id: string, body: { signatureId: string; nurseName?: string }): Observable<IpdHandover> {
    return this.http.post<IpdHandover>(`${this.base}/admission/${admissionId}/handover/${id}/sign-handed-over`, body);
  }

  signTakenOver(admissionId: string, id: string, body: { signatureId: string; nurseName?: string }): Observable<IpdHandover> {
    return this.http.post<IpdHandover>(`${this.base}/admission/${admissionId}/handover/${id}/sign-taken-over`, body);
  }

  pull(admissionId: string, date: string, shift: Shift): Observable<HandoverPull> {
    const params = new HttpParams().set('date', date).set('shift', shift);
    return this.http.get<HandoverPull>(`${this.base}/admission/${admissionId}/handover-pull`, { params });
  }
}
