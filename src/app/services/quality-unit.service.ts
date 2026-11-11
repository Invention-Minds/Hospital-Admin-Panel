import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Quality → Units & Escalation (hospital units, HODs, escalation matrix).

export type UnitType = 'clinical' | 'nursing' | 'diagnostic' | 'support' | 'administrative';

export interface HospitalUnit {
  id: number;
  name: string;
  type: UnitType;
  hodUserId: number | null;
  deputyUserId: number | null;
  hodName: string | null;
  deputyName: string | null;
  isActive: boolean;
  departments: string[];
  wardIds: string[];
}

export interface UnitPerson {
  id: number; username: string; fullName: string | null;
  role: string; adminType: string | null; subAdminType: string | null;
}

export interface UnitSources {
  specialties: string[];
  legacyDepartments: Array<{ name: string; cases: number }>;
  wards: Array<{ id: string; wardName: string; department: string }>;
  mappings: Array<{ kind: string; value: string; unitId: number }>;
  people: UnitPerson[];
  unitTypes: UnitType[];
}

export interface EscalationLevel {
  level: number; afterMinutes: number; targets: string; label?: string | null;
  notifyWhatsapp?: boolean; notifySms?: boolean;
}
export type EscalationModule = 'incident' | 'complaint';
export type EscalationMatrix = Record<EscalationModule, Record<string, { source: 'custom' | 'default'; levels: EscalationLevel[] }>>;

@Injectable({ providedIn: 'root' })
export class QualityUnitService {
  private base = `${environment.apiUrl}/quality/units`;
  constructor(private http: HttpClient) {}

  list(activeOnly = false): Observable<{ data: HospitalUnit[] }> {
    return this.http.get<{ data: HospitalUnit[] }>(this.base, { params: activeOnly ? { active: 'true' } : {} });
  }
  sources(): Observable<{ data: UnitSources }> {
    return this.http.get<{ data: UnitSources }>(`${this.base}/sources`);
  }
  create(body: { name: string; type: UnitType; hodUserId?: number | null; deputyUserId?: number | null }): Observable<{ data: HospitalUnit }> {
    return this.http.post<{ data: HospitalUnit }>(this.base, body);
  }
  update(id: number, body: Partial<{ name: string; type: UnitType; hodUserId: number | null; deputyUserId: number | null; isActive: boolean }>): Observable<{ data: HospitalUnit }> {
    return this.http.put<{ data: HospitalUnit }>(`${this.base}/${id}`, body);
  }
  setMappings(id: number, departments: string[], wardIds: string[]): Observable<unknown> {
    return this.http.put(`${this.base}/${id}/mappings`, { departments, wardIds });
  }
  importSpecialties(): Observable<{ data: { created: string[] } }> {
    return this.http.post<{ data: { created: string[] } }>(`${this.base}/import-specialties`, {});
  }
  matrix(): Observable<{ data: { matrix: EscalationMatrix; severities: Record<EscalationModule, string[]>; targetHelp: { tokens: string[]; executiveAdminTypes: string[] } } }> {
    return this.http.get<{ data: { matrix: EscalationMatrix; severities: Record<EscalationModule, string[]>; targetHelp: { tokens: string[]; executiveAdminTypes: string[] } } }>(`${this.base}/escalation-matrix`);
  }
  setLadder(module: EscalationModule, severity: string, levels: Array<{ afterMinutes: number; targets: string; label?: string | null; notifyWhatsapp?: boolean; notifySms?: boolean }>): Observable<unknown> {
    return this.http.put(`${this.base}/escalation-matrix/${module}/${severity}`, { levels });
  }

  // Complaint types + deadline rules.
  complaintCategories(): Observable<{ data: ComplaintCategory[] }> {
    return this.http.get<{ data: ComplaintCategory[] }>(`${this.base}/complaint-categories`);
  }
  slaRules(): Observable<{ data: { rules: ComplaintSlaRule[]; categories: ComplaintCategory[]; defaults: Record<string, number>; maxHours: number } }> {
    return this.http.get<{ data: { rules: ComplaintSlaRule[]; categories: ComplaintCategory[]; defaults: Record<string, number>; maxHours: number } }>(`${this.base}/complaint-sla`);
  }
  createSlaRule(body: { unitId: number | null; category: string | null; severity: string | null; hours: number; note?: string | null }): Observable<{ data: ComplaintSlaRule }> {
    return this.http.post<{ data: ComplaintSlaRule }>(`${this.base}/complaint-sla`, body);
  }
  updateSlaRule(id: number, body: { hours?: number; note?: string | null }): Observable<{ data: ComplaintSlaRule }> {
    return this.http.put<{ data: ComplaintSlaRule }>(`${this.base}/complaint-sla/${id}`, body);
  }
  deleteSlaRule(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/complaint-sla/${id}`);
  }
  testSla(q: { unitId: number | null; category: string | null; severity: string }): Observable<{ data: { hours: number; ruleId: number | null; label: string } }> {
    const params: Record<string, string> = { severity: q.severity };
    if (q.unitId) params['unitId'] = String(q.unitId);
    if (q.category) params['category'] = q.category;
    return this.http.get<{ data: { hours: number; ruleId: number | null; label: string } }>(`${this.base}/complaint-sla/test`, { params });
  }
}

export interface ComplaintCategory { key: string; label: string }
export interface ComplaintSlaRule {
  id: number; unitId: number | null; unitName: string | null; category: string | null; severity: string | null;
  hours: number; note: string | null; createdAt: string; updatedAt: string;
}
