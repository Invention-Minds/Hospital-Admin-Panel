import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  EmrgSurcharge,
  EmrgSurchargeMeta,
  EmrgSurchargeType,
  OtEmrgSurchargeService,
} from '../../services/ot-emrg-surcharge.service';
import { AlertService } from '../../services/alert.service';

/**
 * Phase 9.5a — Emergency Surgery Charges (Emrg Surgery Charges).
 *
 * Lists current surcharges on a schedule, adds new ones with a surcharge
 * type + flat amount OR percent of base. Once apply()'d, the row is also
 * posted as an EstimationSurgeryLine on the linked estimation.
 *
 * Route: /surgery-ot/:id/emrg-charges
 */
@Component({
  selector: 'app-ot-emrg-charges',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ot-emrg-charges.component.html',
  styleUrls: ['./ot-emrg-charges.component.css'],
})
export class OtEmrgChargesComponent implements OnInit, OnDestroy {
  scheduleId = '';
  rows: EmrgSurcharge[] = [];
  meta: EmrgSurchargeMeta = { grandTotal: 0, count: 0 };
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  // Add form
  draft: { surchargeType: EmrgSurchargeType; reason: string; baseAmount: number; percent: number; flatAmount: number } = {
    surchargeType: 'after-hours',
    reason: '',
    baseAmount: 0,
    percent: 0,
    flatAmount: 0,
  };

  readonly types: { value: EmrgSurchargeType; label: string }[] = [
    { value: 'after-hours', label: 'After Hours' },
    { value: 'weekend', label: 'Weekend' },
    { value: 'holiday', label: 'Holiday' },
    { value: 'staff-callback', label: 'Staff Callback' },
    { value: 'equipment-setup', label: 'Equipment Setup' },
    { value: 'custom', label: 'Custom' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: OtEmrgSurchargeService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.scheduleId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.scheduleId) this.load();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  computedTotal(): number {
    const base = Number(this.draft.baseAmount || 0);
    const pct = Number(this.draft.percent || 0);
    const flat = Number(this.draft.flatAmount || 0);
    return Math.round(((base * pct) / 100 + flat) * 100) / 100;
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.list(this.scheduleId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data; this.meta = r.meta; this.loading = false; },
      error: () => { this.errorMessage = 'Failed to load surcharges'; this.loading = false; },
    });
  }

  add(): void {
    if (this.computedTotal() <= 0) {
      this.errorMessage = 'Surcharge total must be greater than 0';
      return;
    }
    this.saving = true;
    this.svc.add(this.scheduleId, {
      surchargeType: this.draft.surchargeType,
      reason: this.draft.reason || null,
      baseAmount: Number(this.draft.baseAmount || 0),
      percent: Number(this.draft.percent || 0),
      flatAmount: Number(this.draft.flatAmount || 0),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Surcharge added.';
        setTimeout(() => (this.successMessage = ''), 2500);
        this.draft = { surchargeType: 'after-hours', reason: '', baseAmount: 0, percent: 0, flatAmount: 0 };
        this.load();
      },
      error: (e) => {
        this.saving = false;
        this.errorMessage = e?.error?.message || 'Failed to add surcharge';
      },
    });
  }

  async remove(row: EmrgSurcharge): Promise<void> {
    if (!await this.alertSvc.confirm(`Remove surcharge ${row.surchargeType} (₹${row.totalAmount})?`, { severity: 'warning', confirmLabel: 'Remove' })) return;
    this.svc.remove(row.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to remove'; },
    });
  }

  apply(row: EmrgSurcharge): void {
    this.svc.apply(row.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.successMessage = `Surcharge posted to estimation.`;
        setTimeout(() => (this.successMessage = ''), 2500);
        this.load();
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to apply'; },
    });
  }

  close(): void { this.router.navigate(['/surgery-ot', this.scheduleId]); }
}
