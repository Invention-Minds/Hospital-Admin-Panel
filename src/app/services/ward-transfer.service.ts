import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.12 — UHJ "Pre-Operative Surgical Safety Checklist (Ward → OT)".

export interface WardTransferChecklist {
  id: string;
  scheduleId: string;
  status: 'DRAFT' | 'WARD_SIGNED' | 'OT_RECEIVED';

  // Section A — ward (25)
  identityBandChecked: boolean;
  surgeryConsentSigned: boolean;
  anaesthesiaConsentSigned: boolean;
  surgicalSiteMarked: boolean;
  preOpAssessmentCompleted: boolean;
  allergyStatusChecked: boolean;
  investigationsAvailable: boolean;
  bloodGroupCrossMatchDone: boolean;
  bloodProductsArranged: boolean;
  vitalSignsRecorded: boolean;
  ivLineSecured: boolean;
  preOpMedicationsGiven: boolean;
  antibioticAdministered: boolean;
  fastingConfirmed: boolean;
  dentureRemoved: boolean;
  jewelleryRemoved: boolean;
  nailPolishMakeupRemoved: boolean;
  contactLensRemoved: boolean;
  prosthesisHearingAidRemoved: boolean;
  urinaryCatheterSecured: boolean;
  skinPreparationCompleted: boolean;
  operativeSiteCleanedShaved: boolean;
  personalBelongingsHandedOver: boolean;
  caseSheetReportsSent: boolean;
  patientShiftedOnTrolleySafely: boolean;
  wardRemarks: string | null;

  // Section B — transfer (5)
  sideRailsSecured: boolean;
  oxygenSupportProvided: boolean;
  emergencyDrugsEquipmentAccompanied: boolean;
  patientMonitoredDuringTransfer: boolean;
  handoverGivenToOtNurse: boolean;
  transferRemarks: string | null;

  // Section C — OT receiving (15)
  otrIdentityReconfirmed: boolean;
  otrSurgerySiteConfirmed: boolean;
  otrConsentVerified: boolean;
  otrAllergyChecked: boolean;
  otrNbmReconfirmed: boolean;
  otrInvestigationsAvailable: boolean;
  otrImplantsBloodConfirmed: boolean;
  otrVitalSignsChecked: boolean;
  otrIvAccessPatent: boolean;
  otrPreOpMedicationsCompleted: boolean;
  otrSurgicalSiteMarkingVisible: boolean;
  otrJewelleryDentureRemoved: boolean;
  otrFoleyCatheterDrainsChecked: boolean;
  otrSkinPreparationAdequate: boolean;
  otrPatientShiftedToOtTableSafely: boolean;
  otReceivingRemarks: string | null;

  // Signature chain
  wardNurseName: string | null;
  wardNurseSignedAt: string | null;
  wardNurseSignatureId: string | null;
  otReceivingNurseName: string | null;
  otReceivingNurseSignedAt: string | null;
  otReceivingNurseSignatureId: string | null;

  createdAt: string;
  updatedAt: string;
  schedule?: {
    id: string;
    prn: string | null;
    patientName: string | null;
    procedureName: string;
    admissionId: string | null;
    plannedStart: string;
    surgeonName: string | null;
    otRoom?: { name: string };
  };
}

export interface ScheduleForTransfer {
  id: string;
  prn: string | null;
  patientName: string | null;
  procedureName: string;
  status: string;
  plannedStart: string;
  surgeonName: string | null;
  otRoom?: { name: string };
  wardTransferChecklist: {
    id: string;
    status: string;
    wardNurseSignedAt: string | null;
    otReceivingNurseSignedAt: string | null;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class WardTransferService {
  private base = `${environment.apiUrl}/ot`;

  constructor(private http: HttpClient) {}

  get(scheduleId: string): Observable<{ data: WardTransferChecklist | null }> {
    return this.http.get<{ data: WardTransferChecklist | null }>(
      `${this.base}/schedules/${scheduleId}/ward-transfer`,
    );
  }

  upsert(scheduleId: string, body: Partial<WardTransferChecklist>): Observable<{ data: WardTransferChecklist }> {
    return this.http.put<{ data: WardTransferChecklist }>(
      `${this.base}/schedules/${scheduleId}/ward-transfer`, body,
    );
  }

  sign(
    scheduleId: string,
    role: 'ward' | 'ot-receiving',
    body: { signatureId: string; signerName: string },
  ): Observable<{ data: WardTransferChecklist }> {
    return this.http.post<{ data: WardTransferChecklist }>(
      `${this.base}/schedules/${scheduleId}/ward-transfer/sign/${role}`, body,
    );
  }

  listByAdmission(admissionId: string): Observable<{ data: ScheduleForTransfer[] }> {
    return this.http.get<{ data: ScheduleForTransfer[] }>(
      `${this.base}/ward-transfer/by-admission/${admissionId}`,
    );
  }
}
