import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  MedicationReconciliationService,
  ReconciliationRow,
  PrescriptionType,
  ReconciliationAction,
} from '../../services/medication-reconciliation.service';

/**
 * Medication Reconciliation panel (Phase 4a — NABH MOM.1.c).
 *
 * Shows every prescription on the admission as a row with two decision
 * dropdowns (prescriptionType + reconciliationAction) and a reason field.
 * Save-per-row pattern — each save audits independently. HOLD / CHANGE /
 * DISCONTINUE require a reason; the form blocks save otherwise.
 */
@Component({
  selector: 'app-ipd-medication-reconciliation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ipd-medication-reconciliation.component.html',
  styleUrls: ['./ipd-medication-reconciliation.component.css'],
})
export class IpdMedicationReconciliationComponent implements OnInit, OnDestroy {
  admissionId = '';
  rows: ReconciliationRow[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  /** Per-row editor buffers — keyed by prescription id. We don't write
   *  directly to the source row in `rows` so a failed save doesn't leave
   *  inconsistent state in the table. */
  buf: Record<string, {
    prescriptionType: PrescriptionType | null | '';
    reconciliationAction: ReconciliationAction | null | '';
    reconciliationReason: string;
    saving: boolean;
  }> = {};

  readonly prescriptionTypes: PrescriptionType[] = ['STAT', 'VARIABLE', 'REGULAR'];
  readonly actions: ReconciliationAction[] = ['CONTINUE', 'CHANGE', 'HOLD', 'DISCONTINUE', 'RECONCILE'];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private svc: MedicationReconciliationService,
  ) {}

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    this.load();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    if (!this.admissionId) return;
    this.loading = true;
    this.errorMessage = '';
    this.svc.list(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => {
        this.rows = rows;
        // Hydrate buffers from server state.
        for (const r of rows) {
          this.buf[r.id] = {
            prescriptionType: r.prescriptionType ?? '',
            reconciliationAction: r.reconciliationAction ?? '',
            reconciliationReason: r.reconciliationReason ?? '',
            saving: false,
          };
        }
        this.loading = false;
      },
      error: (e) => {
        this.errorMessage = e?.error?.error || 'Failed to load reconciliation list';
        this.loading = false;
      },
    });
  }

  needsReason(action: ReconciliationAction | null | '' | undefined): boolean {
    return action === 'HOLD' || action === 'CHANGE' || action === 'DISCONTINUE';
  }

  save(row: ReconciliationRow): void {
    const b = this.buf[row.id];
    if (!b) return;
    if (this.needsReason(b.reconciliationAction) && !b.reconciliationReason.trim()) {
      this.errorMessage = `Reason required for ${b.reconciliationAction}`;
      return;
    }
    b.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.svc.setAction(this.admissionId, row.id, {
      prescriptionType: b.prescriptionType === '' ? null : b.prescriptionType,
      reconciliationAction: b.reconciliationAction === '' ? null : b.reconciliationAction,
      reconciliationReason: b.reconciliationReason || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        b.saving = false;
        this.successMessage = `${row.genericName} reconciled.`;
        this.load();
      },
      error: (e) => {
        b.saving = false;
        this.errorMessage = e?.error?.error || 'Save failed';
      },
    });
  }
}
