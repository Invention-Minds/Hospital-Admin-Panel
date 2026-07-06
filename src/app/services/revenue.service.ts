import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Phase 2.5 — Revenue service.
 *
 * Backs the revenue tabs on the /report page. All endpoint shapes mirror the
 * backend revenue.controller responses verbatim — `by`, `from`, `to`, `rows`,
 * `totals` come back exactly as named so templates can use them as-is.
 */

export type RevenueGroupBy = 'department' | 'doctor';

export interface RevenueRow {
  label: string;
  count: number;
  amount: number;
}

export interface RevenueTotals {
  count: number;
  amount: number;
}

export interface RevenueReport {
  by: RevenueGroupBy;
  from: string;
  to: string;
  rows: RevenueRow[];
  totals: RevenueTotals;
}

export interface MarkPaidPayload {
  appointmentId: number;
  paidAmount?: number;
  receiptNo?: string;
  paymentSource?: string;
}

export interface RecomputeRollupResponse {
  ok: boolean;
  date: string;
  // Other fields returned by recomputeRollup (rowsWritten etc.).
  [k: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class RevenueService {
  private apiUrl = `${environment.apiUrl}/revenue`;

  constructor(private http: HttpClient) {}

  /** GET /api/revenue?by=&from=&to= */
  getReport(params: {
    by: RevenueGroupBy;
    from: string;
    to: string;
  }): Observable<RevenueReport> {
    let httpParams = new HttpParams()
      .set('by', params.by)
      .set('from', params.from)
      .set('to', params.to);
    return this.http.get<RevenueReport>(this.apiUrl, { params: httpParams });
  }

  /** POST /api/revenue/payment/mark-paid */
  markPaid(payload: MarkPaidPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/payment/mark-paid`, payload);
  }

  /** POST /api/revenue/recompute — admin-triggered roll-up rebuild for a single date. */
  recomputeRollup(date: string): Observable<RecomputeRollupResponse> {
    return this.http.post<RecomputeRollupResponse>(`${this.apiUrl}/recompute`, { date });
  }
}
