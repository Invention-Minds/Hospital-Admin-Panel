import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DieteticsService, ServedReport, localDateString } from '../../services/dietetics.service';

type Preset = 'today' | 'yesterday' | '7d' | 'month' | 'lastMonth' | 'custom';

/**
 * Diet reports — `/dietetics/reports`.
 * How many patients / trays were served over a date range, per day × meal,
 * per meal, diet and ward, with the reasons trays were not served.
 */
@Component({
  selector: 'app-diet-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './diet-reports.component.html',
  styleUrls: ['../dietetics-shared.css', './diet-reports.component.css'],
})
export class DietReportsComponent implements OnInit, OnDestroy {
  preset: Preset = '7d';
  from = '';
  to = '';
  wardId = '';
  wards: Array<{ id: string; wardName: string }> = [];
  report: ServedReport | null = null;
  loading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(private svc: DieteticsService) {}

  ngOnInit(): void {
    this.applyPreset('7d');
    this.svc.listCensusWards().pipe(takeUntil(this.destroy$)).subscribe({ next: (w) => { this.wards = w; }, error: () => {} });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  applyPreset(p: Preset): void {
    this.preset = p;
    if (p === 'custom') return;
    const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return localDateString(d); };
    const now = new Date();
    if (p === 'today') { this.from = this.to = day(0); }
    else if (p === 'yesterday') { this.from = this.to = day(-1); }
    else if (p === '7d') { this.from = day(-6); this.to = day(0); }
    else if (p === 'month') { this.from = localDateString(new Date(now.getFullYear(), now.getMonth(), 1)); this.to = day(0); }
    else if (p === 'lastMonth') {
      this.from = localDateString(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      this.to = localDateString(new Date(now.getFullYear(), now.getMonth(), 0));
    }
    this.load();
  }

  load(): void {
    if (!this.from || !this.to) return;
    this.loading = true;
    this.errorMessage = '';
    this.svc.getServedReport(this.from, this.to, this.wardId || undefined).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.report = r; this.loading = false; },
      error: (e) => { this.loading = false; this.report = null; this.errorMessage = e?.error?.error || 'Failed to load the report'; },
    });
  }

  get wardName(): string { return this.wards.find((w) => w.id === this.wardId)?.wardName ?? 'All wards'; }

  /** Share of planned trays that were served (excludes system "no tray"). */
  get servedPct(): number | null {
    const t = this.report?.totals;
    if (!t) return null;
    const base = t.traysServed + t.notServed + t.pending;
    return base ? Math.round((t.traysServed / base) * 100) : null;
  }

  maxTrays(rows: Array<{ trays: number }>): number { return Math.max(1, ...rows.map((r) => r.trays)); }
  slotTotal(slotId: string): number { return this.report?.bySlot.find((b) => b.id === slotId)?.trays ?? 0; }

  print(): void { window.print(); }

  /** Day × meal table plus the totals, as a CSV for Excel. */
  downloadCsv(): void {
    const r = this.report;
    if (!r) return;
    const q = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines: string[] = [];
    lines.push(['Diet served report', `${r.from} to ${r.to}`, this.wardName].map(q).join(','));
    lines.push('');
    lines.push(['Date', 'Patients served', 'Trays served', ...r.slots.map((s) => s.name), 'Not served'].map(q).join(','));
    for (const d of r.byDay) {
      lines.push([d.date, d.patients, d.trays, ...r.slots.map((s) => d.perSlot[s.id] ?? 0), d.notServed].map(q).join(','));
    }
    lines.push(['Total', r.totals.patientsServed, r.totals.traysServed, ...r.slots.map((s) => r.bySlot.find((b) => b.id === s.id)?.trays ?? 0), r.totals.notServed].map(q).join(','));
    lines.push('');
    lines.push(['Diet', 'Patients', 'Trays'].map(q).join(','));
    for (const d of r.byDiet) lines.push([`${d.code} · ${d.name}`, d.patients, d.trays].map(q).join(','));
    lines.push('');
    lines.push(['Ward', 'Patients', 'Trays'].map(q).join(','));
    for (const w of r.byWard) lines.push([w.name, w.patients, w.trays].map(q).join(','));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `diet-served-${r.from}-to-${r.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
