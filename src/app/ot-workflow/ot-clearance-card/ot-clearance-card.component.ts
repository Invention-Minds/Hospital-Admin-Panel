import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { OtClearance, OtClearanceService, OtClearanceStatus } from '../../services/ot-clearance.service';
import { AlertService } from '../../services/alert.service';

/**
 * Phase 9.1c — OT Clearance card (UHJ/IPS/F-32).
 *
 * Embed via <app-ot-clearance-card [scheduleId]="id"></app-ot-clearance-card>.
 * Renders the financial clearance gate on the schedule detail page —
 * billing fills + signs before the schedule can be started.
 *
 * Status colours match the rest of the OT page:
 *   pending → yellow banner with editable fields + actions
 *   cleared → green banner; read-only summary
 *   rejected → red banner with reason
 */
@Component({
  selector: 'app-ot-clearance-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ot-clearance-card.component.html',
  styleUrls: ['./ot-clearance-card.component.css'],
})
export class OtClearanceCardComponent implements OnChanges, OnDestroy {
  @Input() scheduleId = '';

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  row: OtClearance | null = null;
  paymentMode: 'cash' | 'insurance' | 'corporate' | 'other' | '' = '';
  billingNotes = '';
  remarks = '';

  readonly paymentModes: ReadonlyArray<{ value: 'cash' | 'insurance' | 'corporate' | 'other'; label: string }> = [
    { value: 'cash', label: 'Cash' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'other', label: 'Other' },
  ];

  private destroy$ = new Subject<void>();

  constructor(private svc: OtClearanceService, private alertSvc: AlertService) {}

  ngOnChanges(c: SimpleChanges): void {
    if (c['scheduleId'] && this.scheduleId) this.load();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.get(this.scheduleId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.row = res.data;
        if (res.data) {
          this.paymentMode = res.data.paymentMode ?? '';
          this.billingNotes = res.data.billingNotes ?? '';
          this.remarks = res.data.remarks ?? '';
        }
        this.loading = false;
      },
      error: (e) => {
        this.errorMessage = e?.error?.message || 'Failed to load clearance';
        this.loading = false;
      },
    });
  }

  saveDraft(): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.svc.upsert(this.scheduleId, {
      paymentMode: this.paymentMode || undefined,
      billingNotes: this.billingNotes,
      remarks: this.remarks,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.row = res.data;
        this.saving = false;
        this.successMessage = 'Saved.';
      },
      error: (e) => {
        this.saving = false;
        this.errorMessage = e?.error?.message || 'Save failed';
      },
    });
  }

  markCleared(): void {
    if (!this.row) {
      this.errorMessage = 'Save the draft first';
      return;
    }
    if (this.row.clearanceStatus === 'cleared') return;
    this.saving = true;
    this.svc.clear(this.scheduleId, {}).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.row = res.data;
        this.saving = false;
        this.successMessage = 'Cleared.';
      },
      error: (e) => {
        this.saving = false;
        this.errorMessage = e?.error?.message || 'Clear failed';
      },
    });
  }

  async reject(): Promise<void> {
    const reason = await this.alertSvc.prompt('Reason for rejection?', { title: 'Reject clearance', placeholder: 'Reason…', confirmLabel: 'Reject', severity: 'danger' });
    if (!reason?.trim()) return;
    this.saving = true;
    this.svc.reject(this.scheduleId, reason).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.row = res.data;
        this.saving = false;
        this.successMessage = 'Rejected.';
      },
      error: (e) => {
        this.saving = false;
        this.errorMessage = e?.error?.message || 'Reject failed';
      },
    });
  }

  /** Phase 9.3d — undo cleared/rejected back to pending. */
  async reset(): Promise<void> {
    const reason = await this.alertSvc.prompt('Reason for resetting clearance (e.g. wrong patient, billing dispute)?', { title: 'Reset clearance', placeholder: 'Reason…', confirmLabel: 'Reset', severity: 'warning' });
    if (!reason?.trim()) return;
    this.saving = true;
    this.svc.reset(this.scheduleId, reason).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.row = res.data;
        this.saving = false;
        this.successMessage = 'Reset to pending.';
      },
      error: (e) => {
        this.saving = false;
        this.errorMessage = e?.error?.message || 'Reset failed';
      },
    });
  }

  bannerClass(): string {
    const status: OtClearanceStatus = this.row?.clearanceStatus ?? 'pending';
    return `clr-banner clr-${status}`;
  }
}
