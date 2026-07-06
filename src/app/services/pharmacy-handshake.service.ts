import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase P — Pharmacy + nurse handshake API client.

export interface HandshakeRx {
  id: string;
  admissionId: string;
  prescribedBy: string;
  genericName: string;
  brandName: string | null;
  dose: string;
  frequency: string;
  duration: string;
  route: string;
  quantity: number;
  prescriptionType: string | null;
  status: string;
  sentToPharmacyAt: string | null;
  isStatBypass: boolean;
  pharmacyAckAt: string | null;
  pharmacyAckBy: string | null;
  pharmacyRejectedAt: string | null;
  pharmacyRejectedReason: string | null;
  dispensedAt: string | null;
  dispensedBy: string | null;
  dispensedQty: number | null;
  substitutedBrand: string | null;
  substitutedReason: string | null;
  nurseCollectedAt: string | null;
  nurseCollectedBy: string | null;
  nurseCollectedQty: number | null;
  nurseReturnedAt: string | null;
  nurseReturnReason: string | null;
  stockProbeJson: string | null;
  admission: {
    id: string; admissionNo: string; prn: string; admittingDoctor: string | null;
    ward?: { wardName: string } | null;
    bed?: { bedNumber: string } | null;
  };
}

@Injectable({ providedIn: 'root' })
export class PharmacyHandshakeService {
  private base = `${environment.apiUrl}/ipd-pharmacy`;
  constructor(private http: HttpClient) {}

  pharmacyQueue(): Observable<{ data: HandshakeRx[] }> {
    return this.http.get<{ data: HandshakeRx[] }>(`${this.base}/pharmacy/queue`);
  }
  ack(rxId: string): Observable<{ data: HandshakeRx }> {
    return this.http.post<{ data: HandshakeRx }>(`${this.base}/pharmacy/${rxId}/ack`, {});
  }
  reject(rxId: string, reason: string): Observable<{ data: HandshakeRx }> {
    return this.http.post<{ data: HandshakeRx }>(`${this.base}/pharmacy/${rxId}/reject`, { reason });
  }
  dispense(rxId: string, body: { dispensedQty?: number; substitutedBrand?: string; substitutedReason?: string }):
    Observable<{ data: HandshakeRx; fullyDispensed: boolean }> {
    return this.http.post<{ data: HandshakeRx; fullyDispensed: boolean }>(
      `${this.base}/pharmacy/${rxId}/dispense`, body);
  }

  nurseInbox(wardId?: string): Observable<{ data: HandshakeRx[] }> {
    const url = wardId ? `${this.base}/nurse/medication-inbox?wardId=${encodeURIComponent(wardId)}` : `${this.base}/nurse/medication-inbox`;
    return this.http.get<{ data: HandshakeRx[] }>(url);
  }
  collect(rxId: string, collectedQty?: number): Observable<{ data: HandshakeRx; fullyCollected: boolean }> {
    return this.http.post<{ data: HandshakeRx; fullyCollected: boolean }>(
      `${this.base}/nurse/${rxId}/collect`, { collectedQty });
  }
  returnRx(rxId: string, reason: string): Observable<{ data: HandshakeRx }> {
    return this.http.post<{ data: HandshakeRx }>(`${this.base}/nurse/${rxId}/return`, { reason });
  }
}
