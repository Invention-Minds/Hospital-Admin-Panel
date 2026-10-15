import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

export type HmisImportAction = 'ADMIT' | 'TRANSFER' | 'DISCHARGE' | 'UNCHANGED' | 'REVIEW' | 'SKIP';

export interface HmisImportItem {
  action: HmisImportAction;
  hmisAdmissionNo: string;
  prn: string;
  patientName: string;
  ward: string;
  bed: string;
  fromBed?: string;
  note?: string;
  error?: string;
}

export interface HmisImportResult {
  applied: boolean;
  files: Array<{ name: string; kind: 'ADMISSIONS' | 'OCCUPANCY' | 'DISCHARGES' | 'MOVEMENT'; rows: number }>;
  summary: Record<HmisImportAction, number> & { newWards: number; newBeds: number; newPatients: number; failed: number };
  wards: Array<{ hmisName: string; matchedTo: string | null; how: 'remembered' | 'same-name' | 'similar' | 'new' }>;
  items: HmisImportItem[];
}

export interface HmisImportStatus {
  at: string;
  by: string | null;
  summary: HmisImportResult['summary'] | null;
}

/** HMIS export upload (`/api/hmis-import`) — preview, apply, last import. */
@Injectable({ providedIn: 'root' })
export class HmisImportService {
  private base = `${environment.apiUrl}/hmis-import`;

  constructor(private http: HttpClient) {}

  preview(files: File[]): Observable<HmisImportResult> {
    return this.http.post<HmisImportResult>(`${this.base}/preview`, this.form(files));
  }

  apply(files: File[]): Observable<HmisImportResult> {
    return this.http.post<HmisImportResult>(`${this.base}/apply`, this.form(files));
  }

  status(): Observable<HmisImportStatus | null> {
    return this.http.get<HmisImportStatus | null>(`${this.base}/status`);
  }

  private form(files: File[]): FormData {
    const fd = new FormData();
    for (const f of files) fd.append('files', f, f.name);
    return fd;
  }
}
