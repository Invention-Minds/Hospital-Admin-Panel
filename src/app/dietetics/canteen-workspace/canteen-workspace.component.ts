import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  DieteticsService,
  MealOrder,
  MealTimeSlot,
  DietaryAlert,
  ExtraFoodOrder,
  BillingRow,
  RoundsRow,
  TRAY_STATUS_LABEL,
  localDateString,
  dietFlags,
} from '../../services/dietetics.service';
import { SignatureCreateResponse } from '../../services/signature.service';
import { AlertService } from '../../services/alert.service';

/**
 * Canteen / dietary workspace — `/dietetics/canteen`.
 *
 * Closed loop on the kitchen floor:
 *   Ordered → Prepared (bulk) → Served (who served it, 2-ID, tray temps,
 *   delay reason when after the meal time) → Intake recorded, or Not served
 *   with a reason.
 * Plus:
 *   • Dietary alerts — admission / discharge / transfer / bed re-occupied,
 *     acknowledged by the dietary staff (the "new patient in bed 1204" risk).
 *   • Extra food — patient extras, attendant meals, home-food patients asking
 *     for a hospital meal: Ordered → Prepared → Served.
 *   • Billing — DocMinds doesn't bill; the team ticks what the HIS has billed.
 */
@Component({
  selector: 'app-canteen-workspace',
  templateUrl: './canteen-workspace.component.html',
  styleUrls: ['../dietetics-shared.css', './canteen-workspace.component.css'],
})
export class CanteenWorkspaceComponent implements OnInit, OnDestroy {
  tab: 'trays' | 'extra' | 'billing' = 'trays';
  date = localDateString();
  slots: MealTimeSlot[] = [];
  slotId = '';

  orders: MealOrder[] = [];
  selected = new Set<string>();
  alerts: DietaryAlert[] = [];
  readonly statusLabel = TRAY_STATUS_LABEL;

  loading = false;
  errorMessage = '';
  successMessage = '';

  // Modal state.
  modal: 'deliver' | 'intake' | 'skip' | null = null;
  active: MealOrder | null = null;
  deliverForm = this.blankDeliver();
  intakeForm = { percentConsumed: 100, complaint: '', notes: '' };
  skipForm = { reason: '' };

  // Extra food.
  extras: ExtraFoodOrder[] = [];
  patients: RoundsRow[] = [];
  extraForm = this.blankExtra();
  extraAction: { order: ExtraFoodOrder; action: 'serve' | 'cancel'; value: string } | null = null;

  // Billing.
  billFrom = localDateString();
  billTo = localDateString();
  billFilter: '' | 'true' | 'false' = 'false';
  billRows: BillingRow[] = [];
  billSelected = new Set<string>();

  readonly role = typeof localStorage !== 'undefined' ? (localStorage.getItem('role') ?? '') : '';
  readonly subAdminType = typeof localStorage !== 'undefined' ? (localStorage.getItem('subAdminType') ?? '') : '';
  readonly username = typeof localStorage !== 'undefined' ? (localStorage.getItem('username') ?? '') : '';

  private destroy$ = new Subject<void>();

  constructor(private svc: DieteticsService, private alertSvc: AlertService) {}

  get canBill(): boolean {
    return this.role === 'super_admin' || ['Canteen Staff', 'Billing Coordinator'].includes(this.subAdminType);
  }
  get canAckAlerts(): boolean {
    return this.role === 'super_admin' || ['Canteen Staff', 'Dietician', 'Diet'].includes(this.subAdminType);
  }

  ngOnInit(): void {
    if (this.subAdminType === 'Billing Coordinator') this.tab = 'billing';
    this.svc.listMealTimeSlots().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.slots = r.filter((s) => s.isActive); },
      error: () => { /* swallow */ },
    });
    this.refresh();
    if (this.tab === 'billing') this.loadBilling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(t: typeof this.tab): void {
    this.tab = t;
    this.errorMessage = '';
    this.successMessage = '';
    if (t === 'extra') this.loadExtras();
    if (t === 'billing') this.loadBilling();
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
    this.svc.listAlerts().pipe(takeUntil(this.destroy$)).subscribe({
      next: (a) => { this.alerts = a; },
      error: () => { /* swallow */ },
    });
  }

  // ─── Alerts ─────────────────────────────────────────────────────────
  acknowledgeAlerts(ids: string[]): void {
    if (!ids.length) return;
    this.svc.acknowledgeAlerts(ids).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.alerts = this.alerts.filter((a) => !ids.includes(a.id)); this.refresh(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Acknowledge failed'; },
    });
  }
  get alertIds(): string[] { return this.alerts.map((a) => a.id); }

  // ─── Trays ──────────────────────────────────────────────────────────
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
      next: (r) => { this.successMessage = `${r.updated} tray(s) marked prepared.`; this.refresh(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Prepare failed'; },
    });
  }

  /** Tray counts for the summary line ("12 ordered · 4 prepared · …"). */
  get trayCounts(): { ordered: number; prepared: number; served: number; notServed: number; alerts: number } {
    const n = (s: string) => this.orders.filter((o) => o.status === s).length;
    return {
      ordered: n('ORDERED'),
      prepared: n('PLATED'),
      served: n('DELIVERED') + n('CONSUMED'),
      notServed: n('SKIPPED'),
      alerts: this.orders.filter((o) => o.alerts?.length).length,
    };
  }

  /** Served after the meal slot's end time → delay reason required. */
  isLate(o: MealOrder | null): boolean {
    if (!o?.mealTimeSlot?.endTime) return false;
    const end = new Date(o.scheduledFor);
    const [hh, mm] = o.mealTimeSlot.endTime.split(':').map(Number);
    end.setHours(hh, mm, 0, 0);
    return new Date() > end;
  }

  openDeliver(o: MealOrder): void {
    this.active = o;
    this.modal = 'deliver';
    this.deliverForm = this.blankDeliver();
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

  // Serve — signature comes from <app-e-sign>.
  onDeliverSigned(sig: SignatureCreateResponse): void {
    if (!this.active) return;
    if (this.isLate(this.active) && !this.deliverForm.delayReason.trim()) {
      this.errorMessage = 'Served after the meal time — enter the delay reason.';
      return;
    }
    this.svc.markDelivered(this.active.id, {
      signatureId: sig.id,
      twoIdVerified: this.deliverForm.twoIdVerified,
      trayHotTempC: this.deliverForm.trayHotTempC,
      trayColdTempC: this.deliverForm.trayColdTempC,
      notes: this.deliverForm.notes || undefined,
      servedByName: this.deliverForm.servedByName || undefined,
      delayReason: this.deliverForm.delayReason || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Served.'; this.closeModal(); this.refresh(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Serve failed'; },
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
        next: () => { this.successMessage = 'Marked not served.'; this.closeModal(); this.refresh(); },
        error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
      });
  }

  async regenerate(): Promise<void> {
    if (!await this.alertSvc.confirm(`Sync meal orders for ${this.date} with the current diet plans and diet sheet? Trays not yet prepared may be changed or skipped; prepared trays and finished meal times are left alone.`)) return;
    this.svc.regenerateForDate(this.date).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.successMessage = `Created ${r.generated}, updated ${r.reassigned}, skipped ${r.cancelled} order(s).`;
        this.refresh();
      },
      error: (e) => { this.errorMessage = e?.error?.error || 'Regenerate failed'; },
    });
  }

  /** Veg / Jain / Halal / Kosher / No onion-garlic badges for the tray's diet. */
  flagsFor(o: MealOrder): string[] {
    return o.dietFlags ?? dietFlags(o.dietPlan?.diet);
  }

  statusClass(s: string): string {
    switch (s) {
      case 'CONSUMED': return 'cw-ok';
      case 'DELIVERED': return 'cw-ok';
      case 'SKIPPED': return 'cw-warn';
      case 'PLATED': return 'cw-info';
      default: return '';
    }
  }

  trayTempBad(t: number | null | undefined, kind: 'hot' | 'cold'): boolean {
    if (t == null) return false;
    return kind === 'hot' ? t < 60 : t > 8;
  }

  // ─── Extra food ─────────────────────────────────────────────────────
  loadExtras(): void {
    this.svc.listExtraFood(this.date).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.extras = r; },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load extra food'; },
    });
    if (!this.patients.length) {
      this.svc.getRounds().pipe(takeUntil(this.destroy$)).subscribe({
        next: (p) => { this.patients = p; },
        error: () => { /* swallow */ },
      });
    }
  }

  createExtra(): void {
    const f = this.extraForm;
    if (!f.admissionId || !f.item.trim()) { this.errorMessage = 'Pick the patient and enter the item.'; return; }
    this.svc.createExtraFood({
      admissionId: f.admissionId,
      forWhom: f.forWhom,
      item: f.item,
      quantity: f.quantity || undefined,
      mealTimeSlotId: f.mealTimeSlotId || null,
      requestedFor: new Date(`${this.date}T${new Date().toTimeString().slice(0, 5)}`).toISOString(),
      notes: f.notes || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Extra food ordered.'; this.extraForm = this.blankExtra(); this.loadExtras(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Order failed'; },
    });
  }

  prepareExtra(o: ExtraFoodOrder): void {
    this.svc.updateExtraFood(o.id, 'prepare').pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.loadExtras(),
      error: (e) => { this.errorMessage = e?.error?.error || 'Update failed'; },
    });
  }

  confirmExtraAction(): void {
    const a = this.extraAction;
    if (!a) return;
    if (a.action === 'cancel' && !a.value.trim()) { this.errorMessage = 'Reason required.'; return; }
    this.svc.updateExtraFood(a.order.id, a.action, a.action === 'serve' ? { servedByName: a.value } : { reason: a.value })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.extraAction = null; this.loadExtras(); },
        error: (e) => { this.errorMessage = e?.error?.error || 'Update failed'; },
      });
  }

  // ─── Billing ────────────────────────────────────────────────────────
  loadBilling(): void {
    this.billSelected.clear();
    this.svc.getBilling({
      from: this.billFrom, to: this.billTo,
      billed: this.billFilter === '' ? undefined : this.billFilter === 'true',
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.billRows = [...r.trays, ...r.extras]; },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load billing list'; },
    });
  }

  toggleBill(id: string): void {
    if (this.billSelected.has(id)) this.billSelected.delete(id); else this.billSelected.add(id);
  }
  selectAllBill(): void { this.billRows.forEach((r) => this.billSelected.add(r.id)); }

  markBilled(billed: boolean): void {
    const rows = this.billRows.filter((r) => this.billSelected.has(r.id));
    const trayIds = rows.filter((r) => r.kind === 'TRAY').map((r) => r.id);
    const extraIds = rows.filter((r) => r.kind === 'EXTRA').map((r) => r.id);
    const done = (n: number) => {
      this.successMessage = `${n} item(s) marked ${billed ? 'billed' : 'not billed'}.`;
      this.loadBilling();
    };
    if (trayIds.length && extraIds.length) {
      this.svc.markOrdersBilled(trayIds, billed).pipe(takeUntil(this.destroy$)).subscribe({
        next: (a) => this.svc.markExtraFoodBilled(extraIds, billed).pipe(takeUntil(this.destroy$)).subscribe({
          next: (b) => done(a.updated + b.updated),
          error: (e) => { this.errorMessage = e?.error?.error || 'Update failed'; },
        }),
        error: (e) => { this.errorMessage = e?.error?.error || 'Update failed'; },
      });
    } else if (trayIds.length) {
      this.svc.markOrdersBilled(trayIds, billed).pipe(takeUntil(this.destroy$)).subscribe({
        next: (a) => done(a.updated),
        error: (e) => { this.errorMessage = e?.error?.error || 'Update failed'; },
      });
    } else if (extraIds.length) {
      this.svc.markExtraFoodBilled(extraIds, billed).pipe(takeUntil(this.destroy$)).subscribe({
        next: (b) => done(b.updated),
        error: (e) => { this.errorMessage = e?.error?.error || 'Update failed'; },
      });
    }
  }

  private blankDeliver() {
    return {
      trayHotTempC: undefined as number | undefined,
      trayColdTempC: undefined as number | undefined,
      twoIdVerified: false,
      notes: '',
      servedByName: '',
      delayReason: '',
    };
  }
  private blankExtra() {
    return {
      admissionId: '',
      forWhom: 'PATIENT' as 'PATIENT' | 'ATTENDANT',
      item: '',
      quantity: '',
      mealTimeSlotId: '',
      notes: '',
    };
  }
}
