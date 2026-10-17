import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QRCodeModule } from 'angularx-qrcode';

import { FeedbackService, FeedbackSurvey, SurveyStats, SurveyTemplate } from '../../services/feedback.service';
import { isComplaintHandler, isFeedbackCollector, isFeedbackViewer } from '../../quality/quality-access';
import { DownloadOtpService } from '../../shared/download-otp/download-otp.service';

/**
 * Phase 9.25 / Phase 4 — Feedback inbox (staff view).
 * Route: /feedback
 *   - complaint handlers: survey list (kiosk links/QR on pending rows) + sweeps
 *   - feedback viewers (incl. senior management): aggregate NPS only
 *   - collectors (incl. Front Desk): create a survey and hand out its QR
 * The API enforces all of this; a 403 just hides the section.
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

  canList = isComplaintHandler();
  canStats = isFeedbackViewer();
  canCreate = isFeedbackCollector();

  filters = { status: '', template: '' };
  npsRange = { from: '', to: '' };

  createForm = { template: 'general' as SurveyTemplate, patientPrn: '', patientName: '', expiresInDays: 14 };
  createOpen = false;
  creating = false;

  // Phase 6 — QR overlay state. When a row is selected the kiosk URL renders
  // as a scannable code so the patient can lift it off a printed page.
  qrSurvey: FeedbackSurvey | null = null;
  // Walk-up poster — permanent QR pointing at /feedback/new for printing.
  walkUpPosterOpen = false;

  readonly STATUSES = ['pending', 'sent', 'completed', 'expired'];
  readonly TEMPLATES: SurveyTemplate[] = ['opd-post-visit', 'ipd-discharge', 'er-discharge', 'day-care', 'general'];

  private destroy$ = new Subject<void>();
  constructor(private svc: FeedbackService, private downloadOtp: DownloadOtpService) {}

  ngOnInit(): void { this.load(); this.loadStats(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    if (!this.canList) return;
    this.loading = true; this.errorMessage = '';
    this.svc.list(this.filters).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data ?? []; this.loading = false; },
      error: (e) => {
        this.loading = false;
        if (e?.status === 403) { this.canList = false; this.rows = []; return; }
        this.errorMessage = this.errText(e, 'Failed to load surveys');
      },
    });
  }

  loadStats(): void {
    if (!this.canStats) return;
    if (this.npsRange.from && this.npsRange.to && this.npsRange.from > this.npsRange.to) {
      this.errorMessage = '"From" must be on or before "To".';
      return;
    }
    this.svc.stats(this.npsRange).pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => (this.stats = s),
      error: (e) => {
        if (e?.status === 403) { this.canStats = false; this.stats = null; return; }
        this.errorMessage = this.errText(e, 'Failed to load NPS');
      },
    });
  }

  clearNpsRange(): void { this.npsRange = { from: '', to: '' }; this.loadStats(); }

  createSurvey(): void {
    const days = Number(this.createForm.expiresInDays);
    if (!Number.isInteger(days) || days < 1 || days > 60) { this.errorMessage = 'Link validity must be 1–60 days.'; return; }
    this.creating = true; this.errorMessage = '';
    this.svc.create({
      template: this.createForm.template,
      patientPrn: this.createForm.patientPrn.trim() || null,
      patientName: this.createForm.patientName.trim() || null,
      expiresInDays: days,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.creating = false;
        this.createOpen = false;
        this.createForm = { template: 'general', patientPrn: '', patientName: '', expiresInDays: 14 };
        this.qrSurvey = r.data;
        this.load();
      },
      error: (e) => {
        this.creating = false;
        if (e?.status === 403) { this.canCreate = false; this.createOpen = false; }
        this.errorMessage = this.errText(e, 'Failed to create survey');
      },
    });
  }

  kioskUrl(row: FeedbackSurvey): string {
    return row.token ? `${location.origin}/feedback/k/${row.token}` : '';
  }
  copyLink(row: FeedbackSurvey): void {
    const u = this.kioskUrl(row);
    if (!u) return;
    navigator.clipboard?.writeText(u);
  }

  /** QR / Copy / Open only when the server returned a live token (pending/sent rows). */
  canCollect(r: FeedbackSurvey): boolean {
    if (!r.token) return false;
    return r.status === 'pending' || r.status === 'sent';
  }

  openQr(row: FeedbackSurvey): void { if (row.token) this.qrSurvey = row; }
  closeQr(): void { this.qrSurvey = null; }
  async printQr(): Promise<void> {
    if (!(await this.downloadOtp.verify('Feedback QR print'))) return;
    window.print();
  }

  walkUpUrl(): string { return `${location.origin}/feedback/new`; }
  openWalkUpPoster(): void { this.walkUpPosterOpen = true; }
  closeWalkUpPoster(): void { this.walkUpPosterOpen = false; }

  npsClass(s: number | null): string {
    if (s == null) return '';
    if (s >= 9) return 'fb-promoter';
    if (s >= 7) return 'fb-passive';
    return 'fb-detractor';
  }

  private errText(e: any, fallback: string): string {
    return e?.error?.message || e?.error?.error || fallback;
  }
}
