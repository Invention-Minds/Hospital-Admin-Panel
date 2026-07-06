import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.5e — OT Setup masters (Equipment + Fixed Surgical Notes).

export interface OtEquipmentMaster {
  id: number;
  name: string;
  code: string | null;
  category: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FixedSurgicalNote {
  id: number;
  code: string;
  name: string;
  departmentId: number | null;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OtStaffRole =
  | 'scrub-nurse' | 'floor-nurse' | 'runner'
  | 'ot-technician' | 'anaesthesia-technician'
  | 'cssd' | 'biomedical' | 'other';

export interface OtStaffMaster {
  id: number;
  name: string;
  employeeCode: string | null;
  role: OtStaffRole;
  designation: string | null;
  departmentId: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SurgeryProcedureMaster {
  id: number;
  name: string;
  code: string | null;
  departmentId: number | null;
  categoryCode: string | null;
  surgeryType: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class OtSetupService {
  private base = `${environment.apiUrl}/ot/setup`;

  constructor(private http: HttpClient) {}

  // ─── Equipment Master ──────────────────────────────────────────────
  listEquipment(includeInactive = false): Observable<{ data: OtEquipmentMaster[] }> {
    let p = new HttpParams();
    if (includeInactive) p = p.set('includeInactive', '1');
    return this.http.get<{ data: OtEquipmentMaster[] }>(`${this.base}/equipment-master`, { params: p });
  }
  createEquipment(body: Partial<OtEquipmentMaster>): Observable<{ data: OtEquipmentMaster }> {
    return this.http.post<{ data: OtEquipmentMaster }>(`${this.base}/equipment-master`, body);
  }
  updateEquipment(id: number, body: Partial<OtEquipmentMaster>): Observable<{ data: OtEquipmentMaster }> {
    return this.http.put<{ data: OtEquipmentMaster }>(`${this.base}/equipment-master/${id}`, body);
  }
  removeEquipment(id: number): Observable<{ data: OtEquipmentMaster }> {
    return this.http.delete<{ data: OtEquipmentMaster }>(`${this.base}/equipment-master/${id}`);
  }

  // ─── Fixed Surgical Notes ──────────────────────────────────────────
  listFixedNotes(includeInactive = false): Observable<{ data: FixedSurgicalNote[] }> {
    let p = new HttpParams();
    if (includeInactive) p = p.set('includeInactive', '1');
    return this.http.get<{ data: FixedSurgicalNote[] }>(`${this.base}/fixed-surgical-notes`, { params: p });
  }
  createFixedNote(body: Partial<FixedSurgicalNote>): Observable<{ data: FixedSurgicalNote }> {
    return this.http.post<{ data: FixedSurgicalNote }>(`${this.base}/fixed-surgical-notes`, body);
  }
  updateFixedNote(id: number, body: Partial<FixedSurgicalNote>): Observable<{ data: FixedSurgicalNote }> {
    return this.http.put<{ data: FixedSurgicalNote }>(`${this.base}/fixed-surgical-notes/${id}`, body);
  }
  removeFixedNote(id: number): Observable<{ data: FixedSurgicalNote }> {
    return this.http.delete<{ data: FixedSurgicalNote }>(`${this.base}/fixed-surgical-notes/${id}`);
  }

  // ─── Staff Master (Phase 9.5j) ──────────────────────────────────────
  listStaffMaster(includeInactive = false, role?: OtStaffRole): Observable<{ data: OtStaffMaster[] }> {
    let p = new HttpParams();
    if (includeInactive) p = p.set('includeInactive', '1');
    if (role) p = p.set('role', role);
    return this.http.get<{ data: OtStaffMaster[] }>(`${this.base}/staff-master`, { params: p });
  }
  createStaffMaster(body: Partial<OtStaffMaster>): Observable<{ data: OtStaffMaster }> {
    return this.http.post<{ data: OtStaffMaster }>(`${this.base}/staff-master`, body);
  }
  updateStaffMaster(id: number, body: Partial<OtStaffMaster>): Observable<{ data: OtStaffMaster }> {
    return this.http.put<{ data: OtStaffMaster }>(`${this.base}/staff-master/${id}`, body);
  }
  removeStaffMaster(id: number): Observable<{ data: OtStaffMaster }> {
    return this.http.delete<{ data: OtStaffMaster }>(`${this.base}/staff-master/${id}`);
  }

  // ─── Surgery / Procedure Master (Phase 9.5j) ────────────────────────
  listSurgeryMaster(includeInactive = false, departmentId?: number): Observable<{ data: SurgeryProcedureMaster[] }> {
    let p = new HttpParams();
    if (includeInactive) p = p.set('includeInactive', '1');
    if (departmentId !== undefined) p = p.set('departmentId', String(departmentId));
    return this.http.get<{ data: SurgeryProcedureMaster[] }>(`${this.base}/surgery-master`, { params: p });
  }
  createSurgeryMaster(body: Partial<SurgeryProcedureMaster>): Observable<{ data: SurgeryProcedureMaster }> {
    return this.http.post<{ data: SurgeryProcedureMaster }>(`${this.base}/surgery-master`, body);
  }
  updateSurgeryMaster(id: number, body: Partial<SurgeryProcedureMaster>): Observable<{ data: SurgeryProcedureMaster }> {
    return this.http.put<{ data: SurgeryProcedureMaster }>(`${this.base}/surgery-master/${id}`, body);
  }
  removeSurgeryMaster(id: number): Observable<{ data: SurgeryProcedureMaster }> {
    return this.http.delete<{ data: SurgeryProcedureMaster }>(`${this.base}/surgery-master/${id}`);
  }
}
