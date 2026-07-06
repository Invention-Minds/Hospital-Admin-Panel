import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.6 — ICU clinical artefacts service (NABH COP.3).

export interface IcuVitalsReading {
  id: string; admissionId: string;
  recordedAt: string; intervalMinutes: number;
  hr: number | null; sbp: number | null; dbp: number | null; map: number | null;
  rr: number | null; spo2: number | null; temp: number | null; gcs: number | null; cvp: number | null;
  ventilatorMode: string | null; fiO2: number | null; peep: number | null;
  pressureSupport: number | null; tidalVolume: number | null; respRateSet: number | null;
  abgPh: number | null; abgPco2: number | null; abgPo2: number | null;
  abgHco3: number | null; abgBe: number | null; abgLactate: number | null;
  inotropes: string | null; notes: string | null;
  recordedBy: string | null; recordedById: number | null;
  createdAt: string;
}

export interface IcuProgressNote {
  id: string; admissionId: string;
  noteDate: string; icuDayNumber: number;
  doctorName: string; doctorId: number | null;
  subjective: string; objective: string; assessment: string; plan: string;
  sofaScore: number | null; apacheScore: number | null; gcsScore: number | null;
  trajectory: 'improving' | 'stable' | 'deteriorating' | 'critical' | null;
  signedAt: string | null; signedBy: string | null; signatureId: string | null;
  createdAt: string; updatedAt: string;
}

export interface IcuSedationLog {
  id: string; admissionId: string;
  recordedAt: string; shift: string | null;
  rassScore: number | null; rassBehavior: string | null;
  cpotScore: number | null; cpotBehavior: string | null;
  sedativeAgent: string | null; sedativeRate: string | null;
  analgesicAgent: string | null; analgesicRate: string | null;
  rassGoal: number | null; notes: string | null;
  recordedBy: string | null; createdAt: string;
}

export interface IcuRestraintReviewEntry {
  reviewedAt: string;
  reviewedBy: string;
  status: 'continue' | 'discontinue';
  notes: string;
}

export interface IcuRestraintLog {
  id: string; admissionId: string;
  orderedAt: string; orderedBy: string; orderedById: number | null;
  reason: string;
  restraintType: string; bodyPart: string | null;
  reviewLog: string | null; // JSON-stringified IcuRestraintReviewEntry[]
  discontinuedAt: string | null; discontinuedBy: string | null; discontinuedReason: string | null;
  createdAt: string; updatedAt: string;
}

export interface IcuBundleLog {
  id: string; admissionId: string;
  chartDate: string;
  vapStatus: string | null; vapNotes: string | null;
  clabsiStatus: string | null; clabsiNotes: string | null;
  cautiStatus: string | null; cautiNotes: string | null;
  pressureUlcerStatus: string | null; pressureUlcerNotes: string | null;
  dvtStatus: string | null; dvtNotes: string | null;
  glycemicControlStatus: string | null; glycemicControlNotes: string | null;
  recordedBy: string | null; createdAt: string; updatedAt: string;
}

export interface IcuFamilyCommunication {
  id: string; admissionId: string;
  communicationAt: string;
  category: string;
  participantName: string; participantRelation: string; participantPhone: string | null;
  topicsDiscussed: string; decisionsReached: string | null;
  secondOpinionRequested: boolean; multiPartyMeeting: boolean;
  documentedBy: string; documentedById: number | null; signatureId: string | null;
  createdAt: string;
}

export interface IcuStepDownRequest {
  id: string; admissionId: string;
  status: 'PROPOSED' | 'ACKNOWLEDGED' | 'ACCEPTED' | 'IN_TRANSIT' | 'COMPLETED' | 'DECLINED';
  fromWardId: string | null; fromBedId: string | null;
  toWardId: string | null; toBedId: string | null;
  rationale: string; stepDownCriteriaMet: boolean;
  ongoingMeds: string | null; carryForwardOrders: string | null; codeStatus: string | null;
  proposedBy: string; proposedAt: string;
  intensivistSignedAt: string | null; intensivistSignedBy: string | null;
  intensivistDeclineReason: string | null;
  receivingNurseAcceptedAt: string | null; receivingNurseName: string | null;
  inTransitAt: string | null; completedAt: string | null; completedBy: string | null;
  cancelReason: string | null;
  createdAt: string; updatedAt: string;
}

export interface IcuWorkbenchAdmission {
  id: string; admissionNo: string; prn: string;
  admissionDate: string; admissionTime: string; admittingDoctor: string;
  department: string; diagnosis: string; status: string;
  wardId: string | null; bedId: string | null; roomType: string;
  icuAdmittedAt: string | null; icuDischargedAt: string | null; priorIcuDischargeAt: string | null;
}

export interface IcuWorkbenchPayload {
  admission: IcuWorkbenchAdmission;
  icuDayNumber: number | null;
  readmittedWithin30Days: boolean;
  vitals: IcuVitalsReading[];
  progressNotes: IcuProgressNote[];
  sedations: IcuSedationLog[];
  restraints: IcuRestraintLog[];
  bundles: IcuBundleLog[];
  familyComms: IcuFamilyCommunication[];
  stepDowns: IcuStepDownRequest[];
}

@Injectable({ providedIn: 'root' })
export class IcuClinicalService {
  private base = `${environment.apiUrl}/ipd`;
  constructor(private http: HttpClient) {}

  // ─── Workbench aggregator ───────────────────────────────────────
  workbench(admissionId: string): Observable<{ data: IcuWorkbenchPayload }> {
    return this.http.get<{ data: IcuWorkbenchPayload }>(`${this.base}/admission/${admissionId}/icu/workbench`);
  }

  // ─── Vitals ─────────────────────────────────────────────────────
  listVitals(admissionId: string): Observable<{ data: IcuVitalsReading[] }> {
    return this.http.get<{ data: IcuVitalsReading[] }>(`${this.base}/admission/${admissionId}/icu/vitals`);
  }
  addVitals(admissionId: string, body: Partial<IcuVitalsReading>): Observable<{ data: IcuVitalsReading }> {
    return this.http.post<{ data: IcuVitalsReading }>(`${this.base}/admission/${admissionId}/icu/vitals`, body);
  }

  // ─── Progress notes ─────────────────────────────────────────────
  listProgressNotes(admissionId: string): Observable<{ data: IcuProgressNote[] }> {
    return this.http.get<{ data: IcuProgressNote[] }>(`${this.base}/admission/${admissionId}/icu/progress-notes`);
  }
  addProgressNote(admissionId: string, body: Partial<IcuProgressNote>): Observable<{ data: IcuProgressNote }> {
    return this.http.post<{ data: IcuProgressNote }>(`${this.base}/admission/${admissionId}/icu/progress-notes`, body);
  }

  // ─── Sedation ───────────────────────────────────────────────────
  listSedation(admissionId: string): Observable<{ data: IcuSedationLog[] }> {
    return this.http.get<{ data: IcuSedationLog[] }>(`${this.base}/admission/${admissionId}/icu/sedation`);
  }
  addSedation(admissionId: string, body: Partial<IcuSedationLog>): Observable<{ data: IcuSedationLog }> {
    return this.http.post<{ data: IcuSedationLog }>(`${this.base}/admission/${admissionId}/icu/sedation`, body);
  }

  // ─── Restraints ─────────────────────────────────────────────────
  listRestraints(admissionId: string): Observable<{ data: IcuRestraintLog[] }> {
    return this.http.get<{ data: IcuRestraintLog[] }>(`${this.base}/admission/${admissionId}/icu/restraints`);
  }
  addRestraint(admissionId: string, body: Partial<IcuRestraintLog>): Observable<{ data: IcuRestraintLog }> {
    return this.http.post<{ data: IcuRestraintLog }>(`${this.base}/admission/${admissionId}/icu/restraints`, body);
  }
  appendRestraintReview(id: string, body: { status: 'continue' | 'discontinue'; notes?: string }): Observable<{ data: IcuRestraintLog }> {
    return this.http.post<{ data: IcuRestraintLog }>(`${this.base}/icu/restraints/${id}/review`, body);
  }

  // ─── Bundles ────────────────────────────────────────────────────
  listBundles(admissionId: string): Observable<{ data: IcuBundleLog[] }> {
    return this.http.get<{ data: IcuBundleLog[] }>(`${this.base}/admission/${admissionId}/icu/bundles`);
  }
  upsertBundle(admissionId: string, body: Partial<IcuBundleLog>): Observable<{ data: IcuBundleLog }> {
    return this.http.put<{ data: IcuBundleLog }>(`${this.base}/admission/${admissionId}/icu/bundles`, body);
  }

  // ─── Family communication ───────────────────────────────────────
  listFamilyComms(admissionId: string): Observable<{ data: IcuFamilyCommunication[] }> {
    return this.http.get<{ data: IcuFamilyCommunication[] }>(`${this.base}/admission/${admissionId}/icu/family-comms`);
  }
  addFamilyComm(admissionId: string, body: Partial<IcuFamilyCommunication>): Observable<{ data: IcuFamilyCommunication }> {
    return this.http.post<{ data: IcuFamilyCommunication }>(`${this.base}/admission/${admissionId}/icu/family-comms`, body);
  }

  // ─── Step-down ──────────────────────────────────────────────────
  listStepDowns(admissionId: string): Observable<{ data: IcuStepDownRequest[] }> {
    return this.http.get<{ data: IcuStepDownRequest[] }>(`${this.base}/admission/${admissionId}/icu/step-downs`);
  }
  proposeStepDown(admissionId: string, body: Partial<IcuStepDownRequest>): Observable<{ data: IcuStepDownRequest }> {
    return this.http.post<{ data: IcuStepDownRequest }>(`${this.base}/admission/${admissionId}/icu/step-downs`, body);
  }
  acknowledgeStepDown(id: string, body: { accept: boolean; signatureId?: string; declineReason?: string }): Observable<{ data: IcuStepDownRequest }> {
    return this.http.post<{ data: IcuStepDownRequest }>(`${this.base}/icu/step-downs/${id}/acknowledge`, body);
  }
  acceptStepDown(id: string, body: { toWardId: string; toBedId: string; signatureId?: string; receivingNurseName?: string }): Observable<{ data: IcuStepDownRequest }> {
    return this.http.post<{ data: IcuStepDownRequest }>(`${this.base}/icu/step-downs/${id}/accept`, body);
  }
  completeStepDown(id: string, body: { handoverSignatureId?: string }): Observable<{ data: IcuStepDownRequest }> {
    return this.http.post<{ data: IcuStepDownRequest }>(`${this.base}/icu/step-downs/${id}/complete`, body);
  }

  // ─── Phase 9.16 — Nurses Care Record ────────────────────────────
  listInvasiveLines(admissionId: string): Observable<{ data: IcuInvasiveLine[] }> {
    return this.http.get<{ data: IcuInvasiveLine[] }>(`${this.base}/admission/${admissionId}/icu/invasive-lines`);
  }
  addInvasiveLine(admissionId: string, body: Partial<IcuInvasiveLine>): Observable<{ data: IcuInvasiveLine }> {
    return this.http.post<{ data: IcuInvasiveLine }>(`${this.base}/admission/${admissionId}/icu/invasive-lines`, body);
  }
  updateInvasiveLine(id: string, body: Partial<IcuInvasiveLine>): Observable<{ data: IcuInvasiveLine }> {
    return this.http.put<{ data: IcuInvasiveLine }>(`${this.base}/icu/invasive-lines/${id}`, body);
  }
  removeInvasiveLine(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/icu/invasive-lines/${id}`);
  }
  listCarePlans(admissionId: string): Observable<{ data: IcuNursingCarePlan[] }> {
    return this.http.get<{ data: IcuNursingCarePlan[] }>(`${this.base}/admission/${admissionId}/icu/care-plans`);
  }
  createCarePlan(admissionId: string, body: Partial<IcuNursingCarePlan>): Observable<{ data: IcuNursingCarePlan }> {
    return this.http.post<{ data: IcuNursingCarePlan }>(`${this.base}/admission/${admissionId}/icu/care-plans`, body);
  }
  removeCarePlan(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/icu/care-plans/${id}`);
  }
  listNurseNotes(admissionId: string): Observable<{ data: IcuNurseNote[] }> {
    return this.http.get<{ data: IcuNurseNote[] }>(`${this.base}/admission/${admissionId}/icu/nurse-notes`);
  }
  addNurseNote(admissionId: string, body: Partial<IcuNurseNote>): Observable<{ data: IcuNurseNote }> {
    return this.http.post<{ data: IcuNurseNote }>(`${this.base}/admission/${admissionId}/icu/nurse-notes`, body);
  }
  removeNurseNote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/icu/nurse-notes/${id}`);
  }
}

// ─── Phase 9.16 — Nurses Care Record types ──────────────────────────
export type IcuLineType = 'peripheral' | 'central' | 'arterial' | 'hd-catheter' | 'trach-et' | 'foley';

export interface IcuInvasiveLine {
  id: string;
  admissionId: string;
  lineType: IcuLineType;
  site: string | null;
  insertedAt: string;
  removedAt: string | null;
  removalReason: string | null;
  insertedBy: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CarePlanRow { goal: string; planning: string; implementation: string; outcome: string; }

export interface IcuNursingCarePlan {
  id: string;
  admissionId: string;
  planDate: string;
  shift: string | null;
  goalPatentAirway: boolean;
  goalAdequateOxygenation: boolean;
  goalTissuePerfusion: boolean;
  goalFluidBalance: boolean;
  goalPainRelief: boolean;
  goalNutrition: boolean;
  goalPreventDvt: boolean;
  goalSkinIntegrity: boolean;
  goalActivityTolerance: boolean;
  goalPersonalHygiene: boolean;
  goalEliminationNeed: boolean;
  goalSafety: boolean;
  goalReduceAnxiety: boolean;
  goalCommunication: boolean;
  goalPatientFamilyEducation: boolean;
  carePlanRows: string | null; // JSON of CarePlanRow[]
  nurseName: string | null;
  nurseEmpNo: string | null;
  createdAt: string;
}

export interface IcuNurseNote {
  id: string;
  admissionId: string;
  recordedAt: string;
  note: string;
  nurseName: string | null;
  nurseEmpNo: string | null;
  createdAt: string;
}
