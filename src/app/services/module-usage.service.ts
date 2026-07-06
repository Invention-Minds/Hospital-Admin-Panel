import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Module Utilization analytics — per-module active vs inactive users,
// sourced from the backend AppAuditLog aggregation.

export interface ModuleUsageUser {
  id: number;
  name: string;
  role: string;
}

export interface ModuleUsageRow {
  key: string;
  label: string;
  eligibleCount: number;
  activeCount: number;
  inactiveCount: number;
  adoptionPct: number;
  activeUsers: ModuleUsageUser[];
  inactiveUsers: ModuleUsageUser[];
}

export interface ModuleUsageSummary {
  from: string;
  to: string;
  totalEligible: number;
  modules: ModuleUsageRow[];
}

@Injectable({
  providedIn: 'root',
})
export class ModuleUsageService {
  private baseUrl = `${environment.apiUrl}/module-usage`;

  constructor(private http: HttpClient) {}

  getSummary(from?: string, to?: string): Observable<ModuleUsageSummary> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<ModuleUsageSummary>(`${this.baseUrl}/summary`, { params });
  }
}
