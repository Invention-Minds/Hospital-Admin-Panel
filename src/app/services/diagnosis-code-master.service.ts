import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.4a — ICD-10 + CPT master service.

export type DiagnosisCodeMasterCategory = 'icd' | 'cpt';

/** null = general. A tagged code shows in that specialty's own diagnosis search. */
export type DiagnosisSpecialty = 'ophthalmology';
export const DIAGNOSIS_SPECIALTIES: { value: DiagnosisSpecialty; label: string }[] = [
  { value: 'ophthalmology', label: 'Ophthalmology' },
];

export interface DiagnosisCodeMaster {
  id: number;
  category: DiagnosisCodeMasterCategory;
  code: string;
  description: string;
  isActive: boolean;
  specialty: DiagnosisSpecialty | null;
  createdAt: string;
  createdBy: string | null;
}

@Injectable({ providedIn: 'root' })
export class DiagnosisCodeMasterService {
  private base = `${environment.apiUrl}/masters/diagnosis-codes`;

  constructor(private http: HttpClient) {}

  /** specialty: a specialty → only its codes; 'general' → untagged codes; omitted → all. */
  list(filters?: { category?: DiagnosisCodeMasterCategory; specialty?: DiagnosisSpecialty | 'general'; search?: string; limit?: number }): Observable<{ data: DiagnosisCodeMaster[] }> {
    let params = new HttpParams();
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.specialty) params = params.set('specialty', filters.specialty);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit !== undefined) params = params.set('limit', String(filters.limit));
    return this.http.get<{ data: DiagnosisCodeMaster[] }>(this.base, { params });
  }

  create(body: Partial<DiagnosisCodeMaster>): Observable<{ data: DiagnosisCodeMaster }> {
    return this.http.post<{ data: DiagnosisCodeMaster }>(this.base, body);
  }

  update(id: number, body: Partial<DiagnosisCodeMaster>): Observable<{ data: DiagnosisCodeMaster }> {
    return this.http.put<{ data: DiagnosisCodeMaster }>(`${this.base}/${id}`, body);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
