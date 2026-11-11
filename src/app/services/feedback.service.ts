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
  // Visit context + answer language (analytics).
  department?: string | null;
  doctorName?: string | null;
  wardName?: string | null;
  unitId?: number | null;
  language?: string | null;
  /** Public by-token read only: the patient's preferred language on record. */
  preferredLanguage?: string | null;
}

export interface FeedbackThresholds {
  satisfiedMinRating: number; complaintMaxNps: number; incidentMaxNps: number;
  /** Google review page offered to every respondent after submitting (config endpoints only). */
  googleReviewUrl?: string | null;
}

export interface FeedbackBucket {
  key: string;
  label?: string;
  responses: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps: number;
  rated: number;
  satisfied: number;
  satisfiedPct: number | null;
  avgRating: number | null;
}

export interface FeedbackAnalytics {
  window: { from: string; to: string };
  thresholds: FeedbackThresholds;
  summary: FeedbackBucket & { surveysCreated: number; responseRate: number | null; truncated: boolean; reviewClicks?: number };
  trend: FeedbackBucket[];
  byQuestion: Array<{ key: string; count: number; avg: number; satisfiedPct: number }>;
  choiceReasons: Array<{ key: string; count: number }>;
  breakdowns: Record<'department' | 'doctor' | 'ward' | 'unit' | 'channel' | 'language' | 'collector' | 'template', FeedbackBucket[]>;
  complaintsByUnit: Array<{ key: string; label: string; total: number; resolved: number; resolutionRate: number; avgResolutionHours: number | null }>;
  complaintsByType?: Array<{ key: string; label: string; total: number; resolved: number; avgResolutionHours: number | null; onTimePct: number | null; overdueOpen: number }>;
  lowScores: Array<{ id: string; respondedAt: string; npsScore: number; template: string; department: string | null; wardName: string | null; comment: string }>;
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
  /** Breakdowns over responses in [from, to] (YYYY-MM-DD; default last 30 days). */
  analytics(filters: { from?: string; to?: string; template?: string; unitId?: number | string }): Observable<FeedbackAnalytics> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filters)) if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    return this.http.get<FeedbackAnalytics>(`${this.base}/analytics`, { params });
  }
  getConfig(): Observable<{ data: FeedbackThresholds }> {
    return this.http.get<{ data: FeedbackThresholds }>(`${this.base}/config`);
  }
  updateConfig(body: Partial<FeedbackThresholds>): Observable<{ data: FeedbackThresholds }> {
    return this.http.put<{ data: FeedbackThresholds }>(`${this.base}/config`, body);
  }

  // ── Public (kiosk) — no auth interceptor wrapping needed; backend is open. ──
  getByToken(token: string): Observable<{ data: FeedbackSurvey }> {
    return this.http.get<{ data: FeedbackSurvey }>(`${this.base}/surveys/by-token/${token}`);
  }
  submitByToken(token: string, body: {
    npsScore: number; comments?: string; satisfactionScores?: Record<string, number>; channel?: string;
    language?: string; choiceReasons?: string[];
  }): Observable<{ data: { id: string; status: string; reviewUrl?: string | null } }> {
    return this.http.post<{ data: { id: string; status: string; reviewUrl?: string | null } }>(`${this.base}/surveys/by-token/${token}/respond`, body);
  }
  /** Counts the "Share on Google" tap (public, fire-and-forget). */
  reviewClick(token: string): Observable<unknown> {
    return this.http.post(`${this.base}/surveys/by-token/${token}/review-click`, {});
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
