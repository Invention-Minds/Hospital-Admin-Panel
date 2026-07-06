import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.25 / Phase 4 — Patient feedback survey API.

export type SurveyTemplate = 'opd-post-visit' | 'ipd-discharge' | 'er-discharge' | 'day-care' | 'general';
export type SurveyStatus = 'pending' | 'sent' | 'completed' | 'expired';

export interface FeedbackSurvey {
  id: string;
  token?: string;          // only returned to staff via list/create
  template: SurveyTemplate;
  patientPrn: string | null;
  patientName: string | null;
  appointmentId: number | null;
  admissionId: string | null;
  emergencyId: number | null;
  encounterDate: string | null;
  status: SurveyStatus;
  npsScore: number | null;
  comments: string | null;
  expiresAt: string | null;
  respondedAt: string | null;
  createdAt: string;
}

export interface SurveyStats {
  byStatus: Record<string, number>;
  nps: { score: number; promoters: number; passives: number; detractors: number; total: number };
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private base = `${environment.apiUrl}/feedback`;
  constructor(private http: HttpClient) {}

  list(filters?: { status?: string; template?: string; patientPrn?: string }): Observable<{ data: FeedbackSurvey[] }> {
    let params = new HttpParams();
    if (filters) for (const [k, v] of Object.entries(filters)) if (v) params = params.set(k, v);
    return this.http.get<{ data: FeedbackSurvey[] }>(`${this.base}/surveys`, { params });
  }
  stats(): Observable<SurveyStats> { return this.http.get<SurveyStats>(`${this.base}/surveys/stats`); }
  create(body: Partial<FeedbackSurvey> & { template: SurveyTemplate; expiresInDays?: number }): Observable<{ data: FeedbackSurvey }> {
    return this.http.post<{ data: FeedbackSurvey }>(`${this.base}/surveys`, body);
  }

  // ── Public (kiosk) — no auth interceptor wrapping needed; backend is open. ──
  getByToken(token: string): Observable<{ data: FeedbackSurvey }> {
    return this.http.get<{ data: FeedbackSurvey }>(`${this.base}/surveys/by-token/${token}`);
  }
  submitByToken(token: string, body: { npsScore: number; comments?: string; satisfactionScores?: Record<string, number>; channel?: string }): Observable<{ data: { id: string; status: string } }> {
    return this.http.post<{ data: { id: string; status: string } }>(`${this.base}/surveys/by-token/${token}/respond`, body);
  }
  // Phase 6 — walk-up kiosk: patient mints their own survey, server returns
  // the new token which the FE then navigates to.
  startWalkUp(body: { patientName: string; patientPrn?: string | null; visitType?: string }):
    Observable<{ data: { token: string; id: string } }> {
    return this.http.post<{ data: { token: string; id: string } }>(`${this.base}/surveys/walk-up`, body);
  }
}
