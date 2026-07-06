import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.3a — OT report service.

export interface SurgeryRegisterRow {
  id: string;
  date: string;
  otRoom: string | null;
  prn: string | null;
  patientName: string | null;
  procedureName: string;
  department: string | null;
  category: string | null;
  surgeonName: string | null;
  anaesthesiologistName: string | null;
  urgency: string;
  status: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  otAdmissionAt: string | null;
  otDischargeAt: string | null;
}

export interface EquipmentUtilizationRow {
  equipmentName: string;
  totalMinutes: number;
  uses: number;
  distinctSchedules: number;
  avgMinutesPerUse: number;
}

export interface TimeBookedVsActualRow {
  id: string;
  date: string;
  prn: string | null;
  patientName: string | null;
  procedureName: string;
  surgeonName: string | null;
  status: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  otAdmissionAt: string | null;
  otDischargeAt: string | null;
  plannedMinutes: number;
  actualMinutes: number | null;
  startDeltaMinutes: number | null;
  durationDeltaMinutes: number | null;
  otOccupancyMinutes: number | null;
}

export interface TimeReportMeta {
  from: string;
  to: string;
  schedules: number;
  avgPlannedMins: number;
  avgActualMins: number;
  avgStartDelayMins: number;
}

@Injectable({ providedIn: 'root' })
export class OtReportsService {
  private apiUrl = `${environment.apiUrl}/ot/reports`;

  constructor(private http: HttpClient) {}

  surgeryRegister(filters?: { fromDate?: string; toDate?: string; status?: string; surgeonName?: string }): Observable<{ data: SurgeryRegisterRow[]; meta: { from: string; to: string; total: number } }> {
    let params = new HttpParams();
    if (filters?.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters?.toDate) params = params.set('toDate', filters.toDate);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.surgeonName) params = params.set('surgeonName', filters.surgeonName);
    return this.http.get<{ data: SurgeryRegisterRow[]; meta: { from: string; to: string; total: number } }>(
      `${this.apiUrl}/surgery-register`, { params });
  }

  equipmentUtilization(filters?: { fromDate?: string; toDate?: string }): Observable<{ data: EquipmentUtilizationRow[]; meta: { from: string; to: string; totalEntries: number } }> {
    let params = new HttpParams();
    if (filters?.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters?.toDate) params = params.set('toDate', filters.toDate);
    return this.http.get<{ data: EquipmentUtilizationRow[]; meta: { from: string; to: string; totalEntries: number } }>(
      `${this.apiUrl}/equipment-utilization`, { params });
  }

  timeBookedVsActual(filters?: { fromDate?: string; toDate?: string }): Observable<{ data: TimeBookedVsActualRow[]; meta: TimeReportMeta }> {
    let params = new HttpParams();
    if (filters?.fromDate) params = params.set('fromDate', filters.fromDate);
    if (filters?.toDate) params = params.set('toDate', filters.toDate);
    return this.http.get<{ data: TimeBookedVsActualRow[]; meta: TimeReportMeta }>(
      `${this.apiUrl}/time-booked-vs-actual`, { params });
  }
}
