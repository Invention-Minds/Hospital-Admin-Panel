import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.3c — ICD-10 + CPT codes per admission service.

export type DiagnosisCodeCategory = 'icd-provisional' | 'icd-final' | 'cpt';

export interface AdmissionDiagnosisCode {
  id: string;
  admissionId: string;
  category: DiagnosisCodeCategory;
  code: string;
  description: string;
  createdAt: string;
  createdBy: string | null;
}

@Injectable({ providedIn: 'root' })
export class DiagnosisCodeService {
  constructor(private http: HttpClient) {}

  private base(admissionId: string) {
    return `${environment.apiUrl}/ipd/admission/${admissionId}/diagnosis-codes`;
  }

  list(admissionId: string, category?: DiagnosisCodeCategory): Observable<{ data: AdmissionDiagnosisCode[] }> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    return this.http.get<{ data: AdmissionDiagnosisCode[] }>(this.base(admissionId), { params });
  }
  add(admissionId: string, body: { category: DiagnosisCodeCategory; code: string; description: string }): Observable<{ data: AdmissionDiagnosisCode }> {
    return this.http.post<{ data: AdmissionDiagnosisCode }>(this.base(admissionId), body);
  }
  update(admissionId: string, id: string, body: Partial<{ category: DiagnosisCodeCategory; code: string; description: string }>): Observable<{ data: AdmissionDiagnosisCode }> {
    return this.http.put<{ data: AdmissionDiagnosisCode }>(`${this.base(admissionId)}/${id}`, body);
  }
  remove(admissionId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.base(admissionId)}/${id}`);
  }
}
