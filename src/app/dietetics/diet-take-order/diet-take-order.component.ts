import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DieteticsService, MealTimeSlot, TakeOrderRow, TrayDish, localDateString } from '../../services/dietetics.service';

/**
 * Take order — `/dietetics/take-order`.
 *
 * Canteen staff go bed to bed before a meal and record which dish each
 * patient wants, from the options configured for that patient's diet (the
 * weekly-menu default + extra options in Dietetics setup). The tray then
 * carries the chosen dish. Only trays the kitchen hasn't started can change.
 */
@Component({
  selector: 'app-diet-take-order',
  templateUrl: './diet-take-order.component.html',
  styleUrls: ['../dietetics-shared.css', './diet-take-order.component.css'],
})
export class DietTakeOrderComponent implements OnInit, OnDestroy {
  date = localDateString();
  slotId = '';
  wardId = '';
  slots: MealTimeSlot[] = [];
  wards: Array<{ id: string; wardName: string }> = [];
  rows: TakeOrderRow[] = [];
  savingId: string | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(private svc: DieteticsService) {}

  ngOnInit(): void {
    this.svc.listMealTimeSlots().pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => {
        this.slots = s.filter((x) => x.isActive).sort((a, b) => a.sequence - b.sequence);
        // Default to the next meal that hasn't ended.
        const now = new Date().toTimeString().slice(0, 5);
        this.slotId = (this.slots.find((x) => x.endTime >= now) ?? this.slots[0])?.id ?? '';
        this.load();
      },
    });
    this.svc.listCensusWards().pipe(takeUntil(this.destroy$)).subscribe({ next: (w) => { this.wards = w; } });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    if (!this.slotId) return;
    this.loading = true;
    this.errorMessage = '';
    this.svc.getTakeOrder({ date: this.date, mealTimeSlotId: this.slotId, wardId: this.wardId || undefined })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { this.rows = r; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load'; this.loading = false; },
      });
  }

  /** Patient has something to choose: another plate, or a dish to swap. */
  hasChoice(r: TakeOrderRow): boolean { return r.choices.length > 1 || r.items.some((i) => i.swapTo.length > 1); }
  get withOptions(): number { return this.rows.filter((r) => this.hasChoice(r)).length; }
  get taken(): number { return this.rows.filter((r) => r.choiceTakenAt).length; }
  get changedDishes(): number { return this.rows.reduce((n, r) => n + r.items.filter((i) => i.swapped || i.omitted).length, 0); }
  /** Meal cut-off already passed — the kitchen count may be fixed. */
  get cutoffPassed(): boolean { return this.rows.length > 0 && this.rows.every((r) => r.cutoffPassed); }

  /** Swap one dish on the tray (choosing the meal's own dish puts it back). */
  swapDish(r: TakeOrderRow, item: TrayDish, dishId: string): void {
    if (!dishId || dishId === item.dish.id) return;
    const back = dishId === item.defaultDishId;
    this.saveDish(r, item, back ? 'restore' : 'swap', back ? undefined : dishId);
  }
  /** Patient doesn't want this dish / wants it back. */
  toggleOmit(r: TakeOrderRow, item: TrayDish): void {
    this.saveDish(r, item, item.omitted ? 'restore' : 'omit');
  }
  private saveDish(r: TakeOrderRow, item: TrayDish, action: 'swap' | 'omit' | 'restore', dishId?: string): void {
    this.savingId = r.id;
    this.errorMessage = '';
    this.svc.updateTrayDish(r.id, item.id, action, dishId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.savingId = null;
        const to = action === 'restore' ? item.defaultDishId : dishId ?? item.dish.id;
        const next = item.swapTo.find((d) => d.id === to);
        if (action !== 'omit' && next) item.dish = next;
        item.omitted = action === 'omit';
        item.swapped = item.dish.id !== item.defaultDishId;
        item.changedLate = res.late;
        r.choiceTakenAt = new Date().toISOString();
        const what = action === 'omit' ? `no ${item.dish.name}` : action === 'restore' ? `${item.dish.name} (as planned)` : item.dish.name;
        this.successMessage = `Bed ${r.bedNumber || '—'}: ${what}.${res.late ? ' After the cut-off — tell the kitchen.' : ''}`;
      },
      error: (e) => { this.savingId = null; this.errorMessage = e?.error?.error || 'Could not change the dish'; },
    });
  }

  trackItem(_: number, i: TrayDish): string { return i.id; }

  choose(r: TakeOrderRow, mealId: string): void {
    if (r.currentMeal?.id === mealId && r.choiceTakenAt) return;
    this.savingId = r.id;
    this.errorMessage = '';
    this.svc.setTrayChoice(r.id, mealId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (o) => {
        this.savingId = null;
        const meal = r.choices.find((c) => c.id === mealId);
        r.currentMeal = meal ? { id: meal.id, name: meal.name } : r.currentMeal;
        r.choiceTakenAt = o.choiceTakenAt ?? new Date().toISOString();
        this.successMessage = `Bed ${r.bedNumber || '—'}: ${meal?.name ?? 'dish'} recorded.`;
        // A different plate brings its own dish list.
        this.load();
      },
      error: (e) => { this.savingId = null; this.errorMessage = e?.error?.error || 'Could not save the choice'; },
    });
  }

  trackRow(_: number, r: TakeOrderRow): string { return r.id; }
}
