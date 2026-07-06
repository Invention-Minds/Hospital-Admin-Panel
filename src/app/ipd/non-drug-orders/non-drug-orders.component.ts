import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  NonDrugOrder,
  NonDrugOrderService,
  NonDrugOrderStatus,
  NonDrugCategory,
} from '../../services/non-drug-order.service';
import { MastersService, MasterLabTest, MasterRadiologyTest } from '../../services/masters.service';
import { AlertService } from '../../services/alert.service';

/**
 * IPD Non-Drug Doctor Orders page (Phase 7).
 *
 * Lists every non-drug order on the admission with its three-state chain
 * (ORDERED → ACKNOWLEDGED → COMPLETED). Doctors create, nurses
 * acknowledge, anyone with clinical-actor rights completes or cancels.
 */
@Component({
  selector: 'app-non-drug-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './non-drug-orders.component.html',
  styleUrls: ['./non-drug-orders.component.css'],
})
export class NonDrugOrdersComponent implements OnInit, OnDestroy {
  admissionId = '';
  rows: NonDrugOrder[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  filterStatus: NonDrugOrderStatus | '' = '';

  // New-order form
  draft = {
    orderText: '',
    category: '' as NonDrugCategory | '',
    // Phase 9.5i — when category='investigation', the user picks from a
    // dropdown of Lab + Radiology master tests instead of typing free text.
    // Selection writes the test description into `orderText` on create().
    investigationTestId: '' as string,
  };
  creating = false;

  // Investigation lookup — loaded once, merged Lab + Radiology tests.
  investigationOptions: Array<{ id: string; label: string; type: 'lab' | 'radiology' }> = [];

  // Complete-modal state
  completeRowId: string | null = null;
  completionNotes = '';

  readonly categories: ReadonlyArray<{ value: NonDrugCategory; label: string }> = [
    { value: 'diet', label: 'Diet' },
    { value: 'mobility', label: 'Mobility' },
    { value: 'investigation', label: 'Investigation' },
    { value: 'procedure', label: 'Procedure' },
    { value: 'consult', label: 'Consult' },
    { value: 'other', label: 'Other' },
  ];

  readonly statuses: ReadonlyArray<{ value: NonDrugOrderStatus | ''; label: string }> = [
    { value: '', label: 'All' },
    { value: 'ORDERED', label: 'Ordered' },
    { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private svc: NonDrugOrderService,
    private masters: MastersService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    if (this.admissionId) this.load();
    this.loadInvestigationOptions();
  }

  /** Pulls Lab + Radiology master tests once on init. */
  private loadInvestigationOptions(): void {
    this.masters.listLabTests().pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows: MasterLabTest[]) => {
        const labs = rows.map((r) => ({ id: `lab-${r.id}`, label: `Lab · ${r.description}`, type: 'lab' as const }));
        this.investigationOptions = [...labs, ...this.investigationOptions]
          .sort((a, b) => a.label.localeCompare(b.label));
      },
    });
    this.masters.listRadiologyTests().pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows: MasterRadiologyTest[]) => {
        const rads = rows.map((r) => ({ id: `rad-${r.id}`, label: `Radiology · ${r.description}`, type: 'radiology' as const }));
        this.investigationOptions = [...this.investigationOptions, ...rads]
          .sort((a, b) => a.label.localeCompare(b.label));
      },
    });
  }

  /** When category changes, reset the investigation picker. */
  onCategoryChange(): void {
    this.draft.investigationTestId = '';
  }

  /** When user picks an investigation, mirror its label into orderText. */
  onInvestigationPick(): void {
    const picked = this.investigationOptions.find((o) => o.id === this.draft.investigationTestId);
    if (picked) this.draft.orderText = picked.label;
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    const status = this.filterStatus || undefined;
    this.svc.list(this.admissionId, status as NonDrugOrderStatus | undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => { this.rows = rows; this.loading = false; },
        error: (e) => {
          this.errorMessage = e?.error?.error || 'Failed to load orders';
          this.loading = false;
        },
      });
  }

  onFilterChange(): void {
    this.load();
  }

  create(): void {
    if (!this.draft.orderText.trim()) {
      this.errorMessage = 'Order text is required';
      return;
    }
    this.creating = true;
    this.errorMessage = '';
    this.svc.create(this.admissionId, {
      orderText: this.draft.orderText.trim(),
      category: this.draft.category || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (row) => {
        this.rows = [row, ...this.rows];
        this.draft = { orderText: '', category: '', investigationTestId: '' };
        this.creating = false;
        this.successMessage = 'Order created.';
      },
      error: (e) => {
        this.errorMessage = e?.error?.error || 'Create failed';
        this.creating = false;
      },
    });
  }

  acknowledge(row: NonDrugOrder): void {
    this.errorMessage = '';
    this.svc.acknowledge(this.admissionId, row.id, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.replaceRow(updated);
          this.successMessage = 'Acknowledged.';
        },
        error: (e) => {
          this.errorMessage = e?.error?.error || 'Acknowledge failed';
        },
      });
  }

  openComplete(row: NonDrugOrder): void {
    this.completeRowId = row.id;
    this.completionNotes = '';
  }

  closeComplete(): void {
    this.completeRowId = null;
    this.completionNotes = '';
  }

  confirmComplete(): void {
    if (!this.completeRowId) return;
    const id = this.completeRowId;
    this.svc.complete(this.admissionId, id, {
      completionNotes: this.completionNotes || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated) => {
        this.replaceRow(updated);
        this.closeComplete();
        this.successMessage = 'Completed.';
      },
      error: (e) => {
        this.errorMessage = e?.error?.error || 'Complete failed';
      },
    });
  }

  async cancel(row: NonDrugOrder): Promise<void> {
    if (!await this.alertSvc.confirm('Cancel this order?', { severity: 'warning', confirmLabel: 'Cancel order' })) return;
    this.svc.cancel(this.admissionId, row.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.replaceRow(updated);
          this.successMessage = 'Cancelled.';
        },
        error: (e) => {
          this.errorMessage = e?.error?.error || 'Cancel failed';
        },
      });
  }

  private replaceRow(updated: NonDrugOrder): void {
    this.rows = this.rows.map((r) => (r.id === updated.id ? updated : r));
  }

  statusClass(s: NonDrugOrderStatus): string {
    switch (s) {
      case 'ORDERED': return 'ndo-pill ndo-ordered';
      case 'ACKNOWLEDGED': return 'ndo-pill ndo-ack';
      case 'COMPLETED': return 'ndo-pill ndo-done';
      case 'CANCELLED': return 'ndo-pill ndo-cancel';
    }
  }
}
