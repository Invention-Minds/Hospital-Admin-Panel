import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * IPD Non-Drug Doctor Orders (Phase 7).
 *
 * Three-state lifecycle: ORDERED → ACKNOWLEDGED → COMPLETED. Used for orders
 * that aren't drugs — diet changes, mobility orders, investigations,
 * procedures, consults.
 */

export type NonDrugOrderStatus = 'ORDERED' | 'ACKNOWLEDGED' | 'COMPLETED' | 'CANCELLED';
export type NonDrugCategory = 'diet' | 'mobility' | 'investigation' | 'procedure' | 'consult' | 'other';

export interface NonDrugOrder {
  id: string;
  admissionId: string;
  orderedAt: string;
  doctorName: string;
  doctorId: number | null;
  doctorSignatureId: string | null;
  orderText: string;
  category: NonDrugCategory | string | null;
  acknowledgedByName: string | null;
  acknowledgedById: number | null;
  acknowledgedSignatureId: string | null;
  acknowledgedAt: string | null;
  completedByName: string | null;
  completedById: number | null;
  completedAt: string | null;
  completionNotes: string | null;
  status: NonDrugOrderStatus;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class NonDrugOrderService {
  private base = `${environment.apiUrl}/ipd`;

  constructor(private http: HttpClient) {}

  list(admissionId: string, status?: NonDrugOrderStatus): Observable<NonDrugOrder[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<NonDrugOrder[]>(`${this.base}/admission/${admissionId}/non-drug-orders`, { params });
  }

  create(admissionId: string, body: {
    orderText: string;
    category?: NonDrugCategory | null;
    doctorName?: string;
    doctorSignatureId?: string | null;
  }): Observable<NonDrugOrder> {
    return this.http.post<NonDrugOrder>(`${this.base}/admission/${admissionId}/non-drug-orders`, body);
  }

  acknowledge(admissionId: string, id: string, body: { signatureId?: string; nurseName?: string }): Observable<NonDrugOrder> {
    return this.http.post<NonDrugOrder>(`${this.base}/admission/${admissionId}/non-drug-orders/${id}/acknowledge`, body);
  }

  complete(admissionId: string, id: string, body: { completionNotes?: string; completedByName?: string }): Observable<NonDrugOrder> {
    return this.http.post<NonDrugOrder>(`${this.base}/admission/${admissionId}/non-drug-orders/${id}/complete`, body);
  }

  cancel(admissionId: string, id: string): Observable<NonDrugOrder> {
    return this.http.post<NonDrugOrder>(`${this.base}/admission/${admissionId}/non-drug-orders/${id}/cancel`, {});
  }
}
