import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// WhatsApp patient-query inbox API (doctor side). Backend: /api/whatsapp-query.

export type WhatsappQueryStatus = 'open' | 'answered' | 'closed';
export type MsgDirection = 'IN' | 'OUT';

export interface WhatsappQueryMessage {
  id: number;
  queryId: number;
  direction: MsgDirection;
  body: string;
  sender: string | null;
  mediaUrl: string | null;   // e.g. /files/whatsapp/<file>
  mediaType: string | null;  // image | document | video | audio
  mediaMime: string | null;
  fileName: string | null;
  created_at: string;
}

export interface WhatsappQuery {
  id: number;
  refNo: string;
  patientPhone: string;
  prn: number;
  patientName: string | null;
  doctorId: number;
  doctorName: string;
  status: WhatsappQueryStatus;
  lastPatientMsgAt: string;
  created_at: string;
  messages?: WhatsappQueryMessage[];
}

@Injectable({ providedIn: 'root' })
export class WhatsappQueryService {
  private base = `${environment.apiUrl}/whatsapp-query`;
  // Static files (/files/whatsapp/...) are served from the backend origin, not under /api.
  private filesBase = environment.apiUrl.replace(/\/api\/?$/, '');

  constructor(private http: HttpClient) {}

  inbox(status?: string): Observable<{ data: WhatsappQuery[] }> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<{ data: WhatsappQuery[] }>(`${this.base}/inbox`, { params });
  }

  get(id: number): Observable<{ data: WhatsappQuery }> {
    return this.http.get<{ data: WhatsappQuery }>(`${this.base}/${id}`);
  }

  reply(id: number, message: string): Observable<{ data: WhatsappQuery; deliveredVia: string }> {
    return this.http.post<{ data: WhatsappQuery; deliveredVia: string }>(`${this.base}/${id}/reply`, { message });
  }

  close(id: number): Observable<{ data: WhatsappQuery }> {
    return this.http.post<{ data: WhatsappQuery }>(`${this.base}/${id}/close`, {});
  }

  /** Absolute URL for a stored attachment. */
  mediaSrc(mediaUrl: string | null): string {
    if (!mediaUrl) return '';
    return /^https?:\/\//.test(mediaUrl) ? mediaUrl : `${this.filesBase}${mediaUrl}`;
  }
}
