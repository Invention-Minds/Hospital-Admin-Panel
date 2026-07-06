import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.10 — Nurse / clinical-staff admin.
//
// Backs the /staff/nurses page. The backend stores nurses as User rows
// (role=sub_admin, subAdminType='nurse') plus the profile fields added
// in Phase 9.10 (fullName, designation, qualification, phoneNumber,
// primaryWardId, joiningDate, dateOfBirth).

export type NurseDesignation =
  | 'Staff Nurse' | 'Senior Sister' | 'Charge Nurse' | 'Nurse Manager'
  | 'ICU Nurse' | 'OT Nurse' | 'Scrub Nurse' | 'Floor Nurse'
  | 'Anaesthesia Technician' | 'OT Technician' | 'Runner' | 'Other';

export const NURSE_DESIGNATIONS: NurseDesignation[] = [
  'Staff Nurse', 'Senior Sister', 'Charge Nurse', 'Nurse Manager',
  'ICU Nurse', 'OT Nurse', 'Scrub Nurse', 'Floor Nurse',
  'Anaesthesia Technician', 'OT Technician', 'Runner', 'Other',
];

export const OT_ELIGIBLE_DESIGNATIONS: NurseDesignation[] = [
  'OT Nurse', 'Scrub Nurse', 'Floor Nurse',
  'OT Technician', 'Anaesthesia Technician', 'Runner',
];

export interface NurseRow {
  id: number;
  username: string;
  employeeId: string | null;
  fullName: string | null;
  designation: NurseDesignation | null;
  qualification: string | null;
  phoneNumber: string | null;
  primaryWardId: string | null;
  primaryWard?: { id: string; wardName: string; wardCode: string } | null;
  joiningDate: string | null;
  dateOfBirth: string | null;
  isActive: boolean;
  createdAt: string;
  otStaffMasters?: Array<{ id: number; role: string; isActive: boolean }>;
}

export interface NurseListFilters {
  search?: string;
  designation?: NurseDesignation | '';
  wardId?: string | '';
  includeInactive?: boolean;
}

export interface NurseCreateBody {
  username: string;
  password: string;
  employeeId?: string | null;
  fullName: string;
  designation: NurseDesignation;
  qualification?: string | null;
  phoneNumber?: string | null;
  primaryWardId?: string | null;
  joiningDate?: string | null;
  dateOfBirth?: string | null;
  isActive?: boolean;
}

export type NurseUpdateBody = Partial<Omit<NurseCreateBody, 'username' | 'password'>>;

@Injectable({ providedIn: 'root' })
export class NurseStaffService {
  private base = `${environment.apiUrl}/staff/nurses`;

  constructor(private http: HttpClient) {}

  list(filters: NurseListFilters = {}): Observable<{ data: NurseRow[] }> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.designation) params = params.set('designation', filters.designation);
    if (filters.wardId) params = params.set('wardId', filters.wardId);
    if (filters.includeInactive) params = params.set('includeInactive', '1');
    return this.http.get<{ data: NurseRow[] }>(this.base, { params });
  }

  create(body: NurseCreateBody): Observable<{ data: NurseRow }> {
    return this.http.post<{ data: NurseRow }>(this.base, body);
  }

  update(id: number, body: NurseUpdateBody): Observable<{ data: NurseRow }> {
    return this.http.patch<{ data: NurseRow }>(`${this.base}/${id}`, body);
  }

  deactivate(id: number): Observable<{ data: { id: number; isActive: boolean } }> {
    return this.http.patch<{ data: { id: number; isActive: boolean } }>(`${this.base}/${id}/deactivate`, {});
  }

  resetPassword(id: number, newPassword: string): Observable<{ data: { id: number; ok: boolean } }> {
    return this.http.post<{ data: { id: number; ok: boolean } }>(`${this.base}/${id}/reset-password`, { newPassword });
  }

  syncToOtStaff(id: number): Observable<{ data: { id: number; role: string } }> {
    return this.http.post<{ data: { id: number; role: string } }>(`${this.base}/${id}/sync-ot`, {});
  }
}
