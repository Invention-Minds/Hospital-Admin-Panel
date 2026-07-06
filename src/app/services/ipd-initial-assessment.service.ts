import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * IPD Initial Assessment service (Phase 1).
 *
 * One assessment per admission. Routes consumed:
 *   GET    /api/ipd/admission/:id/initial-assessment
 *   POST   /api/ipd/admission/:id/initial-assessment              (upsert)
 *   POST   /api/ipd/admission/:id/initial-assessment/sign-filled
 *   POST   /api/ipd/admission/:id/initial-assessment/sign-consultant
 *
 * Field shape mirrors the backend Prisma model — flat, all-optional in
 * UpsertPayload so the editor can save sections individually.
 */

export type AssessmentStatus = 'DRAFT' | 'FILLED' | 'CONSULTANT_SIGNED';

export interface IpdInitialAssessment {
  id: string;
  admissionId: string;
  department?: string | null;
  admittingConsultant?: string | null;

  // Allergies
  allergyNotKnown: boolean;
  allergyDrug: boolean;
  allergyFood: boolean;
  allergyTransfusion: boolean;
  allergyOthers?: string | null;

  // Presenting illness
  chiefComplaints?: string | null;
  presentingIllness?: string | null;

  // Personal history
  occupationStatus?: string | null;
  occupationDetails?: string | null;
  dietType?: string | null;
  bowelBladder?: string | null;
  sleep?: string | null;
  habits?: string | null;

  // Co-morbidities
  hasHypertension: boolean;
  hypertensionSince?: string | null;
  hypertensionMeds?: string | null;
  hasDiabetes: boolean;
  diabetesSince?: string | null;
  diabetesMeds?: string | null;
  hasCardiacDisease: boolean;
  cardiacDiseaseSince?: string | null;
  cardiacDiseaseMeds?: string | null;
  hasWoundDischarge: boolean;
  woundDischargeSince?: string | null;
  hasCopd: boolean;
  copdSince?: string | null;
  hasThyroidDisorder: boolean;
  thyroidDisorderSince?: string | null;
  hasCva: boolean;
  cvaSince?: string | null;
  hasRecurrentInfection: boolean;
  recurrentInfectionSince?: string | null;

  // Surgical / medication history
  surgicalHistory?: string | null;
  medicationHistory?: string | null;

  // OB/GYN (Phase 7 — pregnancy/lactation flags drive teratogenic-drug alerts)
  isPregnant: boolean;
  pregnancyWeeks?: number | null;
  isLactating: boolean;
  lmp?: string | null;
  cycleRegular?: boolean | null;
  contraception?: boolean | null;
  discharge?: boolean | null;
  cervicalSmear?: boolean | null;
  immunization?: string | null;
  obPain?: boolean | null;
  menarche?: string | null;
  menopause?: string | null;
  menorrhagia?: boolean | null;
  obstetricHistory?: string | null;

  // Family history
  familyHistory?: string | null;

  // Geriatric ADL
  isGeriatric: boolean;
  mentalStatus?: string | null;
  emotional?: string | null;
  communicationsSpeech?: string | null;
  mobility?: string | null;
  balance?: string | null;
  bowel?: string | null;
  bladder?: string | null;
  nutrition?: string | null;
  adl?: string | null;
  social?: string | null;
  hearing?: string | null;
  vision?: string | null;

  // Vitals
  vitalsTemp?: string | null;
  vitalsPulse?: string | null;
  vitalsBP?: string | null;
  vitalsRR?: string | null;
  vitalsWeight?: string | null;
  vitalsHeight?: string | null;
  painScore?: number | null;
  painLocation?: string | null;
  painDuration?: string | null;

  // General examination
  examPallor: boolean;
  examEdema: boolean;
  examClubbing: boolean;
  examCyanosis: boolean;
  examIcterus: boolean;
  examEmaciated: boolean;
  examBodyHabitus?: string | null;
  examPsychological?: string | null;
  examLymphNode?: string | null;
  examOthers?: string | null;

  // Systemic examination
  cvsNad: boolean;
  cvsFindings?: string | null;
  entNad: boolean;
  entFindings?: string | null;
  giNad: boolean;
  giFindings?: string | null;
  mskNad: boolean;
  mskFindings?: string | null;
  cnsNad: boolean;
  cnsFindings?: string | null;
  respNad: boolean;
  respFindings?: string | null;
  guNad: boolean;
  guFindings?: string | null;
  hemNad: boolean;
  hemFindings?: string | null;

  // Summary
  findings?: string | null;
  provisionalDiagnosis?: string | null;
  investigationsAdvised?: string | null;
  // Form 4 (Phase 8) — F-01 'Relevant Previous Investigations Enclosed' checkbox.
  previousInvestigationsEnclosed: boolean;
  problems?: string | null;
  treatmentPlan?: string | null;
  otherSystems?: string | null;

  // Discharge planning
  needsSocialSupport: boolean;
  needsHomeEquipment: boolean;
  needsPhysiotherapy: boolean;
  needsWoundCare: boolean;
  otherDischargeNeeds?: string | null;

  // Phase 9.13 — doctor-ordered vitals monitoring frequency. Stored on
  // IpdAdmission; the assessment GET merges it in and the upsert forwards it.
  vitalsMonitoringFrequency?: string | null;

  // Phase 9.18 — doctor-ordered glucose monitoring frequency. Same handling
  // as vitals above: stored on IpdAdmission, merged in on GET, forwarded on
  // upsert. Also settable from the Insulin Infusion Chart page.
  glucoseMonitoringFrequency?: string | null;

  // Sign chain
  filledByName?: string | null;
  filledById?: number | null;
  filledBySignatureId?: string | null;
  filledAt?: string | null;
  consultantName?: string | null;
  consultantId?: number | null;
  consultantSignatureId?: string | null;
  consultantSignedAt?: string | null;

  status: AssessmentStatus;
  createdAt: string;
  updatedAt: string;
}

/** All-optional snapshot for upsert. Editor saves sections individually. */
export type UpsertAssessmentPayload = Partial<Omit<IpdInitialAssessment,
  'id' | 'admissionId' | 'status' | 'createdAt' | 'updatedAt'
  | 'filledByName' | 'filledById' | 'filledBySignatureId' | 'filledAt'
  | 'consultantName' | 'consultantId' | 'consultantSignatureId' | 'consultantSignedAt'
>>;

@Injectable({ providedIn: 'root' })
export class IpdInitialAssessmentService {
  private base = `${environment.apiUrl}/ipd`;

  constructor(private http: HttpClient) {}

  get(admissionId: string): Observable<IpdInitialAssessment | null> {
    return this.http.get<IpdInitialAssessment | null>(
      `${this.base}/admission/${admissionId}/initial-assessment`,
    );
  }

  upsert(admissionId: string, payload: UpsertAssessmentPayload): Observable<IpdInitialAssessment> {
    return this.http.post<IpdInitialAssessment>(
      `${this.base}/admission/${admissionId}/initial-assessment`,
      payload,
    );
  }

  signFilled(admissionId: string, body: { signatureId: string; signerName?: string }): Observable<IpdInitialAssessment> {
    return this.http.post<IpdInitialAssessment>(
      `${this.base}/admission/${admissionId}/initial-assessment/sign-filled`,
      body,
    );
  }

  signConsultant(admissionId: string, body: { signatureId: string; consultantName?: string }): Observable<IpdInitialAssessment> {
    return this.http.post<IpdInitialAssessment>(
      `${this.base}/admission/${admissionId}/initial-assessment/sign-consultant`,
      body,
    );
  }
}
