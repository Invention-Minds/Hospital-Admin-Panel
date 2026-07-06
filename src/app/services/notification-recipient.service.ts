import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

/** One NotificationRecipient row (mirrors the backend model). */
export interface NotificationRecipient {
  id: string;
  groupKey: string;
  phone: string;
  label?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Message recipient phone numbers, grouped by purpose (groupKey).
 * Backend: /api/notification-recipients (read = any auth user; write = admin).
 */
@Injectable({ providedIn: 'root' })
export class NotificationRecipientService {
  private readonly base = `${environment.apiUrl}/notification-recipients`;

  constructor(private http: HttpClient) {}

  list(group?: string): Observable<{ count: number; recipients: NotificationRecipient[] }> {
    let params = new HttpParams();
    if (group) params = params.set('group', group);
    return this.http.get<{ count: number; recipients: NotificationRecipient[] }>(this.base, { params });
  }

  groups(): Observable<{ groups: string[] }> {
    return this.http.get<{ groups: string[] }>(`${this.base}/groups`);
  }

  /** Resolved active phones for a group (DB or code fallback) — for send flows. */
  phones(group: string): Observable<{ group: string; phones: string[] }> {
    return this.http.get<{ group: string; phones: string[] }>(`${this.base}/phones/${group}`);
  }

  create(groupKey: string, phone: string, label?: string): Observable<NotificationRecipient> {
    return this.http.post<NotificationRecipient>(this.base, { groupKey, phone, label });
  }

  update(id: string, data: Partial<Pick<NotificationRecipient, 'phone' | 'label' | 'isActive'>>): Observable<NotificationRecipient> {
    return this.http.patch<NotificationRecipient>(`${this.base}/${id}`, data);
  }

  remove(id: string): Observable<{ message: string; id: string }> {
    return this.http.delete<{ message: string; id: string }>(`${this.base}/${id}`);
  }
}
