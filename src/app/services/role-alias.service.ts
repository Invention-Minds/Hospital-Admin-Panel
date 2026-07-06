import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 6 / Batch A — notification target-role alias admin API.

export interface RoleAlias {
  id: number;
  alias: string;
  targetRole: string;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoleAliasCreateBody {
  alias: string;
  targetRole: string;
  isActive?: boolean;
  notes?: string | null;
}

export interface RoleAliasUpdateBody {
  targetRole?: string;
  isActive?: boolean;
  notes?: string | null;
}

@Injectable({ providedIn: 'root' })
export class RoleAliasService {
  private base = `${environment.apiUrl}/role-aliases`;
  constructor(private http: HttpClient) {}

  list(): Observable<{ data: RoleAlias[]; total: number }> {
    return this.http.get<{ data: RoleAlias[]; total: number }>(this.base);
  }
  create(body: RoleAliasCreateBody): Observable<{ data: RoleAlias }> {
    return this.http.post<{ data: RoleAlias }>(this.base, body);
  }
  update(id: number, body: RoleAliasUpdateBody): Observable<{ data: RoleAlias }> {
    return this.http.put<{ data: RoleAlias }>(`${this.base}/${id}`, body);
  }
  delete(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.base}/${id}`);
  }
}
