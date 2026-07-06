import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QRCodeModule } from 'angularx-qrcode';

import { FeedbackService, FeedbackSurvey, SurveyStats } from '../../services/feedback.service';

/**
 * Phase 9.25 / Phase 4 — Feedback inbox (staff view).
 * Route: /feedback
 * Lists all survey rows with NPS + status. The kiosk URL for any pending row
 * is shown so staff can copy/share it manually until SMS/WhatsApp delivery is
 * wired into the cron.
 */
@Component({
  selector: 'app-feedback-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeModule],
  templateUrl: './feedback-inbox.component.html',
  styleUrls: ['./feedback-inbox.component.css'],
})
export class FeedbackInboxComponent implements OnInit, OnDestroy {
  rows: FeedbackSurvey[] = [];
  stats: SurveyStats | null = null;
  loading = false;
  errorMessage = '';

  filters = { status: '', template: '' };

  // Phase 6 — QR overlay state. When a row is selected the kiosk URL renders
  // as a scannable code so the patient can lift it off a printed page.
  qrSurvey: FeedbackSurvey | null = null;
  // Walk-up poster — permanent QR pointing at /feedback/new for printing.
  walkUpPosterOpen = false;

  readonly STATUSES = ['pending', 'sent', 'completed', 'expired'];
  readonly TEMPLATES = ['opd-post-visit', 'ipd-discharge', 'er-discharge', 'day-care', 'general'];

  private destroy$ = new Subject<void>();
  constructor(private svc: FeedbackService) {}

  ngOnInit(): void { this.load(); this.loadStats(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true; this.errorMessage = '';
    this.svc.list(this.filters as Record<string, string>).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data ?? []; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load surveys'; this.loading = false; },
    });
  }
  loadStats(): void {
    this.svc.stats().pipe(takeUntil(this.destroy$)).subscribe({ next: (s) => (this.stats = s), error: () => { /* best-effort */ } });
  }

  kioskUrl(row: FeedbackSurvey): string {
    return row.token ? `${location.origin}/feedback/k/${row.token}` : '';
  }
  copyLink(row: FeedbackSurvey): void {
    const u = this.kioskUrl(row);
    if (!u) return;
    navigator.clipboard?.writeText(u);
  }

  /** The QR / Copy / Open actions only make sense when the kiosk URL is live —
   * the public token endpoint rejects re-submit + post-expiry, so showing them
   * for completed/expired rows is misleading. */
  canCollect(r: FeedbackSurvey): boolean {
    if (!r.token) return false;
    return r.status === 'pending' || r.status === 'sent';
  }

  openQr(row: FeedbackSurvey): void { this.qrSurvey = row; }
  closeQr(): void { this.qrSurvey = null; }
  printQr(): void { window.print(); }

  walkUpUrl(): string { return `${location.origin}/feedback/new`; }
  openWalkUpPoster(): void { this.walkUpPosterOpen = true; }
  closeWalkUpPoster(): void { this.walkUpPosterOpen = false; }

  npsClass(s: number | null): string {
    if (s == null) return '';
    if (s >= 9) return 'fb-promoter';
    if (s >= 7) return 'fb-passive';
    return 'fb-detractor';
  }
}
