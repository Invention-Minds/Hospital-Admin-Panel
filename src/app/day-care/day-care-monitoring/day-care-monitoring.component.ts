import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  DayCareService,
  DayCareSession,
  DayCareReading,
  DayCareUpsertPayload,
  DayCareReadingPayload,
  ProcedureType,
} from '../../services/day-care.service';
import { AlertService } from '../../services/alert.service';

/**
 * Day-Care Monitoring — `/daycare/:id` (or `/daycare/new` for new session).
 *
 * Single page with:
 *   • Session metadata (patient, procedure, allergies, consultant).
 *   • Alert-threshold panel — doctor sets per-vital low/high at start.
 *   • Time-series table of readings with action button to add a new row.
 *   • Any reading that breaches a threshold is highlighted and shows the
 *     "alert duty doctor" prompt.
 */
@Component({
  selector: 'app-day-care-monitoring',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './day-care-monitoring.component.html',
  styleUrls: ['./day-care-monitoring.component.css'],
})
export class DayCareMonitoringComponent implements OnInit, OnDestroy {
  sessionId = '';
  isNew = false;
  session: DayCareSession | null = null;

  /** Editor buffer for the session metadata + thresholds. Saved on
   *  explicit click; we don't auto-save because thresholds being wrong
   *  would cause spurious alerts on subsequent readings. */
  form: DayCareUpsertPayload = this.blankSession();
  saving = false;

  /** Reading buffer for the modal. */
  readingModalOpen = false;
  readingBuf: DayCareReadingPayload = this.blankReading();
  savingReading = false;

  errorMessage = '';
  successMessage = '';
  loading = false;

  readonly procedureTypes: ProcedureType[] = ['chemo', 'dialysis', 'endoscopy', 'day-surgery', 'other'];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: DayCareService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (id === 'new' || !id) {
      this.isNew = true;
      this.form = this.blankSession();
      this.form.dateOfService = new Date().toISOString().slice(0, 10);
    } else {
      this.sessionId = id;
      this.load();
    }
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.getSession(this.sessionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => {
        this.session = s;
        this.form = { ...s };
        this.loading = false;
      },
      error: (e) => {
        this.errorMessage = e?.error?.error || 'Failed to load session';
        this.loading = false;
      },
    });
  }

  saveSession(): void {
    if (!this.form.patientName?.trim() || !this.form.dateOfService || !this.form.procedureType) {
      this.errorMessage = 'Patient name, date and procedure type are required.';
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    const obs = this.isNew
      ? this.svc.createSession(this.form)
      : this.svc.updateSession(this.sessionId, this.form);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => {
        this.session = s;
        this.saving = false;
        this.successMessage = 'Session saved.';
        if (this.isNew) {
          this.isNew = false;
          this.sessionId = s.id;
          // Replace URL so reload doesn't go back to /new.
          this.router.navigate(['/daycare', s.id], { replaceUrl: true });
          this.load();
        }
      },
      error: (e) => {
        this.errorMessage = e?.error?.error || e?.error?.detail || 'Save failed';
        this.saving = false;
      },
    });
  }

  // ─── Readings modal ─────────────────────────────────────────────────
  openReadingModal(): void {
    if (this.isNew || !this.session) {
      this.errorMessage = 'Save the session first before adding readings.';
      return;
    }
    this.readingBuf = this.blankReading();
    this.readingBuf.recordedAt = this.localNow();
    this.readingModalOpen = true;
  }
  closeReadingModal(): void { this.readingModalOpen = false; }

  saveReading(): void {
    if (!this.session) return;
    this.savingReading = true;
    this.errorMessage = '';
    this.svc.addReading(this.session.id, this.readingBuf).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.savingReading = false;
        this.successMessage = 'Reading recorded.';
        this.closeReadingModal();
        this.load();
      },
      error: (e) => {
        this.savingReading = false;
        this.errorMessage = e?.error?.error || 'Failed to record reading';
      },
    });
  }

  async deleteReading(r: DayCareReading): Promise<void> {
    if (!this.session) return;
    if (!await this.alertSvc.confirm(`Delete reading at ${new Date(r.recordedAt).toLocaleTimeString()}?`, { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.svc.deleteReading(this.session.id, r.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.load(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Delete failed'; },
    });
  }

  alertList(r: DayCareReading): string[] {
    if (!r.alertsTriggered) return [];
    try {
      const parsed = JSON.parse(r.alertsTriggered);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // ─── Buffer factories ──────────────────────────────────────────────
  private blankSession(): DayCareUpsertPayload {
    return {
      patientName: '',
      procedureType: 'chemo',
      status: 'OPEN',
    };
  }
  private blankReading(): DayCareReadingPayload {
    return { recordedAt: this.localNow(), consciousnessLevel: 1, ivPatency: 'patent' };
  }
  private localNow(): string {
    const d = new Date();
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
