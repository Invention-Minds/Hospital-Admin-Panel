import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.5a — Emergency Surgery Charges service.

export type EmrgSurchargeType =
  | 'after-hours'
  | 'weekend'
  | 'holiday'
  | 'staff-callback'
  | 'equipment-setup'
  | 'custom';

export interface EmrgSurcharge {
  id: string;
  scheduleId: string;
  surchargeType: EmrgSurchargeType;
  reason: string | null;
  baseAmount: number;
  percent: number;
  flatAmount: number;
  totalAmount: number;
  appliedToEstimation: boolean;
  estimationLineId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmrgSurchargeMeta {
  grandTotal: number;
  count: number;
}

export interface UpsertEmrgSurchargeBody {
  surchargeType: EmrgSurchargeType;
  reason?: string | null;
  baseAmount?: number;
  percent?: number;
  flatAmount?: number;
}

@Injectable({ providedIn: 'root' })
export class OtEmrgSurchargeService {
  constructor(private http: HttpClient) {}

  private listUrl(scheduleId: string) {
    return `${environment.apiUrl}/ot/schedules/${scheduleId}/emrg-surcharges`;
  }
  private rowUrl(id: string) {
    return `${environment.apiUrl}/ot/emrg-surcharges/${id}`;
  }

  list(scheduleId: string): Observable<{ data: EmrgSurcharge[]; meta: EmrgSurchargeMeta }> {
    return this.http.get<{ data: EmrgSurcharge[]; meta: EmrgSurchargeMeta }>(this.listUrl(scheduleId));
  }

  add(scheduleId: string, body: UpsertEmrgSurchargeBody): Observable<{ data: EmrgSurcharge }> {
    return this.http.post<{ data: EmrgSurcharge }>(this.listUrl(scheduleId), body);
  }

  update(id: string, body: Partial<UpsertEmrgSurchargeBody>): Observable<{ data: EmrgSurcharge }> {
    return this.http.put<{ data: EmrgSurcharge }>(this.rowUrl(id), body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(this.rowUrl(id));
  }

  apply(id: string): Observable<{ data: EmrgSurcharge; estimationLine: unknown }> {
    return this.http.post<{ data: EmrgSurcharge; estimationLine: unknown }>(
      `${this.rowUrl(id)}/apply`,
      {},
    );
  }
}
