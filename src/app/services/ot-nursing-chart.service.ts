import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * OT Intra-Op Nursing Chart service (Phase 4b).
 *
 * One row per OT schedule. Sign chain: scrub → floor → OT-incharge. Status:
 * DRAFT → SIGNED_SCRUB → SIGNED_FLOOR → SIGNED_INCHARGE (read-only).
 */

export type NursingChartStatus = 'DRAFT' | 'SIGNED_SCRUB' | 'SIGNED_FLOOR' | 'SIGNED_INCHARGE';
export type SignerRole = 'scrub' | 'floor' | 'incharge';

export interface OtIntraOpNursingChart {
  id: string;
  scheduleId: string;

  wheelInAt: string | null;
  wheelOutAt: string | null;
  modeOfTransfer: 'bed' | 'stretcher' | 'wheelchair' | string | null;
  anaesthesia: 'GA' | 'SA' | 'EA' | 'REGIONAL' | 'BLOCK_MAC' | 'LOCAL' | string | null;
  position: 'supine' | 'prone' | 'lithotomy' | 'left-lateral' | 'right-lateral' | 'others' | string | null;
  positionNotes: string | null;

  pressureProtections: string | null;

  warmerPlaced: 'YES' | 'NO' | 'NA' | string | null;
  dvtPumpApplied: 'YES' | 'NO' | 'NA' | string | null;
  electricCautery: 'YES' | 'NA' | string | null;
  cauteryPadLocation: string | null;

  tourniquet: string | null;
  catheters: string | null;
  instrumentsCount: string | null;

  swabRoMopInitial: number | null;
  swabRoMopAdditional: number | null;
  swabRoMopFinal: number | null;
  swabRoGauzeInitial: number | null;
  swabRoGauzeAdditional: number | null;
  swabRoGauzeFinal: number | null;
  swabPlainGauzeInitial: number | null;
  swabPlainGauzeAdditional: number | null;
  swabPlainGauzeFinal: number | null;
  swabThroatPackInitial: number | null;
  swabThroatPackAdditional: number | null;
  swabThroatPackFinal: number | null;
  swabPattiesInitial: number | null;
  swabPattiesAdditional: number | null;
  swabPattiesFinal: number | null;
  swabPeanutsInitial: number | null;
  swabPeanutsAdditional: number | null;
  swabPeanutsFinal: number | null;
  swabRibbonPacksInitial: number | null;
  swabRibbonPacksAdditional: number | null;
  swabRibbonPacksFinal: number | null;
  swabsCountTallied: boolean;

  specimensCulture: string | null;
  specimensHistopathology: string | null;
  specimensOther: string | null;
  specimenHandedOverBy: string | null;
  specimenHandedOverAt: string | null;
  specimenReceivedBy: string | null;
  specimenReceivedAt: string | null;

  conditionAtEnd: 'stable' | 'fair' | 'critical' | string | null;
  dressingType: 'compression' | 'simple' | 'immobilizer' | 'pop-cast' | string | null;
  dressingNotes: string | null;
  patientShiftedTo: 'recovery' | 'icu' | 'ward' | 'others' | string | null;
  patientShiftedToOther: string | null;

  scrubNurseName: string | null;
  scrubNurseId: number | null;
  scrubNurseSignatureId: string | null;
  scrubNurseSignedAt: string | null;
  floorNurseName: string | null;
  floorNurseId: number | null;
  floorNurseSignatureId: string | null;
  floorNurseSignedAt: string | null;
  otInchargeName: string | null;
  otInchargeId: number | null;
  otInchargeSignatureId: string | null;
  otInchargeSignedAt: string | null;

  status: NursingChartStatus;
  createdAt: string;
  updatedAt: string;
}

export type NursingChartUpsertPayload = Partial<Omit<OtIntraOpNursingChart,
  'id' | 'scheduleId' | 'status' | 'createdAt' | 'updatedAt'
  | 'scrubNurseName' | 'scrubNurseId' | 'scrubNurseSignatureId' | 'scrubNurseSignedAt'
  | 'floorNurseName' | 'floorNurseId' | 'floorNurseSignatureId' | 'floorNurseSignedAt'
  | 'otInchargeName' | 'otInchargeId' | 'otInchargeSignatureId' | 'otInchargeSignedAt'
>>;

@Injectable({ providedIn: 'root' })
export class OtNursingChartService {
  private base = `${environment.apiUrl}/ot`;

  constructor(private http: HttpClient) {}

  get(scheduleId: string): Observable<OtIntraOpNursingChart | null> {
    return this.http.get<OtIntraOpNursingChart | null>(`${this.base}/schedules/${scheduleId}/nursing-chart`);
  }

  upsert(scheduleId: string, payload: NursingChartUpsertPayload): Observable<OtIntraOpNursingChart> {
    return this.http.put<OtIntraOpNursingChart>(`${this.base}/schedules/${scheduleId}/nursing-chart`, payload);
  }

  sign(scheduleId: string, role: SignerRole, body: { signatureId: string; nurseName?: string }): Observable<OtIntraOpNursingChart> {
    return this.http.post<OtIntraOpNursingChart>(`${this.base}/schedules/${scheduleId}/nursing-chart/sign/${role}`, body);
  }
}
