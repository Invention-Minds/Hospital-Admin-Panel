import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.19 — Emergency referral acknowledgment + escalation config.

export interface ReferralDoctorRef {
  id: number;
  name: string;
  departmentName: string;
}

export interface EmergencyReferral {
  id: number;
  emergencyId: number;
  referredToDoctorId: number;
  referredToDoctor?: ReferralDoctorRef;
  referredByName: string | null;
  reason: string | null;
  triageCategory: string;
  slaMinutes: number;
  status: 'pending' | 'acknowledged' | 'cancelled';
  referredAt: string;
  acknowledgedAt: string | null;
  acknowledgedByName: string | null;
  escalationLevel: number;
  lastEscalatedAt: string | null;
  emergency?: { id: number; prn: string; patientName: string; triageCategory: string; status?: string };
}

export interface EscalationChainStep {
  id: number;
  departmentId: number;
  department?: { id: number; name: string };
  level: number;
  targetType: 'doctor' | 'role';
  targetDoctorId: number | null;
  targetDoctor?: ReferralDoctorRef | null;
  targetRole: string | null;
  label: string | null;
}

export interface ReferralSla {
  triageCategory: string;
  minutes: number;
}

@Injectable({ providedIn: 'root' })
export class EmergencyReferralService {
  private base = `${environment.apiUrl}/emergency`;

  constructor(private http: HttpClient) {}

  // ── Referrals ──
  create(emergencyId: number, body: { referredToDoctorId: number; reason?: string | null }): Observable<{ data: EmergencyReferral }> {
    return this.http.post<{ data: EmergencyReferral }>(`${this.base}/${emergencyId}/referral`, body);
  }
  list(emergencyId: number): Observable<{ data: EmergencyReferral[] }> {
    return this.http.get<{ data: EmergencyReferral[] }>(`${this.base}/${emergencyId}/referrals`);
  }
  acknowledge(refId: number): Observable<{ data: EmergencyReferral }> {
    return this.http.post<{ data: EmergencyReferral }>(`${this.base}/referral/${refId}/acknowledge`, {});
  }
  cancel(refId: number): Observable<{ data: EmergencyReferral }> {
    return this.http.post<{ data: EmergencyReferral }>(`${this.base}/referral/${refId}/cancel`, {});
  }
  myPending(): Observable<{ data: EmergencyReferral[] }> {
    return this.http.get<{ data: EmergencyReferral[] }>(`${this.base}/referrals/my-pending`);
  }
  /** All referrals to the logged-in doctor — referred (pending) + assigned (acknowledged). */
  mine(): Observable<{ data: EmergencyReferral[] }> {
    return this.http.get<{ data: EmergencyReferral[] }>(`${this.base}/referrals/mine`);
  }

  // ── Escalation chain config ──
  listChain(departmentId?: number): Observable<{ data: EscalationChainStep[] }> {
    const q = departmentId != null ? `?departmentId=${departmentId}` : '';
    return this.http.get<{ data: EscalationChainStep[] }>(`${this.base}/config/escalation-chain${q}`);
  }
  createStep(body: Partial<EscalationChainStep>): Observable<{ data: EscalationChainStep }> {
    return this.http.post<{ data: EscalationChainStep }>(`${this.base}/config/escalation-chain`, body);
  }
  updateStep(id: number, body: Partial<EscalationChainStep>): Observable<{ data: EscalationChainStep }> {
    return this.http.put<{ data: EscalationChainStep }>(`${this.base}/config/escalation-chain/${id}`, body);
  }
  deleteStep(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/config/escalation-chain/${id}`);
  }

  // ── SLA config ──
  getSla(): Observable<{ data: ReferralSla[] }> {
    return this.http.get<{ data: ReferralSla[] }>(`${this.base}/config/referral-sla`);
  }
  setSla(triageCategory: string, minutes: number): Observable<{ data: ReferralSla }> {
    return this.http.put<{ data: ReferralSla }>(`${this.base}/config/referral-sla`, { triageCategory, minutes });
  }
}
