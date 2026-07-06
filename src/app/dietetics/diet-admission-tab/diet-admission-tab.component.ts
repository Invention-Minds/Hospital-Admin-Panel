import { Component, Input, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  DieteticsService,
  DietPlan,
  AdmissionInteractionHit,
  MealOrder,
} from '../../services/dietetics.service';

/**
 * Diet tab — `/ipd/admission/:id/diet`.
 *
 * What the bedside team sees:
 *   1. Current diet plan + diet macros + restrictions/allergens.
 *   2. Drug-food interaction warnings (computed live from active prescriptions).
 *   3. Today's meal schedule for this admission.
 *   4. Recent plan history (audit trail).
 */
@Component({
  selector: 'app-diet-admission-tab',
  templateUrl: './diet-admission-tab.component.html',
  styleUrls: ['./diet-admission-tab.component.css'],
})
export class DietAdmissionTabComponent implements OnInit, OnDestroy {
  @Input() admissionId!: string;

  current: DietPlan | null = null;
  history: DietPlan[] = [];
  interactions: AdmissionInteractionHit[] = [];
  todayOrders: MealOrder[] = [];

  restrictions: string[] = [];
  allergens: string[] = [];

  loading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(private svc: DieteticsService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // When mounted as a routed component the parent doesn't pass an @Input.
    if (!this.admissionId) {
      const fromRoute = this.route.snapshot.paramMap.get('admissionId');
      if (fromRoute) this.admissionId = fromRoute;
    }
    this.refresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['admissionId']) this.refresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    if (!this.admissionId) return;
    this.loading = true;
    this.errorMessage = '';

    this.svc.getCurrentPlan(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (p) => {
        this.current = p;
        this.restrictions = this.parseJsonArray(p?.restrictionsSnapshot);
        this.allergens = this.parseJsonArray(p?.allergensSnapshot);
        this.loading = false;
      },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load current plan'; this.loading = false; },
    });

    this.svc.getPlanHistory(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => { this.history = rows; },
      error: () => { this.history = []; },
    });

    this.svc.getInteractionsForAdmission(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => { this.interactions = rows; },
      error: () => { this.interactions = []; },
    });

    const today = new Date().toISOString().slice(0, 10);
    this.svc.getOrdersForAdmission(this.admissionId, today).pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => { this.todayOrders = rows; },
      error: () => { this.todayOrders = []; },
    });
  }

  private parseJsonArray(s: string | null | undefined): string[] {
    if (!s) return [];
    try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
  }

  statusColor(s: string): string {
    switch (s) {
      case 'CONSUMED': return 'dt-ok';
      case 'DELIVERED': return 'dt-info';
      case 'SKIPPED': return 'dt-warn';
      case 'PLATED': return 'dt-info';
      default: return '';
    }
  }
}
