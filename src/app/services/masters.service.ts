import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environment/environment.prod';

/**
 * Masters service — single client surface for the unified `/masters` admin
 * page. Field names mirror the backend Prisma models 1:1.
 *
 * Some master endpoints are wrapped in `{ message, data }` envelopes (ward /
 * bed), others return raw rows (department / tablet / ot-room). The helpers
 * below normalise to the array/object shape the UI expects.
 */

// ─── Envelope helper ────────────────────────────────────────────────
type Envelope<T> = { message?: string; data: T } | T;
const unwrap = <T>() => map((res: Envelope<T>): T => {
  if (res && typeof res === 'object' && 'data' in (res as { data?: T })) {
    return (res as { data: T }).data;
  }
  return res as T;
});

// ─── Master shapes ──────────────────────────────────────────────────
export interface MasterDepartment {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MasterSurgeon {
  id: number;
  name: string;
  type: string;           // 'surgeon' | 'assistant'
  qualification?: string | null;
  isActive: boolean;
}

export interface MasterWard {
  id: string;
  wardName: string;
  wardCode: string;
  floor?: string | null;
  department: string;
  totalBeds: number;
  hmisWardId?: string | null;
}

export interface MasterBed {
  id: string;
  bedNumber: string;
  wardId: string;
  bedType: 'general' | 'ICU' | 'HDU' | 'isolation' | string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved' | string;
  ward?: { id: string; wardName: string; wardCode: string };
}

export interface MasterOtRoom {
  id: string;
  name: string;
  code: string;
  type: 'major' | 'minor' | 'cath-lab' | 'endoscopy';
  equipmentClass?: string | null;
  hepaFiltered: boolean;
  status: 'available' | 'in-use' | 'cleaning' | 'maintenance' | string;
}

export interface MasterTablet {
  id: number;
  genericName: string;
  brandName: string;
  type: string;
  description?: string | null;
}

export interface MasterLabTest {
  id: number;
  description: string;
  department: string;
}

export interface MasterRadiologyTest {
  id: number;
  description: string;
  department: string;
}

export interface MasterPackage {
  id: number;
  name: string;
  description?: string | null;
  deptIds?: string | null;     // comma-separated department IDs (legacy schema)
  radioIds?: string | null;    // comma-separated radiology service IDs (legacy schema)
}

/**
 * Radiology *services* (different from Radiology *tests*).
 * Source: `GET /api/radiology/packages` (misleading endpoint name — the
 * controller reads from `prisma.radioService.findMany`).
 * Used by the MHC Packages multi-select to render names against ids.
 */
export interface MasterRadioService {
  id: number;
  name: string;
  description?: string | null;
}

@Injectable({ providedIn: 'root' })
export class MastersService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ─── Departments ────────────────────────────────────────────────────
  listDepartments(): Observable<MasterDepartment[]> {
    return this.http.get<MasterDepartment[]>(`${this.base}/departments`);
  }
  createDepartment(name: string): Observable<MasterDepartment> {
    return this.http.post<MasterDepartment>(`${this.base}/departments`, { name });
  }
  updateDepartment(id: number, name: string): Observable<MasterDepartment> {
    return this.http.put<MasterDepartment>(`${this.base}/departments/${id}`, { name });
  }

  // ─── Surgeons ───────────────────────────────────────────────────────
  listSurgeons(type?: string): Observable<MasterSurgeon[]> {
    const qs = type ? `?type=${encodeURIComponent(type)}` : '';
    return this.http.get<MasterSurgeon[]>(`${this.base}/surgeons${qs}`);
  }
  createSurgeon(payload: { name: string; type: string; qualification?: string }): Observable<MasterSurgeon> {
    return this.http.post<MasterSurgeon>(`${this.base}/surgeons`, payload);
  }
  updateSurgeon(id: number, payload: Partial<MasterSurgeon>): Observable<MasterSurgeon> {
    return this.http.put<MasterSurgeon>(`${this.base}/surgeons/${id}`, payload);
  }

  // ─── Wards ──────────────────────────────────────────────────────────
  listWards(): Observable<MasterWard[]> {
    return this.http
      .get<Envelope<MasterWard[]>>(`${this.base}/ward/wards`)
      .pipe(unwrap<MasterWard[]>());
  }
  createWard(payload: Omit<MasterWard, 'id'>): Observable<MasterWard> {
    return this.http
      .post<Envelope<MasterWard>>(`${this.base}/ward/wards`, payload)
      .pipe(unwrap<MasterWard>());
  }
  updateWard(id: string, payload: Partial<MasterWard>): Observable<MasterWard> {
    return this.http
      .put<Envelope<MasterWard>>(`${this.base}/ward/ward/${id}`, payload)
      .pipe(unwrap<MasterWard>());
  }

  // ─── Beds ───────────────────────────────────────────────────────────
  listBeds(): Observable<MasterBed[]> {
    return this.http
      .get<Envelope<MasterBed[]>>(`${this.base}/ward/beds`)
      .pipe(unwrap<MasterBed[]>());
  }
  createBedsForWard(wardId: string, beds: Array<{ bedNumber: string; bedType: string }>): Observable<{ count: number }> {
    return this.http
      .post<Envelope<{ count: number }>>(`${this.base}/ward/ward/${wardId}/beds`, { beds })
      .pipe(unwrap<{ count: number }>());
  }
  updateBed(id: string, payload: { bedNumber: string; bedType: string }): Observable<MasterBed> {
    return this.http
      .put<Envelope<MasterBed>>(`${this.base}/ward/bed/${id}`, payload)
      .pipe(unwrap<MasterBed>());
  }
  updateBedStatus(id: string, status: string): Observable<MasterBed> {
    return this.http
      .put<Envelope<MasterBed>>(`${this.base}/ward/bed/${id}/status`, { status })
      .pipe(unwrap<MasterBed>());
  }

  // ─── OT Rooms ───────────────────────────────────────────────────────
  listOtRooms(): Observable<MasterOtRoom[]> {
    return this.http.get<MasterOtRoom[]>(`${this.base}/ot/rooms`);
  }
  createOtRoom(payload: Omit<MasterOtRoom, 'id' | 'status'>): Observable<MasterOtRoom> {
    return this.http.post<MasterOtRoom>(`${this.base}/ot/rooms`, payload);
  }
  updateOtRoom(id: string, payload: Omit<MasterOtRoom, 'id' | 'status' | 'code'>): Observable<MasterOtRoom> {
    return this.http.put<MasterOtRoom>(`${this.base}/ot/rooms/${id}`, payload);
  }
  updateOtRoomStatus(id: string, status: MasterOtRoom['status']): Observable<MasterOtRoom> {
    return this.http.put<MasterOtRoom>(`${this.base}/ot/rooms/${id}/status`, { status });
  }

  // ─── Tablets / medications ──────────────────────────────────────────
  listTablets(): Observable<MasterTablet[]> {
    return this.http.get<MasterTablet[]>(`${this.base}/prescription/tablets`);
  }
  createTablet(payload: Omit<MasterTablet, 'id'>): Observable<MasterTablet> {
    return this.http.post<MasterTablet>(`${this.base}/prescription/tablets`, payload);
  }
  updateTablet(id: number, payload: Omit<MasterTablet, 'id'>): Observable<MasterTablet> {
    return this.http.put<MasterTablet>(`${this.base}/prescription/tablets/${id}`, payload);
  }

  // ─── Lab tests ──────────────────────────────────────────────────────
  listLabTests(): Observable<MasterLabTest[]> {
    return this.http.get<MasterLabTest[]>(`${this.base}/investigation/lab-tests`);
  }
  createLabTest(payload: Omit<MasterLabTest, 'id'>): Observable<MasterLabTest> {
    return this.http.post<MasterLabTest>(`${this.base}/investigation/lab-tests`, payload);
  }
  updateLabTest(id: number, payload: Omit<MasterLabTest, 'id'>): Observable<MasterLabTest> {
    return this.http.put<MasterLabTest>(`${this.base}/investigation/lab-tests/${id}`, payload);
  }

  // ─── Radiology tests ────────────────────────────────────────────────
  listRadiologyTests(): Observable<MasterRadiologyTest[]> {
    return this.http.get<MasterRadiologyTest[]>(`${this.base}/investigation/radiology-tests`);
  }
  createRadiologyTest(payload: Omit<MasterRadiologyTest, 'id'>): Observable<MasterRadiologyTest> {
    return this.http.post<MasterRadiologyTest>(`${this.base}/investigation/radiology-tests`, payload);
  }
  updateRadiologyTest(id: number, payload: Omit<MasterRadiologyTest, 'id'>): Observable<MasterRadiologyTest> {
    return this.http.put<MasterRadiologyTest>(`${this.base}/investigation/radiology-tests/${id}`, payload);
  }

  // ─── MHC Packages ───────────────────────────────────────────────────
  listPackages(): Observable<MasterPackage[]> {
    return this.http.get<MasterPackage[]>(`${this.base}/services/packages`);
  }
  createPackage(payload: Omit<MasterPackage, 'id'>): Observable<MasterPackage> {
    return this.http.post<MasterPackage>(`${this.base}/services/packages`, payload);
  }
  updatePackage(id: number, payload: Omit<MasterPackage, 'id'>): Observable<MasterPackage> {
    return this.http.put<MasterPackage>(`${this.base}/services/packages/${id}`, payload);
  }

  /** Radio services — used by the MHC Packages multi-select. Read-only here;
   *  CRUD for RadioService lives on the existing /radiology-services page. */
  listRadioServices(): Observable<MasterRadioService[]> {
    return this.http.get<MasterRadioService[]>(`${this.base}/radiology/packages`);
  }
}
