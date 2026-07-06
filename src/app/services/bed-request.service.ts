import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Phase 3 — Bed-request service (WF-2 admission handshake).
 *
 * Three caller groups:
 *   • PRE / billing   — calls `create` and `attenderAccept`
 *   • Nursing station — calls `accept`, `hold`, `reject`, polls `list({status:'REQUESTED'})`
 *   • Admin / audit   — reads `getById` and `list` for dashboards
 */

export type BedRequestStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'HELD'
  | 'REJECTED'
  | 'CLOSED';

export type BedUrgency = 'routine' | 'urgent' | 'emergency';

export interface BedRequest {
  id: string;
  admissionId: string;
  wardId?: string | null;
  preferredBedType?: string | null;
  urgency: BedUrgency;
  status: BedRequestStatus;
  requestedAt: string;
  requestedBy?: string | null;
  acceptedAt?: string | null;
  acceptedBy?: string | null;
  nsAcceptanceSignatureId?: string | null;
  holdReason?: string | null;
  rejectReason?: string | null;
  attenderAcceptedAt?: string | null;
  attenderName?: string | null;
  attenderRelation?: string | null;
  attenderFacilitySignatureId?: string | null;
  admission?: any; // included via Prisma include
}

export interface CreateBedRequestPayload {
  admissionId: string;
  wardId?: string;
  preferredBedType?: string;
  urgency?: BedUrgency;
}

export interface AttenderAcceptPayload {
  attenderName: string;
  attenderRelation: string;
  attenderFacilitySignatureId: string;
  consentSignatureIds?: string[];
}

@Injectable({ providedIn: 'root' })
export class BedRequestService {
  private apiUrl = `${environment.apiUrl}/bed-request`;

  constructor(private http: HttpClient) {}

  list(filters?: { status?: BedRequestStatus; wardId?: string }): Observable<BedRequest[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.wardId) params = params.set('wardId', filters.wardId);
    return this.http.get<BedRequest[]>(this.apiUrl, { params });
  }

  getById(id: string): Observable<BedRequest> {
    return this.http.get<BedRequest>(`${this.apiUrl}/${id}`);
  }

  create(payload: CreateBedRequestPayload): Observable<BedRequest> {
    return this.http.post<BedRequest>(this.apiUrl, payload);
  }

  accept(
    id: string,
    payload: { nsAcceptanceSignatureId: string; wardId: string; bedId: string },
  ): Observable<BedRequest> {
    return this.http.post<BedRequest>(`${this.apiUrl}/${id}/accept`, payload);
  }

  hold(id: string, holdReason: string): Observable<BedRequest> {
    return this.http.post<BedRequest>(`${this.apiUrl}/${id}/hold`, { holdReason });
  }

  reject(id: string, rejectReason: string): Observable<BedRequest> {
    return this.http.post<BedRequest>(`${this.apiUrl}/${id}/reject`, { rejectReason });
  }

  attenderAccept(id: string, payload: AttenderAcceptPayload): Observable<BedRequest> {
    return this.http.post<BedRequest>(`${this.apiUrl}/${id}/attender-accept`, payload);
  }
}
