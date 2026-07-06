import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.2 — Surgical Notes + Other Notes templates.

export interface OtTemplate {
  id: string;
  name: string;
  departmentId: number | null;
  bodyTemplate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

@Injectable({ providedIn: 'root' })
export class OtTemplatesService {
  private apiUrl = `${environment.apiUrl}/ot/templates`;

  constructor(private http: HttpClient) {}

  listSurgical(): Observable<{ data: OtTemplate[] }> {
    return this.http.get<{ data: OtTemplate[] }>(`${this.apiUrl}/surgical`);
  }
  getSurgical(id: string): Observable<{ data: OtTemplate }> {
    return this.http.get<{ data: OtTemplate }>(`${this.apiUrl}/surgical/${id}`);
  }
  createSurgical(body: Partial<OtTemplate>): Observable<{ data: OtTemplate }> {
    return this.http.post<{ data: OtTemplate }>(`${this.apiUrl}/surgical`, body);
  }
  updateSurgical(id: string, body: Partial<OtTemplate>): Observable<{ data: OtTemplate }> {
    return this.http.put<{ data: OtTemplate }>(`${this.apiUrl}/surgical/${id}`, body);
  }

  listOther(): Observable<{ data: OtTemplate[] }> {
    return this.http.get<{ data: OtTemplate[] }>(`${this.apiUrl}/other`);
  }
  createOther(body: Partial<OtTemplate>): Observable<{ data: OtTemplate }> {
    return this.http.post<{ data: OtTemplate }>(`${this.apiUrl}/other`, body);
  }
  updateOther(id: string, body: Partial<OtTemplate>): Observable<{ data: OtTemplate }> {
    return this.http.put<{ data: OtTemplate }>(`${this.apiUrl}/other/${id}`, body);
  }
}
