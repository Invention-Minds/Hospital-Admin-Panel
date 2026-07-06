import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
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
  // Phase 9.6 — ICU stay tracking
  icuAdmittedAt?: string | null;
  icuDischargedAt?: string | null;
  priorIcuDischargeAt?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  // Phase 9.15 — joined discharge row (only present for status=discharged).
  discharge?: {
    id: string;
    dischargeDate: string;
    dischargeTime?: string;
    dischargeType?: string;
    conditionAtDischarge?: string;
    summaryStatus?: string;
  } | null;
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
  // Phase 9.13 — optional re-order of the vitals monitoring frequency.
  vitalsMonitoringFrequency?: string | null;
}

/**
 * Phase 6 (WF-5) — discharge medication shape.
 * Field names mirror the AI service output and the IpdPrescription columns
 * (`genericName`, `brandName`, `dose`, `route`, `frequency`, `duration`).
 */
export interface DischargeMedication {
  genericName: string;
  brandName?: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export type DischargeSummaryStatus =
  | 'NONE'
  | 'DRAFTED'
  | 'EDITED'
  | 'SIGNED'
  | 'DELIVERED';

export interface IpdDischarge {
  id?: string;
  admissionId: string;
  dischargeDate: Date | string;
  dischargeTime: string;
  dischargeType: 'regular' | 'LAMA' | 'transfer' | 'expired';
  finalDiagnosis: string;
  proceduresDone?: string;
  conditionAtDischarge: string;
  dischargeSummary: string;
  followUpDate?: Date | string | null;
  followUpDoctor?: string;
  medications: DischargeMedication[] | string; // backend stores LongText JSON
  advice?: string;
  hmisDischargeId?: string;

  // Phase 6 (WF-5) — AI draft + sign-off chain. Field names mirror schema columns.
  summaryStatus?: DischargeSummaryStatus;
  aiDraftJson?: string | null;
  aiDraftedAt?: string | null;
  aiDraftedByModel?: string | null;
  clinicianSignatureId?: string | null;
  clinicianSignedAt?: string | null;
  clinicianSignedBy?: string | null;
  clinicianSignedById?: number | null;
  attenderAcknowledgmentSignatureId?: string | null;
  attenderAcknowledgedAt?: string | null;
  attenderName?: string | null;
  attenderRelation?: string | null;

  // Note-template integration. Backend stores `templatedValues` as a JSON
  // string `{_schema: [...frozen fields], _values: {key: value}}`. The
  // discharge component parses + writes via the dynamic renderer.
  noteTemplateId?: string | null;
  templatedValues?: string | null;
}

/** Edit-payload shape — every field is optional so partial updates are allowed. */
export interface EditDischargePayload {
  finalDiagnosis?: string;
  proceduresDone?: string;
  conditionAtDischarge?: string;
  dischargeSummary?: string;
  medications?: DischargeMedication[];
  advice?: string;
  followUpDate?: string;
  followUpDoctor?: string;
  dischargeType?: IpdDischarge['dischargeType'];
  // Templated path — sent alongside (or instead of) the legacy fields above.
  noteTemplateId?: string;
  templatedValueMap?: Record<string, unknown>;
}

export interface SignDischargePayload {
  clinicianSignatureId: string;
  clinicianSignedBy?: string;
}

export interface AttenderAckDischargePayload {
  attenderName: string;
  attenderRelation: string;
  attenderAcknowledgmentSignatureId: string;
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

  // Get all admissions. Backend wraps results in `{ data, pagination }` and
  // defaults limit=10, so unwrap and request a wide page for picker dropdowns.
  getAllAdmissions(): Observable<IpdAdmission[]> {
    const params = new HttpParams().set('limit', '500');
    return this.http
      .get<{ data: IpdAdmission[]; pagination?: unknown } | IpdAdmission[]>(
        `${this.apiUrl}/admissions`,
        { params },
      )
      .pipe(map((res) => (Array.isArray(res) ? res : res?.data ?? [])));
  }

  /** Phase 9.6 — list admissions currently in ICU (icuAdmittedAt set + not yet stepped down). */
  getInIcuAdmissions(): Observable<IpdAdmission[]> {
    const params = new HttpParams().set('limit', '500').set('inIcu', '1');
    return this.http
      .get<{ data: IpdAdmission[]; pagination?: unknown } | IpdAdmission[]>(
        `${this.apiUrl}/admissions`,
        { params },
      )
      .pipe(map((res) => (Array.isArray(res) ? res : res?.data ?? [])));
  }

  // Get admission by ID
  getAdmission(id: string): Observable<IpdAdmission> {
    return this.http.get<IpdAdmission>(`${this.apiUrl}/admission/${id}`);
  }

  // Get admissions by PRN. Same wrapped response as getAllAdmissions.
  getAdmissionsByPrn(prn: string): Observable<IpdAdmission[]> {
    const params = new HttpParams().set('prn', prn).set('limit', '500');
    return this.http
      .get<{ data: IpdAdmission[]; pagination?: unknown } | IpdAdmission[]>(
        `${this.apiUrl}/admissions`,
        { params },
      )
      .pipe(map((res) => (Array.isArray(res) ? res : res?.data ?? [])));
  }

  // Get active admissions
  getActiveAdmissions(): Observable<IpdAdmission[]> {
    // The /admissions endpoint paginates with a default limit of 10. The IPD
    // Active Admissions tab has no pager UI — it shows the whole list — so
    // request a high limit to pull every admitted patient.
    const params = new HttpParams().set('status', 'admitted').set('limit', '500');
    return this.http.get<IpdAdmission[]>(`${this.apiUrl}/admissions`, { params });
  }

  // Phase 9.15 — discharged-patient list for the IPD overview "Discharges"
  // tab. Same endpoint, status=discharged; high limit (no pager UI).
  getDischargedAdmissions(): Observable<IpdAdmission[]> {
    const params = new HttpParams().set('status', 'discharged').set('limit', '500');
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

  // ─── Phase 6 (WF-5) — AI-drafted discharge chain ───────────────────────
  // All endpoints share the /api/ipd/admission/:admissionId/discharge prefix
  // so the existing PDF and getDischarge calls continue to work unchanged.

  /** POST .../discharge/ai-draft — invoke the model, returns the persisted draft row. */
  /**
   * Generate AI draft. Pass `noteTemplateId` when the doctor has picked a
   * template — the backend constrains the model's JSON output to the
   * template's field keys instead of the legacy schema.
   */
  generateDischargeAiDraft(
    admissionId: string,
    noteTemplateId?: string,
  ): Observable<IpdDischarge> {
    return this.http.post<IpdDischarge>(
      `${this.apiUrl}/admission/${admissionId}/discharge/ai-draft`,
      noteTemplateId ? { noteTemplateId } : {},
    );
  }

  /** PUT .../discharge/edit — clinician saves edits while DRAFTED/EDITED. */
  editDischarge(admissionId: string, payload: EditDischargePayload): Observable<IpdDischarge> {
    return this.http.put<IpdDischarge>(
      `${this.apiUrl}/admission/${admissionId}/discharge/edit`,
      payload,
    );
  }

  /** POST .../discharge/sign — clinician e-signs, locks the row, frees the bed. */
  signDischarge(admissionId: string, payload: SignDischargePayload): Observable<IpdDischarge> {
    return this.http.post<IpdDischarge>(
      `${this.apiUrl}/admission/${admissionId}/discharge/sign`,
      payload,
    );
  }

  /** POST .../discharge/attender-ack — attender confirms receipt of the printed summary. */
  recordDischargeAttenderAck(
    admissionId: string,
    payload: AttenderAckDischargePayload,
  ): Observable<IpdDischarge> {
    return this.http.post<IpdDischarge>(
      `${this.apiUrl}/admission/${admissionId}/discharge/attender-ack`,
      payload,
    );
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
