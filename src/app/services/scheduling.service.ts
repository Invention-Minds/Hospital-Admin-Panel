import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Scheduling service — shifts master, roster CRUD, duty acknowledgement.
 *
 * Routes consumed (all under `/api/scheduling`):
 *   GET/POST/PUT /shifts                 — ShiftDefinition master
 *   GET/POST/PUT/DELETE /assignments     — StaffShiftAssignment CRUD
 *   POST /assignments/:id/acknowledge    — sign duty ack
 *   GET /my-pending-ack                  — drives the post-login modal
 *   GET /kiosk                           — ward-tablet sign-in list
 *   GET /who-was-on-duty                 — audit query
 *   GET /staff                           — picker for the roster UI
 */

export interface Shift {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  sequence: number;
  isActive: boolean;
}

export interface SchedulingStaff {
  id: number;
  username: string;
  employeeId?: string | null;
  role: string;
  subAdminType?: string | null;
}

export interface ShiftAssignment {
  id: string;
  userId: number;
  user?: SchedulingStaff;
  shiftId: string;
  shift?: Shift;
  wardId?: string | null;
  ward?: { id: string; wardName: string; wardCode: string } | null;
  date: string;
  status: 'SCHEDULED' | 'ACKNOWLEDGED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  notes?: string | null;
  acknowledgements?: Array<{
    id: string;
    acknowledgedAt: string;
    source: 'MODAL' | 'KIOSK';
    signatureId?: string | null;
  }>;
}

export interface UpsertAssignmentPayload {
  userId: number;
  shiftId: string;
  wardId?: string | null;
  date: string; // YYYY-MM-DD
  status?: ShiftAssignment['status'];
  notes?: string;
}

export interface DutyAck {
  id: string;
  assignmentId: string;
  userId: number;
  acknowledgedAt: string;
  signatureId?: string | null;
  source: 'MODAL' | 'KIOSK';
  notes?: string | null;
}

export interface WhoWasOnDutyResponse {
  at: string;
  wardId: string | null;
  onDuty: Array<{
    userId: number;
    username: string;
    employeeId?: string | null;
    role: string;
    subAdminType?: string | null;
    shift: { code: string; name: string };
    ward: { id: string; wardName: string; wardCode: string } | null;
    acknowledgedAt: string | null;
    signatureId: string | null;
  }>;
}

@Injectable({ providedIn: 'root' })
export class SchedulingService {
  private base = `${environment.apiUrl}/scheduling`;

  constructor(private http: HttpClient) {}

  // ─── Shifts master ──────────────────────────────────────────────────
  listShifts(): Observable<Shift[]> {
    return this.http.get<Shift[]>(`${this.base}/shifts`);
  }
  upsertShift(payload: Partial<Shift>): Observable<Shift> {
    return payload.id
      ? this.http.put<Shift>(`${this.base}/shifts/${payload.id}`, payload)
      : this.http.post<Shift>(`${this.base}/shifts`, payload);
  }

  // ─── Roster ─────────────────────────────────────────────────────────
  listAssignments(filters: {
    from?: string; to?: string; wardId?: string;
    userId?: number; shiftId?: string; status?: string;
  }): Observable<ShiftAssignment[]> {
    let params = new HttpParams();
    if (filters.from) params = params.set('from', filters.from);
    if (filters.to) params = params.set('to', filters.to);
    if (filters.wardId) params = params.set('wardId', filters.wardId);
    if (filters.userId !== undefined) params = params.set('userId', String(filters.userId));
    if (filters.shiftId) params = params.set('shiftId', filters.shiftId);
    if (filters.status) params = params.set('status', filters.status);
    return this.http.get<ShiftAssignment[]>(`${this.base}/assignments`, { params });
  }
  createAssignment(payload: UpsertAssignmentPayload): Observable<ShiftAssignment> {
    return this.http.post<ShiftAssignment>(`${this.base}/assignments`, payload);
  }
  updateAssignment(id: string, payload: UpsertAssignmentPayload): Observable<ShiftAssignment> {
    return this.http.put<ShiftAssignment>(`${this.base}/assignments/${id}`, payload);
  }
  deleteAssignment(id: string): Observable<unknown> {
    return this.http.delete(`${this.base}/assignments/${id}`);
  }

  // ─── Acknowledgement ────────────────────────────────────────────────
  acknowledge(assignmentId: string, body: {
    signatureId?: string;
    notes?: string;
    source?: 'MODAL' | 'KIOSK';
  }): Observable<DutyAck> {
    return this.http.post<DutyAck>(`${this.base}/assignments/${assignmentId}/acknowledge`, body);
  }

  // ─── Driver endpoints ───────────────────────────────────────────────
  myPendingAck(): Observable<ShiftAssignment[]> {
    return this.http.get<ShiftAssignment[]>(`${this.base}/my-pending-ack`);
  }
  kioskList(wardId: string | undefined, date: string): Observable<ShiftAssignment[]> {
    let params = new HttpParams().set('date', date);
    if (wardId) params = params.set('wardId', wardId);
    return this.http.get<ShiftAssignment[]>(`${this.base}/kiosk`, { params });
  }
  whoWasOnDuty(wardId: string | undefined, atIso: string): Observable<WhoWasOnDutyResponse> {
    let params = new HttpParams().set('at', atIso);
    if (wardId) params = params.set('wardId', wardId);
    return this.http.get<WhoWasOnDutyResponse>(`${this.base}/who-was-on-duty`, { params });
  }
  listStaff(): Observable<SchedulingStaff[]> {
    return this.http.get<SchedulingStaff[]>(`${this.base}/staff`);
  }
}
