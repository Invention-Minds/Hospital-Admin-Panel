import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  DieteticsService,
  MealOrder,
  MealTimeSlot,
} from '../../services/dietetics.service';
import { SignatureCreateResponse } from '../../services/signature.service';
import { AlertService } from '../../services/alert.service';

/**
 * Canteen workspace — `/dietetics/canteen`.
 *
 * Single page the canteen + nursing teams use through the shift:
 *   • Filter by date + meal slot.
 *   • Mark trays plated (bulk).
 *   • Open a row → deliver dialog (signature + tray temps + 2-ID checkbox).
 *   • Record intake or skip after delivery.
 */
@Component({
  selector: 'app-canteen-workspace',
  templateUrl: './canteen-workspace.component.html',
  styleUrls: ['./canteen-workspace.component.css'],
})
export class CanteenWorkspaceComponent implements OnInit, OnDestroy {
  date = new Date().toISOString().slice(0, 10);
  slots: MealTimeSlot[] = [];
  slotId = '';

  orders: MealOrder[] = [];
  selected = new Set<string>();

  loading = false;
  errorMessage = '';
  successMessage = '';

  // Modal state.
  modal: 'deliver' | 'intake' | 'skip' | null = null;
  active: MealOrder | null = null;
  deliverForm = { trayHotTempC: undefined as number | undefined, trayColdTempC: undefined as number | undefined, twoIdVerified: false, notes: '' };
  intakeForm = { percentConsumed: 100, complaint: '', notes: '' };
  skipForm = { reason: '' };

  private destroy$ = new Subject<void>();

  constructor(private svc: DieteticsService, private alertSvc: AlertService) {}

  ngOnInit(): void {
    this.svc.listMealTimeSlots().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.slots = r; },
      error: () => { /* swallow */ },
    });
    this.refresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.getKitchenList({ date: this.date, mealTimeSlotId: this.slotId || undefined })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => { this.orders = rows; this.loading = false; this.selected.clear(); },
        error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load'; this.loading = false; },
      });
  }

  toggleSelect(id: string): void {
    if (this.selected.has(id)) this.selected.delete(id); else this.selected.add(id);
  }

  selectAllOrdered(): void {
    for (const o of this.orders) {
      if (o.status === 'ORDERED') this.selected.add(o.id);
    }
  }

  bulkPlate(): void {
    const ids = Array.from(this.selected);
    if (ids.length === 0) return;
    this.svc.markPlated(ids).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.successMessage = `Plated ${r.updated} order(s).`; this.refresh(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Plate failed'; },
    });
  }

  openDeliver(o: MealOrder): void {
    this.active = o;
    this.modal = 'deliver';
    this.deliverForm = { trayHotTempC: undefined, trayColdTempC: undefined, twoIdVerified: false, notes: '' };
  }
  openIntake(o: MealOrder): void {
    this.active = o;
    this.modal = 'intake';
    this.intakeForm = { percentConsumed: 100, complaint: '', notes: '' };
  }
  openSkip(o: MealOrder): void {
    this.active = o;
    this.modal = 'skip';
    this.skipForm = { reason: '' };
  }
  closeModal(): void { this.modal = null; this.active = null; }

  // Deliver — signature comes from <app-e-sign>.
  onDeliverSigned(sig: SignatureCreateResponse): void {
    if (!this.active) return;
    this.svc.markDelivered(this.active.id, {
      signatureId: sig.id,
      twoIdVerified: this.deliverForm.twoIdVerified,
      trayHotTempC: this.deliverForm.trayHotTempC,
      trayColdTempC: this.deliverForm.trayColdTempC,
      notes: this.deliverForm.notes || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Delivered.'; this.closeModal(); this.refresh(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Deliver failed'; },
    });
  }

  saveIntake(): void {
    if (!this.active) return;
    this.svc.recordIntake(this.active.id, this.intakeForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.successMessage = 'Intake recorded.'; this.closeModal(); this.refresh(); },
        error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
      });
  }

  saveSkip(): void {
    if (!this.active) return;
    if (!this.skipForm.reason.trim()) { this.errorMessage = 'Reason required.'; return; }
    this.svc.skipMeal(this.active.id, this.skipForm.reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.successMessage = 'Marked skipped.'; this.closeModal(); this.refresh(); },
        error: (e) => { this.errorMessage = e?.error?.error || 'Skip failed'; },
      });
  }

  async regenerate(): Promise<void> {
    if (!await this.alertSvc.confirm(`Regenerate meal orders for ${this.date}? Existing orders are kept; only missing rows are added.`)) return;
    this.svc.regenerateForDate(this.date).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.successMessage = `Generated ${r.generated} new orders.`; this.refresh(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Regenerate failed'; },
    });
  }

  statusClass(s: string): string {
    switch (s) {
      case 'CONSUMED': return 'cw-ok';
      case 'DELIVERED': return 'cw-info';
      case 'SKIPPED': return 'cw-warn';
      case 'PLATED': return 'cw-info';
      default: return '';
    }
  }

  trayTempBad(t: number | null | undefined, kind: 'hot' | 'cold'): boolean {
    if (t == null) return false;
    return kind === 'hot' ? t < 60 : t > 8;
  }
}
