import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.1a — OT Requisition queue service.

export type OtRequisitionStatus = 'pending' | 'scheduled' | 'cancelled' | 'fulfilled';

export interface OtRequisition {
  id: string;
  requisitionNo: string | null;
  prn: string | null;
  patientName: string | null;
  patientAdmitted: boolean;
  admissionId: string | null;
  bedCategory: string | null;
  phoneNumber: string | null;
  otRoomId: string | null;
  bookingFrom: string;
  bookingTo: string;
  primarySurgery: string;
  departmentId: number | null;
  categoryCode: string | null;
  surgeonId: number | null;
  surgeonName: string | null;
  anaesthetistId: number | null;
  anaesthetistName: string | null;
  anaesthesiaType: string | null;
  additionalSurgeries: unknown;
  specialInstructions: string | null;
  requisitionBy: string | null;
  estimationId: string | null;
  status: OtRequisitionStatus;
  cancelReason: string | null;
  createdAt: string;
  schedules?: Array<{ id: string; status: string }>;
}

@Injectable({ providedIn: 'root' })
export class OtRequisitionService {
  private base = `${environment.apiUrl}/ot/requisitions`;

  constructor(private http: HttpClient) {}

  list(filters?: { status?: OtRequisitionStatus; prn?: string; fromDate?: string; toDate?: string }): Observable<{ data: OtRequisition[] }> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.prn) params = params.set('prn', filters.prn);
    if (filters?.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters?.toDate) params = params.set('toDate', filters.toDate);
    return this.http.get<{ data: OtRequisition[] }>(this.base, { params });
  }

  get(id: string): Observable<{ data: OtRequisition }> {
    return this.http.get<{ data: OtRequisition }>(`${this.base}/${id}`);
  }

  create(body: Partial<OtRequisition>): Observable<{ data: OtRequisition }> {
    return this.http.post<{ data: OtRequisition }>(this.base, body);
  }

  update(id: string, body: Partial<OtRequisition>): Observable<{ data: OtRequisition }> {
    return this.http.put<{ data: OtRequisition }>(`${this.base}/${id}`, body);
  }

  cancel(id: string, reason: string): Observable<{ data: OtRequisition }> {
    return this.http.post<{ data: OtRequisition }>(`${this.base}/${id}/cancel`, { reason });
  }
}
