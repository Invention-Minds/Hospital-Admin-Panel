import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DieteticsService, MealTimeSlot, TakeOrderRow, localDateString } from '../../services/dietetics.service';

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

  get withOptions(): number { return this.rows.filter((r) => r.choices.length > 1).length; }
  get taken(): number { return this.rows.filter((r) => r.choiceTakenAt).length; }

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
      },
      error: (e) => { this.savingId = null; this.errorMessage = e?.error?.error || 'Could not save the choice'; },
    });
  }

  trackRow(_: number, r: TakeOrderRow): string { return r.id; }
}
