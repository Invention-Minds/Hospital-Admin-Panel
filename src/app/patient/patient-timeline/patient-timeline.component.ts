import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { environment } from '../../../environment/environment.prod';

/**
 * Phase 9.23 — Patient Timeline.
 *
 * Unified, chronological view of every clinical/operational event for one
 * patient across OPD, IPD, ER, OT, Lab, Pharmacy, notes and consents.
 * Route: /patient/timeline/:prn
 */

interface TimelineEvent {
  ts: string;
  type: string;
  title: string;
  summary?: string;
  source: { entity: string; id: string | number };
  severity?: 'info' | 'warn' | 'critical';
  meta?: Record<string, unknown>;
}
interface TimelineResponse {
  data: TimelineEvent[];
  counts: Record<string, number>;
  patient: { prn: number | string; name: string; age: string | null; gender: string | null; bloodGroup: string | null; mobileNo: string | null; knownAllergies: string | null } | null;
}

@Component({
  selector: 'app-patient-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-timeline.component.html',
  styleUrls: ['./patient-timeline.component.css'],
})
export class PatientTimelineComponent implements OnInit, OnDestroy {
  prn = '';
  searchPrn = '';
  loading = false;
  errorMessage = '';

  response: TimelineResponse | null = null;
  activeTypes = new Set<string>();
  fromDate = '';
  toDate = '';

  /** Display labels for the timeline event types. */
  readonly typeLabels: Record<string, string> = {
    'opd-visit': 'OPD visit', 'opd-assessment': 'OPD assessment',
    'ipd-admission': 'IPD admission', 'ipd-discharge': 'IPD discharge',
    'er-visit': 'ER visit', 'prescription': 'Prescription',
    'investigation-order': 'Investigation', 'investigation-result': 'Result',
    'doctor-note': 'Doctor note', 'history-note': 'History',
    'allergy': 'Allergy', 'ot-procedure': 'OT', 'therapy': 'Therapy',
    'progress-note': 'Progress note', 'mlc': 'MLC', 'lama': 'LAMA',
    'dama': 'DAMA', 'transfer': 'Transfer',
  };

  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((p) => {
      this.prn = p.get('prn') ?? '';
      this.searchPrn = this.prn;
      if (this.prn) this.load();
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  /** Load the timeline for the current PRN with the current filters. */
  load(): void {
    if (!this.prn) return;
    this.loading = true;
    this.errorMessage = '';
    const parts: string[] = [];
    if (this.activeTypes.size) parts.push(`types=${[...this.activeTypes].join(',')}`);
    if (this.fromDate) parts.push(`from=${this.fromDate}`);
    if (this.toDate) parts.push(`to=${this.toDate}`);
    const qs = parts.length ? `?${parts.join('&')}` : '';
    this.http.get<TimelineResponse>(`${environment.apiUrl}/patients/timeline/${this.prn}${qs}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { this.response = r; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load timeline'; this.loading = false; },
      });
  }

  /** Switch the timeline to a different PRN (entered in the search box). */
  go(): void {
    const p = this.searchPrn.trim();
    if (!p) return;
    this.router.navigate(['/patient/timeline', p]);
  }

  toggleType(type: string): void {
    if (this.activeTypes.has(type)) this.activeTypes.delete(type); else this.activeTypes.add(type);
    this.load();
  }
  clearTypes(): void { this.activeTypes.clear(); this.load(); }

  /**
   * Group events by IST calendar day (descending) for date-heading rendering.
   *
   * `ts` is a UTC ISO string from the API. The hospital runs in IST, so the
   * day a clinical event "belongs to" is its Asia/Kolkata (+05:30) calendar
   * day, not its UTC date — slicing the raw UTC string would push late-evening
   * IST events onto the previous day. We shift the instant by +05:30 then slice
   * to derive the IST day, matching the `:'+0530'` arg used by the date pipe in
   * the template (heading + per-event time).
   */
  get grouped(): { date: string; items: TimelineEvent[] }[] {
    const evts = this.response?.data ?? [];
    const byDay = new Map<string, TimelineEvent[]>();
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    for (const e of evts) {
      const ms = new Date(e.ts).getTime();
      // Fall back to a raw slice if ts is unparseable, to avoid dropping events.
      const day = Number.isNaN(ms)
        ? (e.ts || '').slice(0, 10)
        : new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(e);
    }
    return Array.from(byDay.entries()).map(([date, items]) => ({ date, items }));
  }

  typeLabel(t: string): string { return this.typeLabels[t] ?? t; }

  /** Deep-link an event to its source screen when we know one. */
  openEvent(e: TimelineEvent): void {
    const id = e.source.id;
    switch (e.type) {
      case 'opd-visit':
        this.router.navigate(['/appointments']); return;
      case 'opd-assessment':
        if ((e.meta as { appointmentId?: number })?.appointmentId) {
          this.router.navigate(['/opd-assessment', (e.meta as { appointmentId?: number }).appointmentId]);
        }
        return;
      case 'ipd-admission':
      case 'progress-note':
        this.router.navigate(['/ipd/admission', String(id), 'progress-note']); return;
      case 'ipd-discharge':
        this.router.navigate(['/ipd/admission', String(id), 'discharge-summary']); return;
      case 'er-visit':
        this.router.navigate(['/emergency', id]); return;
      case 'ot-procedure':
        this.router.navigate(['/ot-workflow']); return;
      default:
        return; // no deep-link for this type
    }
  }
}
