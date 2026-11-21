import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { HeatCell, HeatColumn, HeatRow, QualityService, UnitsHeatmap } from '../../services/quality.service';

/**
 * Quality → Units: one row per hospital unit for a month. Each cell is
 * coloured against the whole hospital (≥25% worse = red), "few" when there
 * are too few cases to judge. Clicking a cell opens the matching list.
 */
@Component({
  selector: 'app-quality-units-heatmap',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quality-units-heatmap.component.html',
  styleUrls: ['./quality-units-heatmap.component.css'],
})
export class QualityUnitsHeatmapComponent implements OnInit, OnDestroy {
  data: UnitsHeatmap | null = null;
  loading = false;
  errorMessage = '';
  month = '';
  months: Array<{ key: string; label: string }> = [];
  monthCols: HeatColumn[] = [];
  nowCols: HeatColumn[] = [];

  private destroy$ = new Subject<void>();
  constructor(private svc: QualityService, private router: Router) {}

  ngOnInit(): void {
    const d = new Date();
    for (let i = 0; i < 13; i++) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
      this.months.push({ key, label: i === 0 ? `${m.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} (so far)` : m.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) });
    }
    this.month = this.months[0].key;
    this.load(false);
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(fresh: boolean): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.unitsHeatmap(this.month, fresh).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.data = r.data;
        this.monthCols = r.data.columns.filter((c) => c.scope === 'month');
        this.nowCols = r.data.columns.filter((c) => c.scope === 'now');
        this.loading = false;
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Could not load the unit heat-map'; this.loading = false; },
    });
  }

  show(c: HeatCell | undefined, col: HeatColumn): string {
    if (!c || c.value === null) return '—';
    return col.unit === '%' ? `${c.value}%` : col.unit === 'h' ? `${c.value} h` : `${c.value}`;
  }
  title(c: HeatCell | undefined, col: HeatColumn): string {
    if (!c) return col.help;
    const parts = [col.help];
    if (c.n !== undefined) parts.push(`based on ${c.n}`);
    if (c.note) parts.push(c.note);
    if (c.tone === 'few') parts.push('too few to judge');
    return parts.filter(Boolean).join(' · ');
  }

  /** Where a cell leads. Only unit rows (not "Whole hospital") link through. */
  openCell(row: HeatRow, col: HeatColumn): void {
    if (row.unitId === null) return;
    const unit = { unitId: String(row.unitId), unit: row.unit };
    switch (col.key) {
      case 'incidents': case 'rate': case 'serious': case 'triage': case 'open30':
        return void this.router.navigate(['/incidents'], { queryParams: { ...unit, ...(col.key === 'serious' ? { severity: 'sentinel' } : {}) } });
      case 'falls': return void this.router.navigate(['/incidents'], { queryParams: { ...unit, category: 'fall' } });
      case 'med': return void this.router.navigate(['/incidents'], { queryParams: { ...unit, category: 'medication' } });
      case 'complaints': case 'onTime': case 'overdue':
        return void this.router.navigate(['/complaints'], { queryParams: unit });
      case 'nps': return void this.router.navigate(['/feedback/analytics']);
      case 'audit': return void this.router.navigate(['/quality/audits']);
    }
  }
  trackRow(_: number, r: HeatRow): string { return `${r.unitId}-${r.unit}`; }
}
