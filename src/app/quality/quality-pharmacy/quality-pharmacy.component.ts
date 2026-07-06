import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  QualityService,
  PharmacyCriticalDrug, PharmacyDrugCreateBody,
  PharmacyStockEvent, StockEventCreateBody, PharmacyEventType,
} from '../../services/quality.service';
import { AlertService } from '../../services/alert.service';

type Tab = 'drugs' | 'events';

/**
 * Phase 9.26 / Phase 5g — Pharmacy critical drugs + stock events.
 * Route: /quality/pharmacy
 *
 * Two tabs: critical drug master (denominator of OPS-003), and stock event
 * log (stock-outs feed OPS-003 numerator, expired feed OPS-004 numerator).
 */
@Component({
  selector: 'app-quality-pharmacy',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quality-pharmacy.component.html',
  styleUrls: ['./quality-pharmacy.component.css'],
})
export class QualityPharmacyComponent implements OnInit, OnDestroy {
  tab: Tab = 'drugs';

  loading = false; saving = false;
  errorMessage = ''; successMessage = '';

  drugs: PharmacyCriticalDrug[] = [];
  events: PharmacyStockEvent[] = [];

  drugDraft: PharmacyDrugCreateBody = { code: '', name: '', category: '', isCritical: true };

  eventDraft: StockEventCreateBody = {
    drugId: '', eventType: 'stock_out', occurredAt: this.todayIso(),
    batchCode: '', expiryDate: '', quantity: null, notes: '',
  };
  readonly EVENT_TYPES: PharmacyEventType[] = ['stock_out', 'expired'];

  private destroy$ = new Subject<void>();

  constructor(private svc: QualityService, private router: Router, private alertSvc: AlertService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  switchTab(t: Tab): void { this.tab = t; this.errorMessage = ''; this.successMessage = ''; this.load(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    if (this.tab === 'drugs') {
      this.svc.listDrugs().pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => {
          this.drugs = r.data;
          if (!this.eventDraft.drugId && r.data.length > 0) this.eventDraft.drugId = r.data[0].id;
          this.loading = false;
        },
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load'; this.loading = false; },
      });
    } else {
      const { start, end } = this.monthBounds();
      // Need drugs too for the form dropdown.
      this.svc.listDrugs().pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => {
          this.drugs = r.data;
          if (!this.eventDraft.drugId && r.data.length > 0) this.eventDraft.drugId = r.data[0].id;
          this.svc.listStockEvents({ from: start, to: end }).pipe(takeUntil(this.destroy$)).subscribe({
            next: (re) => { this.events = re.data; this.loading = false; },
            error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load events'; this.loading = false; },
          });
        },
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load drugs'; this.loading = false; },
      });
    }
  }

  // ── Drug handlers ────────────────────────────────────────────────────
  submitDrug(): void {
    if (!this.drugDraft.code.trim() || !this.drugDraft.name.trim()) {
      this.errorMessage = 'Code and name are required'; return;
    }
    this.saving = true; this.errorMessage = ''; this.successMessage = '';
    this.svc.createDrug({
      code: this.drugDraft.code.trim(), name: this.drugDraft.name.trim(),
      category: this.drugDraft.category || undefined,
      isCritical: this.drugDraft.isCritical !== false,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.successMessage = 'Drug added';
        setTimeout(() => (this.successMessage = ''), 2500);
        this.drugDraft = { code: '', name: '', category: '', isCritical: true };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to add'; },
    });
  }
  toggleCritical(d: PharmacyCriticalDrug): void {
    this.svc.updateDrug(d.id, { isCritical: !d.isCritical }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: (e) => (this.errorMessage = e?.error?.message || 'Failed to update'),
    });
  }
  async removeDrug(d: PharmacyCriticalDrug): Promise<void> {
    if (!await this.alertSvc.confirm(`Remove ${d.code} from the critical-drug list?`, { severity: 'warning', confirmLabel: 'Remove' })) return;
    this.svc.deleteDrug(d.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: (e) => (this.errorMessage = e?.error?.message || 'Failed to remove'),
    });
  }

  // ── Stock event handlers ─────────────────────────────────────────────
  submitEvent(): void {
    this.saving = true; this.errorMessage = ''; this.successMessage = '';
    this.svc.createStockEvent({
      drugId: this.eventDraft.drugId || undefined,
      eventType: this.eventDraft.eventType,
      occurredAt: this.eventDraft.occurredAt || undefined,
      batchCode: this.eventDraft.batchCode || undefined,
      expiryDate: this.eventDraft.expiryDate || undefined,
      quantity: this.eventDraft.quantity ?? null,
      notes: this.eventDraft.notes || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.successMessage = 'Event recorded';
        setTimeout(() => (this.successMessage = ''), 2500);
        this.eventDraft = {
          drugId: this.eventDraft.drugId,
          eventType: this.eventDraft.eventType,
          occurredAt: this.todayIso(),
          batchCode: '', expiryDate: '', quantity: null, notes: '',
        };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to record'; },
    });
  }
  async removeEvent(ev: PharmacyStockEvent): Promise<void> {
    if (!await this.alertSvc.confirm(`Delete this ${ev.eventType} event?`, { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.svc.deleteStockEvent(ev.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: (e) => (this.errorMessage = e?.error?.message || 'Failed to delete'),
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  private monthBounds(): { start: string; end: string } {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    return { start, end };
  }

  goBack(): void { this.router.navigate(['/quality/indicators']); }
}
