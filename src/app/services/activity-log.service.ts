import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// User-activity log (super_admin only) — /api/activity-log.

export interface ActivityUser {
  id: number; username: string; name: string; employeeId: string | null; role: string; title: string | null; isActive: boolean;
  lastLoginAt: string | null; logins: number; actions: number; lastActionAt: string | null; downloads: number;
}

export interface ActivityRow {
  id: string; createdAt: string; module: string; action: string; entityType: string | null; entityId: string | null;
  notes: string | null; payload: string | null; actorId: number | null; actorName: string | null; actorRole: string | null;
  ipAddress: string | null; userAgent: string | null;
}

export interface ActivityDownload { id: string; createdAt: string; label: string; page: string | null; reason: string; ip: string | null; downloadRef: string | null }

@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  private base = `${environment.apiUrl}/activity-log`;
  constructor(private http: HttpClient) {}

  users(f: { from?: string; to?: string }): Observable<{ data: ActivityUser[]; failedLogins: number }> {
    return this.http.get<{ data: ActivityUser[]; failedLogins: number }>(`${this.base}/users`, { params: this.params(f) });
  }
  timeline(f: { from?: string; to?: string; userId?: number | null; module?: string; action?: string; page?: number; pageSize?: number }):
    Observable<{ data: ActivityRow[]; total: number; page: number; pageSize: number; downloads: ActivityDownload[] }> {
    return this.http.get<{ data: ActivityRow[]; total: number; page: number; pageSize: number; downloads: ActivityDownload[] }>(this.base, { params: this.params(f) });
  }
  facets(): Observable<{ modules: string[]; actions: string[] }> {
    return this.http.get<{ modules: string[]; actions: string[] }>(`${this.base}/facets`);
  }
  private params(f: Record<string, unknown>): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(f)) if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    return p;
  }
}
