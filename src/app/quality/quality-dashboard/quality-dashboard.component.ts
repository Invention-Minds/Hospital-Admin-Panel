import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  QualityService, SafetyKpis, ClinicalKpis, TimelinessKpis, ExperienceKpis, OtKpis, NabhScorecard,
} from '../../services/quality.service';

type Tab = 'safety' | 'clinical' | 'timeliness' | 'experience' | 'ot' | 'nabh';

/**
 * Phase 9.26 / Phase 5 — Quality / NABH dashboard.
 * Route: /quality
 * One-screen KPI view across every module we've shipped, scoped by date range.
 */
@Component({
  selector: 'app-quality-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quality-dashboard.component.html',
  styleUrls: ['./quality-dashboard.component.css'],
})
export class QualityDashboardComponent implements OnInit, OnDestroy {
  tab: Tab = 'safety';
  from = '';
  to = '';
  loading = false;
  errorMessage = '';

  safety: SafetyKpis | null = null;
  clinical: ClinicalKpis | null = null;
  timeliness: TimelinessKpis | null = null;
  experience: ExperienceKpis | null = null;
  ot: OtKpis | null = null;
  nabh: NabhScorecard | null = null;

  private destroy$ = new Subject<void>();

  constructor(private svc: QualityService, private router: Router) {}

  ngOnInit(): void {
    // Default window: last 30 days.
    const now = new Date();
    const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.to = now.toISOString().slice(0, 10);
    this.from = past.toISOString().slice(0, 10);
    this.loadCurrent();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  switchTab(t: Tab): void { this.tab = t; this.loadCurrent(); }

  loadCurrent(): void {
    this.loading = true;
    this.errorMessage = '';
    const handle = <T>(fn: () => import('rxjs').Observable<T>, assign: (v: T) => void) => {
      fn().pipe(takeUntil(this.destroy$)).subscribe({
        next: (v) => { assign(v); this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load KPIs'; this.loading = false; },
      });
    };
    switch (this.tab) {
      case 'safety':     return handle(() => this.svc.safety(this.from, this.to), (v) => (this.safety = v));
      case 'clinical':   return handle(() => this.svc.clinical(this.from, this.to), (v) => (this.clinical = v));
      case 'timeliness': return handle(() => this.svc.timeliness(this.from, this.to), (v) => (this.timeliness = v));
      case 'experience': return handle(() => this.svc.experience(this.from, this.to), (v) => (this.experience = v));
      case 'ot':         return handle(() => this.svc.ot(this.from, this.to), (v) => (this.ot = v));
      case 'nabh':       return handle(() => this.svc.nabhScorecard(this.from, this.to), (v) => (this.nabh = v));
    }
  }

  /** Health-rate colour. < 80% pct → bad, < 95% → warn, else good. */
  pctClass(p: number): string {
    if (p < 80) return 'q-bad';
    if (p < 95) return 'q-warn';
    return 'q-good';
  }
  /** NPS colour ranges. */
  npsClass(s: number): string {
    if (s < 0) return 'q-bad';
    if (s < 30) return 'q-warn';
    return 'q-good';
  }

  /** Object iteration helper for the templates. */
  entries(obj?: Record<string, number> | null): { key: string; value: number }[] {
    if (!obj) return [];
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }

  openIndicators(): void {
    this.router.navigate(['/quality/indicators']);
  }

  openIncidentsByNabh(clause: string): void {
    // Phase 1 inbox doesn't filter by nabhClause yet — for now route to the inbox.
    // Future: pass it as a query param.
    this.router.navigate(['/incidents'], { queryParams: { nabhClause: clause } });
  }
}
