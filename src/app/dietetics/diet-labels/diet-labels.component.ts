import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  DieteticsService,
  LabelSheet,
  MealTimeSlot,
  localDateString,
} from '../../services/dietetics.service';

/**
 * Diet labels — `/dietetics/labels`. Replaces the hand-written stickers:
 * one label per tray (and per extra-food order) for the chosen meal, with
 * bed, patient name, PRN, diet code, food allergy / avoid, the item and a QR
 * code for bedside identification. Size / columns come from Setup → Sheet &
 * labels; Print uses the browser (A4 sticker sheet or label printer).
 */
@Component({
  selector: 'app-diet-labels',
  templateUrl: './diet-labels.component.html',
  styleUrls: ['../dietetics-shared.css', './diet-labels.component.css'],
})
export class DietLabelsComponent implements OnInit, OnDestroy {
  date = localDateString();
  slotId = '';
  wardId = '';
  slots: MealTimeSlot[] = [];
  wards: Array<{ id: string; wardName: string }> = [];
  sheet: LabelSheet | null = null;
  loading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(private svc: DieteticsService) {}

  ngOnInit(): void {
    this.svc.listMealTimeSlots().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.slots = r.filter((s) => s.isActive);
        // Default to the next meal that hasn't ended yet.
        const now = new Date();
        const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const next = this.slots.find((s) => s.endTime > hhmm) ?? this.slots[0];
        if (next) { this.slotId = next.id; this.load(); }
      },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load meal times'; },
    });
    this.svc.listCensusWards().pipe(takeUntil(this.destroy$)).subscribe({
      next: (w) => { this.wards = w; },
      error: () => { /* swallow */ },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    if (!this.slotId) return;
    this.loading = true;
    this.errorMessage = '';
    this.svc.getLabels({ date: this.date, mealTimeSlotId: this.slotId, wardId: this.wardId || undefined })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (s) => { this.sheet = s; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.error || 'Failed to build labels'; this.loading = false; },
      });
  }

  get gridStyle(): Record<string, string> {
    const l = this.sheet?.layout;
    if (!l) return {};
    return {
      'grid-template-columns': `repeat(${l.columns}, ${l.widthMm}mm)`,
      'grid-auto-rows': `${l.heightMm}mm`,
    };
  }

  print(): void {
    if (typeof window !== 'undefined') window.print();
  }
}
