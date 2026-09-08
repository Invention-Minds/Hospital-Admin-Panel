import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Appointment lifecycle trail service.
 *
 * Backs the per-appointment history dialog and the reschedule/cancellation
 * report tab. Field names mirror the backend AppointmentEvent response
 * verbatim so templates use them without mapping.
 */

export type AppointmentEventType =
  | 'BOOKED'
  | 'CONFIRMED'
  | 'RESCHEDULED'
  | 'CANCELLED'
  | 'STATUS_CHANGE'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'COMPLETED'
  | 'OPD_CLOSED'
  | 'DELETED';

export interface AppointmentEventRow {
  id: string;
  appointmentId: number;
  eventType: AppointmentEventType | string;

  fromDate: string | null;
  fromTime: string | null;
  fromDoctorId: number | null;
  fromDoctorName: string | null;
  fromStatus: string | null;
  toDate: string | null;
  toTime: string | null;
  toDoctorId: number | null;
  toDoctorName: string | null;
  toStatus: string | null;

  actorType: string;
  actorId: number | null;
  actorName: string | null;
  actorRole: string | null;
  ipAddress: string | null;

  patientId: number | null;
  prnNumber: number | null;
  patientName: string | null;

  source: string | null;
  reason: string | null;
  payload: unknown;
  createdAt: string;
}

export interface AppointmentHistoryAppointment {
  id: number;
  patientName: string;
  prnNumber: number | null;
  phoneNumber: string;
  doctorId: number | null;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  status: string;
  requestVia: string | null;
  rescheduleCount: number;
  cancelledBy: string | null;
  cancelledById: number | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentHistorySummary {
  totalEvents: number;
  rescheduleCount: number;
  cancelled: boolean;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export interface AppointmentHistoryResponse {
  appointment: AppointmentHistoryAppointment;
  summary: AppointmentHistorySummary;
  events: AppointmentEventRow[];
}

export interface EventTallyRow {
  key: string | number;
  label: string;
  rescheduled: number;
  cancelled: number;
  total: number;
}

export interface RepeatOffenderRow {
  appointmentId: number;
  rescheduleCount: number;
  patientName: string | null;
  prnNumber: number | null;
  doctorName: string | null;
}

export interface AppointmentEventReport {
  range: { from: string; to: string };
  eventTypes: string[];
  totals: { rescheduled: number; cancelled: number; all: number };
  byActor: EventTallyRow[];
  byDoctor: EventTallyRow[];
  bySource: EventTallyRow[];
  repeatOffenders: RepeatOffenderRow[];
}

/** One row per appointment — the bulk companion to the full history. */
export interface AppointmentEventSummary {
  bookedBy: string | null;
  bookedByType: string | null;
  bookedAt: string | null;
  rescheduleCount: number;
  lastRescheduledBy: string | null;
  lastRescheduledByType: string | null;
  lastRescheduledAt: string | null;
  previousDate: string | null;
  previousTime: string | null;
  previousDoctorName: string | null;
  cancelledBy: string | null;
  cancelledByType: string | null;
  cancelledBySource: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

/** Keyed by appointment id (as a string, since it comes back as JSON keys). */
export type AppointmentEventSummaryMap = Record<string, AppointmentEventSummary>;

/**
 * Display name for an actor in an export column. System actors carry the cron
 * source as their name, which is meaningless to the front desk — map those to
 * plain English and leave real usernames alone.
 */
export const actorLabel = (
  name: string | null,
  type: string | null,
  source?: string | null
): string => {
  if (type === 'system' || type === 'bot') {
    switch (source ?? name) {
      case 'cron:expired-3h': return 'Auto (no-show)';
      case 'cron:mark-complete': return 'Auto (end of day)';
      case 'scheduled-completion': return 'Auto (scheduled)';
      case 'service-close': return 'Auto (service closed)';
      case 'followup-automation': return 'Auto (follow-up)';
      default: return type === 'bot' ? 'WhatsApp bot' : 'System';
    }
  }
  return name || '-';
};

/**
 * "08-09-2026 14:05" in IST. Trail timestamps come back as UTC ISO strings;
 * Intl does the zone conversion so this is safe under SSR (no moment needed).
 */
export const istDateTime = (iso: string | null): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('day')}-${get('month')}-${get('year')} ${get('hour')}:${get('minute')}`;
};

/** "2026-09-08 02:00 PM · Dr. Karuna" — blank when there was no prior slot. */
export const slotText = (
  date: string | null,
  time: string | null,
  doctorName: string | null
): string => {
  if (!date && !time && !doctorName) return '-';
  return [date, time, doctorName ? `· ${doctorName}` : ''].filter(Boolean).join(' ');
};

@Injectable({ providedIn: 'root' })
export class AppointmentHistoryService {
  private apiUrl = `${environment.apiUrl}/appointments`;

  constructor(private http: HttpClient) {}

  /** GET /api/appointments/:id/history */
  getHistory(appointmentId: number): Observable<AppointmentHistoryResponse> {
    return this.http.get<AppointmentHistoryResponse>(
      `${this.apiUrl}/${appointmentId}/history`
    );
  }

  /** GET /api/appointments/reschedule-report?from=&to=&eventType= */
  getReport(params: {
    from: string;
    to: string;
    eventType?: string;
  }): Observable<AppointmentEventReport> {
    let httpParams = new HttpParams()
      .set('from', params.from)
      .set('to', params.to);
    if (params.eventType) {
      httpParams = httpParams.set('eventType', params.eventType);
    }
    return this.http.get<AppointmentEventReport>(
      `${this.apiUrl}/reschedule-report`,
      { params: httpParams }
    );
  }

  /**
   * POST /api/appointments/event-summary — trail summary for many appointments
   * at once, for the Excel exports. Chunked so a large download can't build a
   * request body the server rejects; the chunks are merged into one map.
   *
   * Never rejects: if the trail can't be read the export still produces a file,
   * just with the trail columns blank.
   */
  getEventSummaries(appointmentIds: number[]): Promise<AppointmentEventSummaryMap> {
    const ids = appointmentIds.filter((id) => Number.isInteger(id) && id > 0);
    if (ids.length === 0) return Promise.resolve({});

    const CHUNK = 500;
    const chunks: number[][] = [];
    for (let i = 0; i < ids.length; i += CHUNK) {
      chunks.push(ids.slice(i, i + CHUNK));
    }

    return Promise.all(
      chunks.map((chunk) =>
        firstValueFrom(
          this.http.post<{ summaries: AppointmentEventSummaryMap }>(
            `${this.apiUrl}/event-summary`,
            { appointmentIds: chunk }
          )
        ).catch((err) => {
          console.warn('[appointment-history] event summary chunk failed:', err);
          return { summaries: {} as AppointmentEventSummaryMap };
        })
      )
    ).then((results) =>
      results.reduce<AppointmentEventSummaryMap>(
        (acc, r) => Object.assign(acc, r.summaries ?? {}),
        {}
      )
    );
  }
}
