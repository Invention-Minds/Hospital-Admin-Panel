import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { QualityService, QualityTrends, TodayLink, TrendMeasure } from '../../services/quality.service';
import { RunChartComponent } from '../run-chart/run-chart.component';

type View = 'flagged' | 'all';
interface Group { name: string; measures: TrendMeasure[] }

/**
 * Quality → Trends: 19 measures as 12-month run charts. Signals (shift,
 * trend, worst month) come from the server; concerns are listed first.
 */
@Component({
  selector: 'app-quality-trends',
  standalone: true,
  imports: [CommonModule, RunChartComponent],
  templateUrl: './quality-trends.component.html',
  styleUrls: ['./quality-trends.component.css'],
})
export class QualityTrendsComponent implements OnInit, OnDestroy {
  data: QualityTrends | null = null;
  loading = false;
  errorMessage = '';
  view: View = 'all';

  // Built once per load.
  concerns: TrendMeasure[] = [];
  improvements: TrendMeasure[] = [];
  groups: Group[] = [];
  notEnough: string[] = [];

  private destroy$ = new Subject<void>();
  constructor(private svc: QualityService, private router: Router) {}

  ngOnInit(): void { this.load(false); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(fresh: boolean): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.trends(fresh).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.data = r.data; this.build(); this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Could not load trends'; this.loading = false; },
    });
  }

  private build(): void {
    const ms = this.data?.measures ?? [];
    this.concerns = ms.filter((m) => m.signals.some((s) => s.polarity === 'concern'));
    this.improvements = ms.filter((m) => !this.concerns.includes(m) && m.signals.some((s) => s.polarity === 'improvement'));
    this.notEnough = ms.filter((m) => !m.enoughData).map((m) => m.label);
    const byGroup = new Map<string, TrendMeasure[]>();
    for (const m of ms) { if (!byGroup.has(m.group)) byGroup.set(m.group, []); byGroup.get(m.group)!.push(m); }
    this.groups = [...byGroup.entries()].map(([name, measures]) => ({ name, measures }));
    this.view = this.concerns.length ? 'flagged' : 'all';
  }

  setView(v: View): void { this.view = v; }
  open(link?: TodayLink): void { if (link) this.router.navigate([link.path], link.query ? { queryParams: link.query } : {}); }

  latest(m: TrendMeasure): number | null {
    for (let i = m.points.length - 1; i >= 0; i--) if (m.points[i].value !== null) return m.points[i].value;
    return null;
  }
  fmt(v: number | null, unit: string): string {
    if (v === null) return '—';
    return unit === '%' ? `${v}%` : unit ? `${v} ${unit}` : `${v}`;
  }
  monthLabel(p: string): string {
    const [y, m] = p.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }
  trackKey(_: number, m: TrendMeasure): string { return m.key; }
}
