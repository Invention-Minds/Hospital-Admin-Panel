import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.4d — OP Procedure service.

export type OpProcedureStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface OpProcedure {
  id: string;
  procedureNo: string;
  prn: string;
  patientName: string;
  age: number | null;
  gender: string | null;
  phoneNumber: string | null;
  opdAppointmentId: number | null;
  sourceModule: string;
  procedureName: string;
  procedureCode: string | null;
  departmentId: number | null;
  departmentName: string | null;
  performingDoctor: string;
  performingDoctorId: number | null;
  assistantName: string | null;
  roomName: string | null;
  anaesthesiaType: string | null;
  anaesthesiaAgent: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  preProcedureNotes: string | null;
  procedureSteps: string | null;
  findings: string | null;
  complications: string | null;
  conditionAtEnd: string | null;
  disposition: string | null;
  postProcedureInstructions: string | null;
  signedBy: string | null;
  signedAt: string | null;
  status: OpProcedureStatus;
  cancelReason: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class OpProcedureService {
  private apiUrl = `${environment.apiUrl}/op-procedures`;

  constructor(private http: HttpClient) {}

  list(filters?: { status?: OpProcedureStatus; prn?: string; fromDate?: string; toDate?: string; performingDoctor?: string }): Observable<{ data: OpProcedure[] }> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.prn) params = params.set('prn', filters.prn);
    if (filters?.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters?.toDate) params = params.set('toDate', filters.toDate);
    if (filters?.performingDoctor) params = params.set('performingDoctor', filters.performingDoctor);
    return this.http.get<{ data: OpProcedure[] }>(this.apiUrl, { params });
  }
  get(id: string): Observable<{ data: OpProcedure }> {
    return this.http.get<{ data: OpProcedure }>(`${this.apiUrl}/${id}`);
  }
  create(body: Partial<OpProcedure>): Observable<{ data: OpProcedure }> {
    return this.http.post<{ data: OpProcedure }>(this.apiUrl, body);
  }
  update(id: string, body: Partial<OpProcedure>): Observable<{ data: OpProcedure }> {
    return this.http.put<{ data: OpProcedure }>(`${this.apiUrl}/${id}`, body);
  }
  start(id: string): Observable<{ data: OpProcedure }> {
    return this.http.post<{ data: OpProcedure }>(`${this.apiUrl}/${id}/start`, {});
  }
  complete(id: string, body: { signatureId?: string; conditionAtEnd?: string; disposition?: string }): Observable<{ data: OpProcedure }> {
    return this.http.post<{ data: OpProcedure }>(`${this.apiUrl}/${id}/complete`, body);
  }
  cancel(id: string, reason: string): Observable<{ data: OpProcedure }> {
    return this.http.post<{ data: OpProcedure }>(`${this.apiUrl}/${id}/cancel`, { reason });
  }
}
