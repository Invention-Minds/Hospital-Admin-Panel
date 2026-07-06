import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Phase 11 — OT workflow service.
 *
 * Field names mirror the backend OtSchedule / OtPreOpChecklist /
 * OtSafetyChecklist / OtIntraOpNote / OtAnaesthesiaChart / PacuRecord /
 * OtOutcome schema columns 1:1.
 */

export type OtRoomType = 'major' | 'minor' | 'cath-lab' | 'endoscopy';
export type OtRoomStatus = 'available' | 'in-use' | 'cleaning' | 'maintenance';
export type OtScheduleStatus =
  | 'BOOKED' | 'CONFIRMED' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELLED' | 'RESCHEDULED';
export type OtUrgency = 'elective' | 'urgent' | 'emergency';

export interface OtRoom {
  id: string;
  name: string;
  code: string;
  type: OtRoomType;
  equipmentClass?: string | null;
  hepaFiltered: boolean;
  status: OtRoomStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OtSchedule {
  id: string;
  otRoomId: string;
  estimationId?: string | null;
  admissionId?: string | null;
  prn?: string | null;
  patientName?: string | null;
  date: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  surgeonId?: number | null;
  surgeonName?: string | null;
  anaesthesiologistId?: number | null;
  anaesthesiologistName?: string | null;
  scrubNurseId?: number | null;
  scrubNurseName?: string | null;
  runnerId?: number | null;
  runnerName?: string | null;
  procedureName: string;
  procedureCode?: string | null;
  urgency: OtUrgency;
  status: OtScheduleStatus;
  cancelReason?: string | null;
  rescheduledFromId?: string | null;

  // Phase 9.1a — track-sheet timestamps + requisition link
  otAdmissionAt?: string | null;
  otDischargeAt?: string | null;
  inductionAt?: string | null;
  extubationAt?: string | null;
  requisitionId?: string | null;

  otRoom?: OtRoom;
  preOpChecklist?: OtPreOpChecklist | null;
  safetyChecklist?: OtSafetyChecklist | null;
  // Phase 9.1c — relation became 1:N (multi-surgery → multi-note).
  // Backend returns `intraOpNotes` (plural). Legacy field name kept as a
  // computed convenience on the frontend by adopt() when needed.
  intraOpNotes?: OtIntraOpNote[];
  anaesthesiaChart?: OtAnaesthesiaTick[];
  pacuRecord?: PacuRecord | null;
  outcome?: OtOutcome | null;
}

export interface OtPreOpChecklist {
  id: string;
  scheduleId: string;
  fasting: boolean;
  fastingHours?: number | null;
  consentSignatureId?: string | null;
  groupTyped: boolean;
  crossMatched: boolean;
  bloodReservedUnits?: number | null;
  internalUnitsReserved?: number | null;
  externalUnitsReserved?: number | null;
  preOpHemoglobin?: number | null;
  surgeryClass?: string | null;
  anticipatedBloodLossMl?: number | null;
  antibioticPlanned: boolean;
  antibioticName?: string | null;
  prophylaxisGiven: boolean;
  surgicalSiteMarked: boolean;
  allergiesReviewed: boolean;
  allergiesNote?: string | null;
  fitnessCleared: boolean;
  fitnessClearedBy?: string | null;
  preAnaesthesiaNotes?: string | null;
  signedAt?: string | null;
  signedBy?: string | null;
  signatureId?: string | null;
}

export interface OtSafetyChecklist {
  id: string;
  scheduleId: string;
  signInAt?: string | null;
  signInBy?: string | null;
  signInSignatureId?: string | null;
  patientIdentityConfirmed: boolean;
  siteMarked: boolean;
  anaesthesiaSafetyChecked: boolean;
  pulseOximeterFunctional: boolean;
  knownAllergies: boolean;
  difficultAirwayRisk: boolean;
  bloodLossRisk: boolean;
  timeOutAt?: string | null;
  timeOutBy?: string | null;
  timeOutSignatureId?: string | null;
  teamIntroduced: boolean;
  procedureConfirmed: boolean;
  antibioticAdministered: boolean;
  imagingDisplayed: boolean;
  criticalEventsAnticipated: boolean;
  signOutAt?: string | null;
  signOutBy?: string | null;
  signOutSignatureId?: string | null;
  procedureRecordedName?: string | null;
  swabCount: boolean;
  swabCountInitial?: number | null;
  swabCountFinal?: number | null;
  instrumentCount: boolean;
  instrumentCountInitial?: number | null;
  instrumentCountFinal?: number | null;
  specimenLabelled: boolean;
  equipmentIssues?: string | null;
  recoveryConcerns?: string | null;
  // Phase 9.4b — multi-role chain (surgeon legacy + anaesthetist/nurse/technician)
  signInAnaesthetistAt?: string | null;
  signInAnaesthetistBy?: string | null;
  signInAnaesthetistSignatureId?: string | null;
  signInNurseAt?: string | null;
  signInNurseBy?: string | null;
  signInNurseSignatureId?: string | null;
  signInTechnicianAt?: string | null;
  signInTechnicianBy?: string | null;
  signInTechnicianSignatureId?: string | null;
  timeOutAnaesthetistAt?: string | null;
  timeOutAnaesthetistBy?: string | null;
  timeOutAnaesthetistSignatureId?: string | null;
  timeOutNurseAt?: string | null;
  timeOutNurseBy?: string | null;
  timeOutNurseSignatureId?: string | null;
  timeOutTechnicianAt?: string | null;
  timeOutTechnicianBy?: string | null;
  timeOutTechnicianSignatureId?: string | null;
  signOutAnaesthetistAt?: string | null;
  signOutAnaesthetistBy?: string | null;
  signOutAnaesthetistSignatureId?: string | null;
  signOutNurseAt?: string | null;
  signOutNurseBy?: string | null;
  signOutNurseSignatureId?: string | null;
  signOutTechnicianAt?: string | null;
  signOutTechnicianBy?: string | null;
  signOutTechnicianSignatureId?: string | null;
  // Phase 9.1c — UHJ/OTS/F-01 additions
  consentConfirmed?: boolean;
  preopMedicationTaken?: boolean;
  anaesthEquipSpo2?: boolean;
  anaesthEquipNibp?: boolean;
  anaesthEquipEcg?: boolean;
  anaesthEquipBis?: boolean;
  hypothermiaRisk?: boolean;
  warmerInPlace?: boolean;
  equipmentImplantsAvailable?: boolean;
  allergyDescription?: string | null;
  bloodLossArrangement?: string | null;
  airwayRiskArrangement?: string | null;
  antibioticName?: string | null;
  vteProphylaxisProvided?: boolean;
  anticipatedDurationMins?: number | null;
  anticipatedBloodLossMl?: number | null;
  bloodAvailable?: boolean;
  glycemicControl?: string | null;
  sterilityConcerns?: string | null;
  anaesthetistConcerns?: string | null;
  correctiveAction?: string | null;
  // Phase 9.12 — UHJ Nursing Safety Checklist additions
  fastingStatusConfirmed?: boolean;
  ivLineSecured?: boolean;
  bloodAvailabilityChecked?: boolean;
  correctPatientConfirmed?: boolean;
  correctSiteConfirmed?: boolean;
  sterilityConfirmed?: boolean;
  instrumentsAvailable?: boolean;
  spongeNeedleCountDone?: boolean;
  procedureCompletedConfirmed?: boolean;
  postOpInstructionsGiven?: boolean;
  patientShiftedSafely?: boolean;
}

export interface OtImplant {
  name: string;
  batch: string;
  serial?: string;
  manufacturer?: string;
}

export interface OtIntraOpNote {
  id: string;
  scheduleId: string;
  // Phase 9.1c — multi-note support
  noteNumber: number;
  templateId?: string | null;
  startAt: string;
  endAt?: string | null;
  anaesthesiaType?: string | null;
  surgeons?: string | null;
  findings?: string | null;
  procedureDone?: string | null;
  bloodLossMl?: number | null;
  fluidsMl?: number | null;
  complications?: string | null;
  implants?: string | null;
  signedAt?: string | null;
  signedBy?: string | null;
  signatureId?: string | null;
  // Phase 9.1c — UHJ/OTS/F-03 additions
  caseType?: 'emergency' | 'routine' | 'unplanned-return' | null;
  assistants?: string | null; // JSON
  preOpDiagnosis?: string | null;
  postOpDiagnosis?: string | null;
  postOpDiagnosisSame?: boolean;
  materialToLabHpe?: string | null;
  materialToLabCis?: string | null;
  materialToLabOthers?: string | null;
  materialToSecurityMlc?: string | null;
  drains?: string | null;
  prosthesisLabel?: string | null;
  significantIntraOpEvent?: string | null;
  position?: string | null;
  incision?: string | null;
  procedureSteps?: string | null;
  incisionAt?: string | null;
  woundClosureAt?: string | null;
  woundClosureDone?: boolean;
  skinClosureDone?: boolean;
  spongeInstrumentCountVerified?: boolean;
  disposition?: 'icu' | 'patient-room' | 'home' | null;
}

export interface OtAnaesthesiaTick {
  id: string;
  scheduleId: string;
  timestamp: string;
  hr?: number | null;
  sbp?: number | null;
  dbp?: number | null;
  spo2?: number | null;
  etco2?: number | null;
  drugs?: string | null;
  fluids?: string | null;
  remarks?: string | null;
  recordedBy?: string | null;
}

export interface PacuVital {
  id: string;
  pacuRecordId: string;
  timestamp: string;
  hr?: number | null;
  sbp?: number | null;
  dbp?: number | null;
  spo2?: number | null;
  rr?: number | null;
  temp?: number | null;
  painScore?: number | null;
  recordedBy?: string | null;
}

export interface PacuRecord {
  id: string;
  scheduleId: string;
  arrivalAt?: string | null;
  dischargedAt?: string | null;
  dischargedTo?: string | null;
  dischargedToWardId?: string | null;
  dischargedToBedId?: string | null;
  arrivalHr?: number | null;
  arrivalSbp?: number | null;
  arrivalDbp?: number | null;
  arrivalSpo2?: number | null;
  arrivalRr?: number | null;
  arrivalTemp?: number | null;
  arrivalGcs?: number | null;
  painScore?: number | null;
  dischargeCriteria?: string | null;
  dischargeCriteriaMet: boolean;
  signedBy?: string | null;
  signatureId?: string | null;
  vitals?: PacuVital[];
}

export interface OtOutcome {
  id: string;
  scheduleId: string;
  unplannedReturn: boolean;
  linkedScheduleId?: string | null;
  surgicalSiteInfection: boolean;
  ssiDetectedAt?: string | null;
  ssiOrganism?: string | null;
  ssiClassification?: string | null;
  mortality: boolean;
  mortalityCause?: string | null;
  lengthOfStayDays?: number | null;
  followUpNotes?: string | null;
  recordedAt: string;
  recordedBy?: string | null;
}

export interface OtKpis {
  fromDate: string;
  toDate: string;
  totalSchedules: number;
  utilisation: { totalRoomMinutes: number; usedMinutes: number; percentage: number };
  onTimeStart: { onTime: number; total: number; percentage: number };
  turnoverTime: { averageMinutes: number; samples: number };
  rescheduleRate: { rescheduled: number; total: number; percentage: number };
  unplannedReturnRate: { returned: number; total: number; percentage: number };
  ssiRate: { withSsi: number; total: number; percentage: number };
  checklistAdherence: { adherent: number; total: number; percentage: number };
}

export interface CreateSchedulePayload {
  otRoomId: string;
  estimationId?: string;
  admissionId?: string;
  prn?: string;
  patientName?: string;
  date: string;
  plannedStart: string;
  plannedEnd: string;
  surgeonName?: string;
  anaesthesiologistName?: string;
  scrubNurseName?: string;
  runnerName?: string;
  procedureName: string;
  procedureCode?: string;
  urgency?: OtUrgency;
  /** Phase 9.1a — when set, the backend flips this requisition to 'scheduled'. */
  requisitionId?: string;
}

export interface SignInPayload {
  patientIdentityConfirmed: boolean;
  siteMarked: boolean;
  anaesthesiaSafetyChecked: boolean;
  pulseOximeterFunctional: boolean;
  knownAllergies: boolean;
  difficultAirwayRisk: boolean;
  bloodLossRisk: boolean;
  signInBy: string;
  signInSignatureId: string;
  // Phase 9.2 — UHJ/OTS/F-01 additions
  consentConfirmed?: boolean;
  preopMedicationTaken?: boolean;
  anaesthEquipSpo2?: boolean;
  anaesthEquipNibp?: boolean;
  anaesthEquipEcg?: boolean;
  anaesthEquipBis?: boolean;
  hypothermiaRisk?: boolean;
  warmerInPlace?: boolean;
  equipmentImplantsAvailable?: boolean;
  allergyDescription?: string;
  bloodLossArrangement?: string;
  airwayRiskArrangement?: string;
  // Phase 9.12 — UHJ Nursing Safety Checklist additions
  fastingStatusConfirmed?: boolean;
  ivLineSecured?: boolean;
  bloodAvailabilityChecked?: boolean;
}

export interface TimeOutPayload {
  teamIntroduced: boolean;
  procedureConfirmed: boolean;
  antibioticAdministered: boolean;
  imagingDisplayed: boolean;
  criticalEventsAnticipated: boolean;
  timeOutBy: string;
  timeOutSignatureId: string;
  // Phase 9.2 — UHJ/OTS/F-01 additions
  antibioticName?: string;
  vteProphylaxisProvided?: boolean;
  anticipatedDurationMins?: number;
  anticipatedBloodLossMl?: number;
  bloodAvailable?: boolean;
  glycemicControl?: string;
  sterilityConcerns?: string;
  anaesthetistConcerns?: string;
  // Phase 9.12 — UHJ Nursing Safety Checklist additions
  correctPatientConfirmed?: boolean;
  correctSiteConfirmed?: boolean;
  sterilityConfirmed?: boolean;
  instrumentsAvailable?: boolean;
  spongeNeedleCountDone?: boolean;
}

export interface SignOutPayload {
  procedureRecordedName: string;
  swabCount: boolean;
  swabCountInitial?: number;
  swabCountFinal?: number;
  instrumentCount: boolean;
  instrumentCountInitial?: number;
  instrumentCountFinal?: number;
  specimenLabelled: boolean;
  equipmentIssues?: string;
  recoveryConcerns?: string;
  signOutBy: string;
  signOutSignatureId: string;
  // Phase 9.2 — UHJ/OTS/F-01 addition
  correctiveAction?: string;
  // Phase 9.12 — UHJ Nursing Safety Checklist additions
  procedureCompletedConfirmed?: boolean;
  postOpInstructionsGiven?: boolean;
  patientShiftedSafely?: boolean;
}

@Injectable({ providedIn: 'root' })
export class OtWorkflowService {
  private apiUrl = `${environment.apiUrl}/ot`;

  constructor(private http: HttpClient) {}

  // ─── Rooms ──────────────────────────────────────────────────────────
  listRooms(filters?: { status?: OtRoomStatus }): Observable<OtRoom[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<OtRoom[]>(`${this.apiUrl}/rooms`, { params });
  }
  createRoom(payload: { name: string; code: string; type: OtRoomType; equipmentClass?: string; hepaFiltered?: boolean }): Observable<OtRoom> {
    return this.http.post<OtRoom>(`${this.apiUrl}/rooms`, payload);
  }
  updateRoomStatus(id: string, status: OtRoomStatus): Observable<OtRoom> {
    return this.http.put<OtRoom>(`${this.apiUrl}/rooms/${id}/status`, { status });
  }

  // ─── Schedules ──────────────────────────────────────────────────────
  listSchedules(filters?: {
    date?: string;
    status?: OtScheduleStatus;
    otRoomId?: string;
    prn?: string;
    excludeId?: string;
  }): Observable<OtSchedule[]> {
    let params = new HttpParams();
    if (filters?.date) params = params.set('date', filters.date);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.otRoomId) params = params.set('otRoomId', filters.otRoomId);
    if (filters?.prn) params = params.set('prn', filters.prn);
    if (filters?.excludeId) params = params.set('excludeId', filters.excludeId);
    return this.http.get<OtSchedule[]>(`${this.apiUrl}/schedules`, { params });
  }
  getSchedule(id: string): Observable<OtSchedule> {
    return this.http.get<OtSchedule>(`${this.apiUrl}/schedules/${id}`);
  }
  createSchedule(payload: CreateSchedulePayload): Observable<OtSchedule> {
    return this.http.post<OtSchedule>(`${this.apiUrl}/schedules`, payload);
  }
  updateSchedule(id: string, payload: Partial<CreateSchedulePayload>): Observable<OtSchedule> {
    return this.http.put<OtSchedule>(`${this.apiUrl}/schedules/${id}`, payload);
  }
  cancelSchedule(id: string, cancelReason: string): Observable<OtSchedule> {
    return this.http.post<OtSchedule>(`${this.apiUrl}/schedules/${id}/cancel`, { cancelReason });
  }
  rescheduleSchedule(id: string, payload: { date: string; plannedStart: string; plannedEnd: string; cancelReason: string }): Observable<OtSchedule> {
    return this.http.post<OtSchedule>(`${this.apiUrl}/schedules/${id}/reschedule`, payload);
  }
  startSchedule(id: string): Observable<OtSchedule> {
    return this.http.post<OtSchedule>(`${this.apiUrl}/schedules/${id}/start`, {});
  }
  endSchedule(id: string): Observable<OtSchedule> {
    return this.http.post<OtSchedule>(`${this.apiUrl}/schedules/${id}/end`, {});
  }

  // ─── Pre-op ────────────────────────────────────────────────────────
  upsertPreOp(scheduleId: string, payload: Partial<OtPreOpChecklist>): Observable<OtPreOpChecklist> {
    return this.http.put<OtPreOpChecklist>(`${this.apiUrl}/schedules/${scheduleId}/pre-op`, payload);
  }

  // ─── WHO Safety Checklist ─────────────────────────────────────────
  signIn(scheduleId: string, payload: SignInPayload): Observable<OtSafetyChecklist> {
    return this.http.post<OtSafetyChecklist>(`${this.apiUrl}/schedules/${scheduleId}/safety/sign-in`, payload);
  }
  timeOut(scheduleId: string, payload: TimeOutPayload): Observable<OtSafetyChecklist> {
    return this.http.post<OtSafetyChecklist>(`${this.apiUrl}/schedules/${scheduleId}/safety/time-out`, payload);
  }
  signOut(scheduleId: string, payload: SignOutPayload): Observable<OtSafetyChecklist> {
    return this.http.post<OtSafetyChecklist>(`${this.apiUrl}/schedules/${scheduleId}/safety/sign-out`, payload);
  }
  /** Phase 9.4b — multi-role chain: phase × role × signatureId. */
  signSafetyRole(
    scheduleId: string,
    phase: 'signIn' | 'timeOut' | 'signOut',
    role: 'surgeon' | 'anaesthetist' | 'nurse' | 'technician',
    payload: { signatureId: string; signerName: string },
  ): Observable<OtSafetyChecklist> {
    return this.http.post<OtSafetyChecklist>(
      `${this.apiUrl}/schedules/${scheduleId}/safety/${phase}/sign/${role}`,
      payload,
    );
  }

  // ─── Intra-op ──────────────────────────────────────────────────────
  upsertIntraOp(scheduleId: string, payload: {
    startAt: string;
    endAt?: string;
    anaesthesiaType?: string;
    surgeons?: string;
    findings?: string;
    procedureDone?: string;
    bloodLossMl?: number;
    fluidsMl?: number;
    complications?: string;
    implants?: OtImplant[];
    signatureId?: string;
    // Phase 9.2 — UHJ/OTS/F-03 additions
    noteNumber?: number;
    templateId?: string | null;
    caseType?: 'emergency' | 'routine' | 'unplanned-return' | null;
    assistants?: Array<{ name: string; role?: string }>;
    preOpDiagnosis?: string;
    postOpDiagnosis?: string;
    postOpDiagnosisSame?: boolean;
    materialToLabHpe?: string;
    materialToLabCis?: string;
    materialToLabOthers?: string;
    materialToSecurityMlc?: string;
    drains?: string;
    prosthesisLabel?: string;
    significantIntraOpEvent?: string;
    position?: string;
    incision?: string;
    procedureSteps?: string;
    incisionAt?: string;
    woundClosureAt?: string;
    woundClosureDone?: boolean;
    skinClosureDone?: boolean;
    spongeInstrumentCountVerified?: boolean;
    disposition?: 'icu' | 'patient-room' | 'home' | null;
  }): Observable<OtIntraOpNote> {
    return this.http.put<OtIntraOpNote>(`${this.apiUrl}/schedules/${scheduleId}/intra-op`, payload);
  }

  // ─── Anaesthesia chart ─────────────────────────────────────────────
  appendAnaesthesiaTick(scheduleId: string, payload: Partial<OtAnaesthesiaTick>): Observable<OtAnaesthesiaTick> {
    return this.http.post<OtAnaesthesiaTick>(`${this.apiUrl}/schedules/${scheduleId}/anaesthesia`, payload);
  }
  getAnaesthesiaChart(scheduleId: string): Observable<OtAnaesthesiaTick[]> {
    return this.http.get<OtAnaesthesiaTick[]>(`${this.apiUrl}/schedules/${scheduleId}/anaesthesia`);
  }

  // ─── PACU ──────────────────────────────────────────────────────────
  upsertPacu(scheduleId: string, payload: Partial<PacuRecord>): Observable<PacuRecord> {
    return this.http.put<PacuRecord>(`${this.apiUrl}/schedules/${scheduleId}/pacu`, payload);
  }
  appendPacuVital(scheduleId: string, payload: Partial<PacuVital>): Observable<PacuVital> {
    return this.http.post<PacuVital>(`${this.apiUrl}/schedules/${scheduleId}/pacu/vital`, payload);
  }
  dischargeFromPacu(scheduleId: string, payload: {
    dischargedTo: 'ward' | 'icu' | 'home' | 'expired';
    dischargedToWardId?: string;
    dischargedToBedId?: string;
    dischargeCriteriaMet: boolean;
    signatureId: string;
  }): Observable<PacuRecord> {
    return this.http.post<PacuRecord>(`${this.apiUrl}/schedules/${scheduleId}/pacu/discharge`, payload);
  }

  // ─── Outcome ───────────────────────────────────────────────────────
  upsertOutcome(scheduleId: string, payload: Partial<OtOutcome>): Observable<OtOutcome> {
    return this.http.put<OtOutcome>(`${this.apiUrl}/schedules/${scheduleId}/outcome`, payload);
  }

  // ─── KPIs ──────────────────────────────────────────────────────────
  getKpis(fromDate?: string, toDate?: string): Observable<OtKpis> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get<OtKpis>(`${this.apiUrl}/kpis`, { params });
  }
}
