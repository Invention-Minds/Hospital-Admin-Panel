import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.2 — services for the new per-schedule resources introduced by
// Phase 9.1: multi-staff, multi-surgery, equipment usage, consumable
// issue/return ledger, and consumable set master.

export type OtStaffRole =
  | 'surgeon' | 'co-surgeon' | 'assistant-surgeon'
  | 'anaesthetist' | 'scrub-nurse' | 'floor-nurse'
  | 'runner' | 'technician';

export interface OtScheduleStaff {
  id: number;
  scheduleId: string;
  staffId: number | null;
  staffName: string;
  role: OtStaffRole;
  isPrimary: boolean;
  surgeryId: number | null;
}

export interface OtScheduleSurgery {
  id: number;
  scheduleId: string;
  departmentId: number | null;
  departmentName: string | null;
  categoryCode: string | null;
  surgeryName: string;
  surgeryCode: string | null;
  surgeryType: string | null;
  isPrimary: boolean;
}

export interface OtEquipmentUsage {
  id: number;
  scheduleId: string;
  surgeryId: number | null;
  equipmentName: string;
  equipmentCode: string | null;
  usedMinutes: number;
  notes: string | null;
}

export interface OtConsumableSetItem {
  id: number;
  setId: number;
  tabletMasterId: number | null;
  itemName: string;
  defaultQuantity: number;
  uom: string | null;
}

export interface OtConsumableSet {
  id: number;
  name: string;
  departmentId: number | null;
  description: string | null;
  isActive: boolean;
  items?: OtConsumableSetItem[];
}

export interface OtConsumableIssue {
  id: number;
  scheduleId: string;
  setId: number | null;
  tabletMasterId: number | null;
  itemName: string;
  quantity: number;
  uom: string | null;
  itemRemarks: string | null;
  pharmacyStore: string | null;
  prescribedBy: string | null;
  direction: 'issued' | 'returned';
  issuedAt: string;
}

@Injectable({ providedIn: 'root' })
export class OtScheduleExtrasService {
  private apiUrl = `${environment.apiUrl}/ot`;

  constructor(private http: HttpClient) {}

  // ─── Staff ─────────────────────────────────────────────────────────
  listStaff(scheduleId: string): Observable<{ data: OtScheduleStaff[] }> {
    return this.http.get<{ data: OtScheduleStaff[] }>(`${this.apiUrl}/schedules/${scheduleId}/staff`);
  }
  addStaff(scheduleId: string, body: Partial<OtScheduleStaff>): Observable<{ data: OtScheduleStaff }> {
    return this.http.post<{ data: OtScheduleStaff }>(`${this.apiUrl}/schedules/${scheduleId}/staff`, body);
  }
  updateStaff(scheduleId: string, rowId: number, body: Partial<OtScheduleStaff>): Observable<{ data: OtScheduleStaff }> {
    return this.http.put<{ data: OtScheduleStaff }>(`${this.apiUrl}/schedules/${scheduleId}/staff/${rowId}`, body);
  }
  removeStaff(scheduleId: string, rowId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/schedules/${scheduleId}/staff/${rowId}`);
  }

  // ─── Surgeries ─────────────────────────────────────────────────────
  listSurgeries(scheduleId: string): Observable<{ data: OtScheduleSurgery[] }> {
    return this.http.get<{ data: OtScheduleSurgery[] }>(`${this.apiUrl}/schedules/${scheduleId}/surgeries`);
  }
  addSurgery(scheduleId: string, body: Partial<OtScheduleSurgery>): Observable<{ data: OtScheduleSurgery }> {
    return this.http.post<{ data: OtScheduleSurgery }>(`${this.apiUrl}/schedules/${scheduleId}/surgeries`, body);
  }
  updateSurgery(scheduleId: string, rowId: number, body: Partial<OtScheduleSurgery>): Observable<{ data: OtScheduleSurgery }> {
    return this.http.put<{ data: OtScheduleSurgery }>(`${this.apiUrl}/schedules/${scheduleId}/surgeries/${rowId}`, body);
  }
  removeSurgery(scheduleId: string, rowId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/schedules/${scheduleId}/surgeries/${rowId}`);
  }

  // ─── Equipment ─────────────────────────────────────────────────────
  listEquipment(scheduleId: string): Observable<{ data: OtEquipmentUsage[] }> {
    return this.http.get<{ data: OtEquipmentUsage[] }>(`${this.apiUrl}/schedules/${scheduleId}/equipment`);
  }
  addEquipment(scheduleId: string, body: Partial<OtEquipmentUsage>): Observable<{ data: OtEquipmentUsage }> {
    return this.http.post<{ data: OtEquipmentUsage }>(`${this.apiUrl}/schedules/${scheduleId}/equipment`, body);
  }
  updateEquipment(scheduleId: string, rowId: number, body: Partial<OtEquipmentUsage>): Observable<{ data: OtEquipmentUsage }> {
    return this.http.put<{ data: OtEquipmentUsage }>(`${this.apiUrl}/schedules/${scheduleId}/equipment/${rowId}`, body);
  }
  removeEquipment(scheduleId: string, rowId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/schedules/${scheduleId}/equipment/${rowId}`);
  }

  // ─── Consumable Sets (master) ──────────────────────────────────────
  listConsumableSets(includeItems = false, departmentId?: number): Observable<{ data: OtConsumableSet[] }> {
    let params = new HttpParams();
    if (includeItems) params = params.set('includeItems', '1');
    if (departmentId !== undefined) params = params.set('departmentId', String(departmentId));
    return this.http.get<{ data: OtConsumableSet[] }>(`${this.apiUrl}/consumable-sets`, { params });
  }
  getConsumableSet(id: number): Observable<{ data: OtConsumableSet }> {
    return this.http.get<{ data: OtConsumableSet }>(`${this.apiUrl}/consumable-sets/${id}`);
  }
  createConsumableSet(body: Partial<OtConsumableSet> & { items?: Partial<OtConsumableSetItem>[] }): Observable<{ data: OtConsumableSet }> {
    return this.http.post<{ data: OtConsumableSet }>(`${this.apiUrl}/consumable-sets`, body);
  }
  updateConsumableSet(id: number, body: Partial<OtConsumableSet>): Observable<{ data: OtConsumableSet }> {
    return this.http.put<{ data: OtConsumableSet }>(`${this.apiUrl}/consumable-sets/${id}`, body);
  }
  addConsumableSetItem(setId: number, body: Partial<OtConsumableSetItem>): Observable<{ data: OtConsumableSetItem }> {
    return this.http.post<{ data: OtConsumableSetItem }>(`${this.apiUrl}/consumable-sets/${setId}/items`, body);
  }
  removeConsumableSetItem(setId: number, itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/consumable-sets/${setId}/items/${itemId}`);
  }

  // ─── Consumable Issues (per-schedule ledger) ───────────────────────
  listConsumableIssues(scheduleId: string, direction?: 'issued' | 'returned'): Observable<{ data: OtConsumableIssue[] }> {
    let params = new HttpParams();
    if (direction) params = params.set('direction', direction);
    return this.http.get<{ data: OtConsumableIssue[] }>(`${this.apiUrl}/schedules/${scheduleId}/consumables`, { params });
  }
  issueConsumables(scheduleId: string, items: Partial<OtConsumableIssue>[]): Observable<{ data: OtConsumableIssue[] }> {
    return this.http.post<{ data: OtConsumableIssue[] }>(`${this.apiUrl}/schedules/${scheduleId}/consumables/issue`, { items });
  }
  returnConsumables(scheduleId: string, items: Partial<OtConsumableIssue>[]): Observable<{ data: OtConsumableIssue[] }> {
    return this.http.post<{ data: OtConsumableIssue[] }>(`${this.apiUrl}/schedules/${scheduleId}/consumables/return`, { items });
  }
}
