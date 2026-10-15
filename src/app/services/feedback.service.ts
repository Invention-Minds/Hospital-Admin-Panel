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

export interface WalkUpOtpChallenge {
  message: string;
  challengeId?: string;
  phoneLast4?: string | null;
  expiresAt?: string;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private base = `${environment.apiUrl}/feedback`;
  constructor(private http: HttpClient) {}

  // Handler-only (Quality Manager / Patient Relations). `token` is present on
  // pending/sent rows only.
  list(filters?: { status?: string; template?: string; patientPrn?: string; from?: string; to?: string }): Observable<{ data: FeedbackSurvey[] }> {
    let params = new HttpParams();
    if (filters) for (const [k, v] of Object.entries(filters)) if (v) params = params.set(k, v);
    return this.http.get<{ data: FeedbackSurvey[] }>(`${this.base}/surveys`, { params });
  }
  /** Aggregate NPS; from/to (YYYY-MM-DD) filter on respondedAt. */
  stats(range?: { from?: string; to?: string }): Observable<SurveyStats> {
    let params = new HttpParams();
    if (range?.from) params = params.set('from', range.from);
    if (range?.to) params = params.set('to', range.to);
    return this.http.get<SurveyStats>(`${this.base}/surveys/stats`, { params });
  }
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
  // Walk-up kiosk: PRN → SMS OTP to the phone on record → verify → the server
  // mints a survey and returns its token. challengeId is absent when no OTP
  // was sent (unknown PRN / no phone on file).
  requestWalkUpOtp(patientPrn: string): Observable<{ data: WalkUpOtpChallenge }> {
    return this.http.post<{ data: WalkUpOtpChallenge }>(`${this.base}/surveys/walk-up/request-otp`, { patientPrn });
  }
  verifyWalkUpOtp(body: { challengeId: string; otp: string; visitType?: string }):
    Observable<{ data: { token: string; id: string } }> {
    return this.http.post<{ data: { token: string; id: string } }>(`${this.base}/surveys/walk-up/verify`, body);
  }
}
