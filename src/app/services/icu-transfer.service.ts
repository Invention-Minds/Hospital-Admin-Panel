import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Phase 5 (WF-4) — ICU Transfer service.
 *
 * Three-signature chain:
 *   Proposing doctor   → propose()        creates row in PROPOSED
 *   Intensivist        → acknowledge()    flips PROPOSED → ACKNOWLEDGED or DECLINED
 *   ICU charge nurse   → accept()         flips ACKNOWLEDGED → ACCEPTED
 *                        markInTransit()  flips ACCEPTED     → IN_TRANSIT
 *                        complete()       flips IN_TRANSIT   → COMPLETED (and moves the bed)
 *
 * All field names mirror the backend `IpdIcuTransferRequest` schema columns.
 */

export type IcuTransferStatus =
  | 'PROPOSED'
  | 'ACKNOWLEDGED'
  | 'DECLINED'
  | 'ACCEPTED'
  | 'IN_TRANSIT'
  | 'COMPLETED';

export interface IcuTransferRequest {
  id: string;
  admissionId: string;

  fromWardId?: string | null;
  fromBedId?: string | null;
  toWardId?: string | null;
  toBedId?: string | null;
  rationale: string;
  vitalsSnapshot?: string | null;
  linesAndDrains?: string | null;
  codeStatus?: string | null;
  sedationPlan?: string | null;

  status: IcuTransferStatus;

  proposedAt: string;
  proposedBy?: string | null;
  proposedById?: number | null;
  proposerName?: string | null;
  proposerSignatureId?: string | null;

  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  acknowledgedById?: number | null;
  intensivistName?: string | null;
  intensivistSignatureId?: string | null;
  declineReason?: string | null;

  acceptedAt?: string | null;
  acceptedBy?: string | null;
  acceptedById?: number | null;
  receiverSignatureId?: string | null;
  inTransitAt?: string | null;
  completedAt?: string | null;
  handoverSignatureId?: string | null;

  createdAt: string;
  updatedAt: string;
  admission?: any;
}

export interface ProposeIcuTransferPayload {
  admissionId: string;
  toWardId?: string;
  rationale: string;
  vitalsSnapshot?: string;
  linesAndDrains?: string;
  codeStatus?: string;
  sedationPlan?: string;
  proposerName?: string;
  proposerSignatureId: string;
}

export interface AcknowledgeIcuTransferPayload {
  outcome: 'ACKNOWLEDGED' | 'DECLINED';
  intensivistName?: string;
  intensivistSignatureId?: string;
  declineReason?: string;
}

export interface AcceptIcuTransferPayload {
  toBedId: string;
  toWardId?: string;
  receiverSignatureId: string;
}

export interface CompleteIcuTransferPayload {
  handoverSignatureId: string;
}

@Injectable({ providedIn: 'root' })
export class IcuTransferService {
  private apiUrl = `${environment.apiUrl}/icu-transfer`;

  constructor(private http: HttpClient) {}

  list(filters?: {
    admissionId?: string;
    status?: IcuTransferStatus;
  }): Observable<IcuTransferRequest[]> {
    let params = new HttpParams();
    if (filters?.admissionId) params = params.set('admissionId', filters.admissionId);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<IcuTransferRequest[]>(this.apiUrl, { params });
  }

  getById(id: string): Observable<IcuTransferRequest> {
    return this.http.get<IcuTransferRequest>(`${this.apiUrl}/${id}`);
  }

  propose(payload: ProposeIcuTransferPayload): Observable<IcuTransferRequest> {
    return this.http.post<IcuTransferRequest>(this.apiUrl, payload);
  }

  acknowledge(id: string, payload: AcknowledgeIcuTransferPayload): Observable<IcuTransferRequest> {
    return this.http.post<IcuTransferRequest>(`${this.apiUrl}/${id}/acknowledge`, payload);
  }

  accept(id: string, payload: AcceptIcuTransferPayload): Observable<IcuTransferRequest> {
    return this.http.post<IcuTransferRequest>(`${this.apiUrl}/${id}/accept`, payload);
  }

  markInTransit(id: string): Observable<IcuTransferRequest> {
    return this.http.post<IcuTransferRequest>(`${this.apiUrl}/${id}/in-transit`, {});
  }

  complete(id: string, payload: CompleteIcuTransferPayload): Observable<IcuTransferRequest> {
    return this.http.post<IcuTransferRequest>(`${this.apiUrl}/${id}/complete`, payload);
  }
}
