import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { QualityService, QiSubmissionStatus } from '../../services/quality.service';
import { isQualityEditor } from '../quality-access';

/**
 * Monthly QI submission deadline banner ("October 2026 — 37 of 94 entered ·
 * due 8 Nov"). Used on the Indicators and Denominators screens. Green when
 * complete, amber in the last 3 days, red when overdue. The Quality Manager
 * can change the due day here; reminders are sent by the backend cron.
 */
@Component({
  selector: 'app-qi-submission-banner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qi-submission-banner.component.html',
  styleUrls: ['./qi-submission-banner.component.css'],
})
export class QiSubmissionBannerComponent implements OnInit, OnDestroy {
  /** Show the "Show missing only" toggle (Indicators screen). */
  @Input() showMissingToggle = false;
  @Input() missingOnly = false;
  @Output() missingOnlyChange = new EventEmitter<boolean>();
  /** Fires after every load so the parent can filter by the missing list. */
  @Output() statusLoaded = new EventEmitter<QiSubmissionStatus>();

  status: QiSubmissionStatus | null = null;
  loadError = '';
  readonly canEdit = isQualityEditor();

  editingDueDay = false;
  dueDayDraft = 8;
  dueDayMin = 1;
  dueDayMax = 28;
  savingDueDay = false;
  dueDayError = '';

  private destroy$ = new Subject<void>();

  constructor(private svc: QualityService) {}

  ngOnInit(): void { this.reload(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  reload(): void {
    this.svc.getSubmissionStatus().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.status = r.data; this.loadError = ''; this.statusLoaded.emit(r.data); },
      error: (e) => { this.status = null; this.loadError = e?.error?.message || 'Could not load the submission deadline'; },
    });
  }

  get tone(): 'good' | 'warn' | 'bad' | 'info' {
    switch (this.status?.state) {
      case 'complete': return 'good';
      case 'due_soon': case 'due_today': return 'warn';
      case 'overdue': return 'bad';
      default: return 'info';
    }
  }

  get monthLabel(): string {
    if (!this.status) return '';
    const [y, m] = this.status.period.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  get dueLabel(): string {
    if (!this.status) return '';
    return new Date(this.status.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  }

  get whenText(): string {
    const s = this.status;
    if (!s) return '';
    switch (s.state) {
      case 'complete': return `all entered · was due ${this.dueLabel}`;
      case 'overdue': return `was due ${this.dueLabel} · ${-s.daysLeft} day(s) overdue`;
      case 'due_today': return `due today (${this.dueLabel})`;
      default: return `due ${this.dueLabel} · ${s.daysLeft} day(s) left`;
    }
  }

  toggleMissing(): void {
    this.missingOnly = !this.missingOnly;
    this.missingOnlyChange.emit(this.missingOnly);
  }

  startEditDueDay(): void {
    if (!this.canEdit) return;
    this.dueDayError = '';
    this.dueDayDraft = this.status?.dueDay ?? 8;
    this.svc.getSubmissionConfig().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.dueDayMin = r.data.min; this.dueDayMax = r.data.max; this.dueDayDraft = r.data.submissionDueDay; },
      error: () => { /* keep defaults; save still validates server-side */ },
    });
    this.editingDueDay = true;
  }

  saveDueDay(): void {
    const day = Number(this.dueDayDraft);
    if (!Number.isInteger(day) || day < this.dueDayMin || day > this.dueDayMax) {
      this.dueDayError = `Enter a day from ${this.dueDayMin} to ${this.dueDayMax}`;
      return;
    }
    this.savingDueDay = true;
    this.svc.updateSubmissionConfig(day).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.savingDueDay = false; this.editingDueDay = false; this.reload(); },
      error: (e) => { this.savingDueDay = false; this.dueDayError = e?.error?.message || 'Could not save'; },
    });
  }
}
