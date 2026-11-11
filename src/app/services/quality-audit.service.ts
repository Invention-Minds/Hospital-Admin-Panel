import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Quality audit checklists, scheduled audits, findings + actions (/api/quality/audits).

export type AuditGroup = 'clinical' | 'quality' | 'facility';
export type AuditRunStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type AuditResult = 'yes' | 'no' | 'na';

export interface AuditChecklistItem {
  id?: number;
  sortOrder?: number;
  section: string | null;
  text: string;
  critical: boolean;
  qiCode: string | null;
  isActive: boolean;
}

export interface AuditChecklist {
  id: number;
  code: string;
  name: string;
  group: AuditGroup;
  description: string | null;
  frequency: 'weekly' | 'monthly' | 'quarterly' | null;
  isActive: boolean;
  itemCount?: number;
  runCount?: number;
  items?: AuditChecklistItem[];
}

export interface AuditRunSummary {
  id: string;
  code: string;
  checklistId: number;
  checklist: { name: string; group: AuditGroup };
  unitId: number | null;
  unitName: string | null;
  location: string | null;
  dueDate: string | null;
  status: AuditRunStatus;
  auditorId: number | null;
  auditor: string | null;
  completedAt: string | null;
  compliancePct: number | null;
  ncCount: number | null;
  criticalNcCount: number | null;
  openActions: number;
  overdue: boolean;
}

export interface AuditFindingAction {
  id: string;
  itemId: number;
  description: string;
  owner: string | null;
  ownerId: number | null;
  dueDate: string | null;
  status: 'open' | 'done' | 'dropped';
  completedAt: string | null;
  completedBy: string | null;
  completionNote: string | null;
  canComplete?: boolean;
}

export interface AuditRunDetail extends Omit<AuditRunSummary, 'checklist' | 'unitName' | 'openActions' | 'overdue'> {
  checklist: { id: number; code: string; name: string; group: AuditGroup; description: string | null };
  unit: { id: number; name: string } | null;
  notes: string | null;
  startedAt: string | null;
  applicableCount: number | null;
  compliantCount: number | null;
  items: Array<AuditChecklistItem & { id: number; previousResult: AuditResult | null; nextResult: AuditResult | null }>;
  responses: Array<{ itemId: number; result: AuditResult; remark: string | null }>;
  actions: AuditFindingAction[];
  previousRun: { id: string; code: string; completedAt: string; compliancePct: number | null } | null;
  nextRun: { id: string; code: string; completedAt: string; compliancePct: number | null } | null;
  permissions: { canConduct: boolean; canManage: boolean; canManageActions: boolean };
}

export interface AuditAgg {
  key: string; label: string; group?: string;
  audits: number; applicable: number; compliant: number; nc: number; criticalNc: number;
  compliancePct: number | null; ncPct: number | null;
}

export interface AuditSummary {
  window: { from: string; to: string };
  summary: AuditAgg & { openAudits: number; overdueAudits: number; openActions: number; overdueActions: number };
  byChecklist: AuditAgg[];
  byUnit: AuditAgg[];
}

@Injectable({ providedIn: 'root' })
export class QualityAuditService {
  private base = `${environment.apiUrl}/quality/audits`;
  constructor(private http: HttpClient) {}

  summary(f: { from?: string; to?: string; unitId?: number | string }): Observable<AuditSummary> {
    return this.http.get<AuditSummary>(`${this.base}/summary`, { params: this.params(f) });
  }
  checklists(active = false): Observable<{ data: AuditChecklist[] }> {
    return this.http.get<{ data: AuditChecklist[] }>(`${this.base}/checklists`, { params: active ? { active: 'true' } : {} });
  }
  checklist(id: number): Observable<{ data: AuditChecklist }> {
    return this.http.get<{ data: AuditChecklist }>(`${this.base}/checklists/${id}`);
  }
  createChecklist(body: Partial<AuditChecklist> & { items: AuditChecklistItem[] }): Observable<{ data: AuditChecklist }> {
    return this.http.post<{ data: AuditChecklist }>(`${this.base}/checklists`, body);
  }
  updateChecklist(id: number, body: Partial<AuditChecklist> & { items?: AuditChecklistItem[] }): Observable<{ data: AuditChecklist }> {
    return this.http.put<{ data: AuditChecklist }>(`${this.base}/checklists/${id}`, body);
  }
  importStarter(): Observable<{ data: { created: number; skipped: number } }> {
    return this.http.post<{ data: { created: number; skipped: number } }>(`${this.base}/checklists/import-starter`, {});
  }

  runs(f: { status?: string; checklistId?: number | string; unitId?: number | string; mine?: boolean } = {}): Observable<{ data: AuditRunSummary[] }> {
    return this.http.get<{ data: AuditRunSummary[] }>(`${this.base}/runs`, { params: this.params(f) });
  }
  run(id: string): Observable<{ data: AuditRunDetail }> {
    return this.http.get<{ data: AuditRunDetail }>(`${this.base}/runs/${id}`);
  }
  schedule(body: { checklistId: number; unitId?: number | null; location?: string | null; dueDate?: string | null; auditorId?: number | null; notes?: string | null }): Observable<{ data: { id: string; code: string } }> {
    return this.http.post<{ data: { id: string; code: string } }>(`${this.base}/runs`, body);
  }
  updateRun(id: string, body: { dueDate?: string | null; auditorId?: number | null; location?: string | null; notes?: string | null; status?: 'cancelled' }): Observable<unknown> {
    return this.http.put(`${this.base}/runs/${id}`, body);
  }
  saveResponses(id: string, body: { responses: Array<{ itemId: number; result: AuditResult; remark?: string | null }>; notes?: string | null }): Observable<unknown> {
    return this.http.put(`${this.base}/runs/${id}/responses`, body);
  }
  submit(id: string): Observable<{ data: { compliancePct: number | null; ncCount: number; observations: number } }> {
    return this.http.post<{ data: { compliancePct: number | null; ncCount: number; observations: number } }>(`${this.base}/runs/${id}/submit`, {});
  }
  addAction(id: string, body: { itemId: number; description: string; ownerId?: number | null; dueDate?: string | null }): Observable<unknown> {
    return this.http.post(`${this.base}/runs/${id}/actions`, body);
  }
  updateAction(id: string, actionId: string, body: Partial<{ description: string; ownerId: number | null; dueDate: string | null; status: 'open' | 'done' | 'dropped'; completionNote: string | null }>): Observable<unknown> {
    return this.http.put(`${this.base}/runs/${id}/actions/${actionId}`, body);
  }

  private params(f: Record<string, unknown>): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== null && v !== '' && v !== false) p = p.set(k, String(v));
    return p;
  }
}
