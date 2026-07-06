import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

/** One SecurityIpBlock row (mirrors the backend model). */
export interface IpBlock {
  id: string;
  ip: string;
  reason?: string | null;
  hitCount: number;
  active: boolean;
  blockedAt: string;
  expiresAt?: string | null;
  unblockedBy?: string | null;
  unblockedAt?: string | null;
}

/**
 * Super-admin management of rate-limit IP blocks.
 * Backend: /api/security/blocks (auth + super_admin). Token is attached by
 * AuthInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class SecurityService {
  private readonly base = `${environment.apiUrl}/security`;

  constructor(private http: HttpClient) {}

  listBlocks(activeOnly = true): Observable<{ count: number; blocks: IpBlock[] }> {
    const params = new HttpParams().set('active', String(activeOnly));
    return this.http.get<{ count: number; blocks: IpBlock[] }>(`${this.base}/blocks`, { params });
  }

  unblock(ip: string): Observable<{ message: string; ip: string }> {
    return this.http.post<{ message: string; ip: string }>(`${this.base}/blocks/${encodeURIComponent(ip)}/unblock`, {});
  }

  block(ip: string, reason?: string, minutes?: number | null): Observable<{ message: string; ip: string }> {
    return this.http.post<{ message: string; ip: string }>(`${this.base}/blocks`, { ip, reason, minutes });
  }
}
