import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  QualityCluster, QualityService, QualityToday, TodayBriefSection, TodayLink, TodayRadarRow,
} from '../../services/quality.service';

type RadarFilter = 'all' | 'overdue' | 'today' | 'soon';

/**
 * Quality Manager "Today" page (first tab of /quality for the QM).
 * What happened since yesterday, what is about to breach, and who is
 * sitting on open work. Read-only; every row opens the underlying record.
 */
@Component({
  selector: 'app-quality-today',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quality-today.component.html',
  styleUrls: ['./quality-today.component.css'],
})
export class QualityTodayComponent implements OnInit, OnDestroy {
  data: QualityToday | null = null;
  loading = false;
  errorMessage = '';
  /** 0 = default window (24 h; Monday → since Friday 09:00). */
  hours = 0;
  readonly WINDOWS = [
    { value: 0, label: 'Since yesterday' },
    { value: 48, label: 'Last 48 h' },
    { value: 72, label: 'Last 72 h' },
    { value: 168, label: 'Last 7 days' },
  ];

  // Built once per load — never from getters (endless change detection).
  activeSections: TodayBriefSection[] = [];
  quietSections: string[] = [];
  radarFilter: RadarFilter = 'all';
  radarRows: TodayRadarRow[] = [];
  tiles: Array<{ label: string; value: number; tone: 'bad' | 'warn' | 'good' | 'info'; hint?: string; target?: string }> = [];

  private destroy$ = new Subject<void>();

  constructor(private svc: QualityService, private router: Router) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  /** Pattern alerts (possible outbreaks, bunching falls, repeat complaints …). */
  clusters: QualityCluster[] = [];
  clustersLoaded = false;

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.clusters().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.clusters = r.data.clusters; this.clustersLoaded = true; },
      error: () => { this.clusters = []; this.clustersLoaded = false; },
    });
    this.svc.today(this.hours || undefined).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.data = r.data; this.build(); this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Could not load the Today page'; this.loading = false; },
    });
  }

  private build(): void {
    const d = this.data;
    if (!d) return;
    this.activeSections = d.safety.filter((s) => s.count > 0);
    this.quietSections = d.safety.filter((s) => s.count === 0).map((s) => s.label);
    const count = (k: string) => d.safety.find((s) => s.key === k)?.count ?? 0;
    const un = d.accountability.unassigned;
    this.tiles = [
      { label: 'Deaths', value: count('deaths'), tone: count('deaths') ? 'bad' : 'good', target: 'deaths' },
      { label: 'Serious-harm / sentinel', value: count('serious'), tone: count('serious') ? 'bad' : 'good', target: 'serious' },
      { label: 'Serious, no RCA > 24 h', value: count('no_rca'), tone: count('no_rca') ? 'bad' : 'good', target: 'no_rca' },
      { label: 'Overdue', value: d.radar.counts.overdue, tone: d.radar.counts.overdue ? 'bad' : 'good', hint: 'deadlines passed', target: 'radar-overdue' },
      { label: 'Due today', value: d.radar.counts.today, tone: d.radar.counts.today ? 'warn' : 'good', target: 'radar-today' },
      { label: 'Unassigned', value: un.incidents + un.complaints, tone: un.incidents + un.complaints ? 'warn' : 'good', hint: `${un.incidents} incidents · ${un.complaints} complaints (last ${un.days} days)` },
    ];
    this.applyRadarFilter();
  }

  setRadarFilter(f: RadarFilter): void { this.radarFilter = f; this.applyRadarFilter(); }
  private applyRadarFilter(): void {
    const rows = this.data?.radar.rows ?? [];
    this.radarRows = this.radarFilter === 'all' ? rows : rows.filter((r) => r.bucket === this.radarFilter);
  }

  onTile(target?: string): void {
    if (!target) return;
    if (target.startsWith('radar-')) {
      this.setRadarFilter(target.slice(6) as RadarFilter);
      this.scrollTo('qt-radar');
    } else {
      this.scrollTo(`qt-sec-${target}`);
    }
  }

  private scrollTo(id: string): void {
    if (typeof document === 'undefined') return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  open(link?: TodayLink): void {
    if (!link) return;
    this.router.navigate([link.path], link.query ? { queryParams: link.query } : {});
  }

  // ── Formatting ───────────────────────────────────────────────────────
  ago(isoStr: string | null): string {
    if (!isoStr) return '';
    const mins = Math.round((Date.now() - new Date(isoStr).getTime()) / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const h = Math.round(mins / 60);
    if (h < 48) return `${h} h ago`;
    return `${Math.round(h / 24)} days ago`;
  }

  dueText(r: TodayRadarRow): string {
    const ms = new Date(r.dueAt).getTime() - Date.now();
    const h = Math.round(Math.abs(ms) / 3_600_000);
    const span = h < 48 ? `${h} h` : `${Math.round(h / 24)} days`;
    return ms < 0 ? `${span} overdue` : `in ${span}`;
  }

  when(isoStr: string | null): string {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  }

  ageTotal(a: { d0_7: number; d8_30: number; d30p: number }): number { return a.d0_7 + a.d8_30 + a.d30p; }

  trackKey(_: number, s: TodayBriefSection): string { return s.key; }
}
