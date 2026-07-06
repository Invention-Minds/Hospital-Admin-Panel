import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Phase NS-4 — Nursing Station admin.
 *
 * Backs the /nursing-stations page (owned by the Nursing Superintendent).
 * A station groups wards; nurses are mapped to stations; a nurse's visible
 * wards = union of wards across their stations. Routes under
 * `/api/nursing-stations` — write routes are gated server-side to the
 * Nursing Superintendent + super_admin.
 */

export interface StationWardRef {
  id: string;
  wardName: string;
  wardCode: string;
  department?: string;
}

export interface StationNurseRef {
  id: number;
  username: string;
  fullName: string | null;
  employeeId: string | null;
  designation?: string | null;
}

export type StationType = 'IPD' | 'OPD';

export interface NursingStationRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  type: StationType;
  isActive: boolean;
  wards: StationWardRef[];
  nurses: StationNurseRef[];
  wardCount?: number;
  nurseCount?: number;
}

export interface StationCreateBody {
  name: string;
  code: string;
  description?: string | null;
  type?: StationType;
  isActive?: boolean;
  wardIds?: string[];
}

export type StationUpdateBody = Partial<Pick<StationCreateBody, 'name' | 'description' | 'type' | 'isActive'>>;

@Injectable({ providedIn: 'root' })
export class NursingStationService {
  private base = `${environment.apiUrl}/nursing-stations`;

  constructor(private http: HttpClient) {}

  list(includeInactive = false): Observable<{ data: NursingStationRow[] }> {
    let params = new HttpParams();
    if (includeInactive) params = params.set('includeInactive', '1');
    return this.http.get<{ data: NursingStationRow[] }>(this.base, { params });
  }

  /** Stations the logged-in nurse is assigned to (for scoped filters). */
  listMine(): Observable<{ data: NursingStationRow[] }> {
    return this.http.get<{ data: NursingStationRow[] }>(`${this.base}/mine`);
  }

  get(id: string): Observable<{ data: NursingStationRow }> {
    return this.http.get<{ data: NursingStationRow }>(`${this.base}/${id}`);
  }

  create(body: StationCreateBody): Observable<{ data: NursingStationRow }> {
    return this.http.post<{ data: NursingStationRow }>(this.base, body);
  }

  update(id: string, body: StationUpdateBody): Observable<{ data: NursingStationRow }> {
    return this.http.patch<{ data: NursingStationRow }>(`${this.base}/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  setWards(id: string, wardIds: string[]): Observable<{ data: { id: string; wardIds: string[] } }> {
    return this.http.put<{ data: { id: string; wardIds: string[] } }>(`${this.base}/${id}/wards`, { wardIds });
  }

  assignNurses(id: string, userIds: number[]): Observable<{ data: { stationId: string; assigned: number[]; rejectedNonNurse: number[] } }> {
    return this.http.post<{ data: { stationId: string; assigned: number[]; rejectedNonNurse: number[] } }>(
      `${this.base}/${id}/nurses`, { userIds });
  }

  unassignNurse(id: string, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/nurses/${userId}`);
  }
}
