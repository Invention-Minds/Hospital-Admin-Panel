import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  QualityService, QualityIndicator, QualityTatEvent, TatEventCreateBody,
} from '../../services/quality.service';
import { AlertService } from '../../services/alert.service';

/**
 * Phase 9.26 / Phase 5e — Generic TAT event capture.
 * Route: /quality/tat-events
 *
 * One form to record (start, end) timestamps for any of the 15 TAT
 * indicators (PSQ-005..015, OPS-002/005/006/007/008/010). Auto-source
 * sums durationMinutes for avg-style indicators and counts withinTarget
 * for compliance-% indicators. Targets are server-side (TAT_TARGET_MINUTES).
 */
@Component({
  selector: 'app-quality-tat-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quality-tat-events.component.html',
  styleUrls: ['./quality-tat-events.component.css'],
})
export class QualityTatEventsComponent implements OnInit, OnDestroy {
  indicators: QualityIndicator[] = [];
  rows: QualityTatEvent[] = [];
  targets: Record<string, number> = {};

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  // Mirror of the backend Phase 5e set; used to filter the dropdown.
  readonly TAT_BACKED: string[] = [
    'PSQ-005', 'PSQ-006', 'PSQ-007', 'PSQ-008', 'PSQ-009',
    'PSQ-011', 'PSQ-012', 'PSQ-013', 'PSQ-015',
    'OPS-002', 'OPS-005', 'OPS-006', 'OPS-007', 'OPS-008', 'OPS-010',
  ];

  // Chapter chip filter to narrow the dropdown.
  filterChapter = '';
  readonly CHAPTERS: string[] = ['PSQ', 'OPS'];

  draft: TatEventCreateBody = {
    qiCode: '', startedAt: '', endedAt: '', location: '', notes: '',
  };

  private destroy$ = new Subject<void>();

  constructor(private svc: QualityService, private router: Router, private alertSvc: AlertService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    const { start, end } = this.monthBounds();
    forkJoin({
      indicators: this.svc.listIndicators({ active: true }),
      events: this.svc.listTatEvents({ from: start, to: end }),
      targets: this.svc.getTatTargets(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ indicators, events, targets }) => {
        this.indicators = indicators.data.filter((i) => this.TAT_BACKED.includes(i.qiCode));
        this.rows = events.data;
        this.targets = targets.data;
        this.loading = false;
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load'; this.loading = false; },
    });
  }

  get filteredIndicators(): QualityIndicator[] {
    if (!this.filterChapter) return this.indicators;
    return this.indicators.filter((i) => i.chapter === this.filterChapter);
  }

  selectedIndicator(): QualityIndicator | null {
    return this.indicators.find((i) => i.qiCode === this.draft.qiCode) ?? null;
  }

  targetFor(qiCode: string): number | null {
    return this.targets[qiCode] ?? null;
  }

  selectChapter(ch: string): void {
    this.filterChapter = this.filterChapter === ch ? '' : ch;
    const cur = this.selectedIndicator();
    if (this.filterChapter && cur && cur.chapter !== this.filterChapter) this.draft.qiCode = '';
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.draft.qiCode) { this.errorMessage = 'Pick an indicator'; return; }
    if (!this.draft.startedAt || !this.draft.endedAt) {
      this.errorMessage = 'Start and end timestamps are required'; return;
    }
    if (new Date(this.draft.endedAt) < new Date(this.draft.startedAt)) {
      this.errorMessage = 'End must be after start'; return;
    }
    this.saving = true;
    this.svc.createTatEvent({
      qiCode: this.draft.qiCode,
      startedAt: this.draft.startedAt,
      endedAt: this.draft.endedAt,
      location: this.draft.location || undefined,
      notes: this.draft.notes || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.saving = false;
        const tgt = r.targetMinutes;
        this.successMessage = `Recorded — ${r.data.durationMinutes} min` +
          (tgt !== null ? ` (target ${tgt} · ${r.data.withinTarget ? 'within ✓' : 'over ⚠'})` : '');
        setTimeout(() => (this.successMessage = ''), 4000);
        this.draft = {
          qiCode: this.draft.qiCode,        // keep indicator selected
          startedAt: '', endedAt: '',
          location: this.draft.location,    // keep location
          notes: '',
        };
        this.load();
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to record'; this.saving = false; },
    });
  }

  async remove(row: QualityTatEvent): Promise<void> {
    if (!await this.alertSvc.confirm(`Delete this ${row.qiCode} event?`, { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.svc.deleteTatEvent(row.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: (e) => (this.errorMessage = e?.error?.message || 'Failed to delete'),
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  private monthBounds(): { start: string; end: string } {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    return { start, end };
  }

  goBack(): void { this.router.navigate(['/quality/indicators']); }
}
