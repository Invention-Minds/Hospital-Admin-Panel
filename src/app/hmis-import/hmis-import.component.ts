import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  HmisImportService, HmisImportResult, HmisImportStatus, HmisImportItem, HmisImportAction,
} from '../services/hmis-import.service';

type Tab = 'attention' | 'ADMIT' | 'TRANSFER' | 'DISCHARGE' | 'all';

/** Imports older than this are flagged so the hourly routine is visible. */
const STALE_MINUTES = 70;

/**
 * HMIS import — `/ipd/hmis-import`.
 *
 * Until DocMinds is integrated with HMIS, the Nursing Superintendent (or
 * super admin) uploads the HMIS exports about once an hour: Current
 * Occupancy, Admissions and Discharge Summary. Choosing files runs a preview
 * straight away; Apply sends the same files again and makes the changes.
 */
@Component({
  selector: 'app-hmis-import',
  templateUrl: './hmis-import.component.html',
  styleUrls: ['../dietetics/dietetics-shared.css', './hmis-import.component.css'],
})
export class HmisImportComponent implements OnInit, OnDestroy {
  files: File[] = [];
  dragging = false;
  busy: 'preview' | 'apply' | null = null;
  errorMessage = '';

  preview: HmisImportResult | null = null;
  applied: HmisImportResult | null = null;
  status: HmisImportStatus | null = null;
  statusLoaded = false;
  tab: Tab = 'attention';
  now = Date.now();

  readonly kindLabel: Record<string, string> = {
    OCCUPANCY: 'Current occupancy', ADMISSIONS: 'Admissions', DISCHARGES: 'Discharge summary', MOVEMENT: 'Patient movement',
  };
  readonly actionLabel: Record<HmisImportAction, string> = {
    ADMIT: 'Admit', TRANSFER: 'Bed change', DISCHARGE: 'Discharge', UNCHANGED: 'No change', REVIEW: 'Check', SKIP: 'Skipped',
  };
  readonly actionPill: Record<HmisImportAction, string> = {
    ADMIT: 'dx-pill-new', TRANSFER: 'dx-pill-info', DISCHARGE: 'dx-pill-ok', UNCHANGED: '', REVIEW: 'dx-pill-bad', SKIP: '',
  };
  readonly howLabel: Record<string, string> = {
    remembered: 'Matched before', 'same-name': 'Same ward', similar: 'Same ward, other spelling', new: 'New ward',
  };

  private destroy$ = new Subject<void>();

  constructor(private svc: HmisImportService) {}

  ngOnInit(): void {
    this.loadStatus();
    interval(60_000).pipe(takeUntil(this.destroy$)).subscribe(() => { this.now = Date.now(); });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── last import banner ───────────────────────────────────────────────

  get minutesSince(): number | null {
    return this.status ? Math.max(0, Math.round((this.now - new Date(this.status.at).getTime()) / 60_000)) : null;
  }

  get statusTone(): 'good' | 'warn' | 'bad' {
    const m = this.minutesSince;
    if (m === null) return 'warn';
    return m > STALE_MINUTES ? 'bad' : 'good';
  }

  get sinceText(): string {
    const m = this.minutesSince;
    if (m === null) return '';
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h} h ${m % 60} min ago` : `${Math.floor(h / 24)} days ago`;
  }

  // ── files ────────────────────────────────────────────────────────────

  onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    this.setFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging = true;
  }

  removeFile(f: File): void {
    this.setFiles(this.files.filter((x) => x !== f));
  }

  clear(): void {
    this.files = [];
    this.preview = null;
    this.applied = null;
    this.errorMessage = '';
  }

  private setFiles(list: File[]): void {
    // Same name twice = the newer pick replaces the older one.
    const byName = new Map(this.files.map((f) => [f.name, f]));
    for (const f of list) byName.set(f.name, f);
    this.files = [...byName.values()].slice(0, 6);
    this.applied = null;
    this.preview = null;
    this.errorMessage = '';
    if (this.files.length) this.runPreview();
  }

  fileKind(f: File): string {
    const hit = this.preview?.files.find((x) => x.name === f.name);
    return hit ? `${this.kindLabel[hit.kind] ?? hit.kind} · ${hit.rows} rows` : '';
  }

  // ── preview / apply ──────────────────────────────────────────────────

  runPreview(): void {
    this.busy = 'preview';
    this.svc.preview(this.files).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.preview = r;
        this.busy = null;
        this.tab = r.summary.REVIEW > 0 ? 'attention' : r.summary.ADMIT ? 'ADMIT' : 'all';
      },
      error: (e) => { this.busy = null; this.errorMessage = e?.error?.message || 'Could not read the files'; },
    });
  }

  get changeCount(): number {
    const s = this.preview?.summary;
    return s ? s.ADMIT + s.TRANSFER + s.DISCHARGE : 0;
  }

  apply(): void {
    if (!this.preview || !this.changeCount) return;
    this.busy = 'apply';
    this.svc.apply(this.files).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.applied = r;
        this.preview = r;
        this.busy = null;
        this.tab = r.summary.failed || r.summary.REVIEW ? 'attention' : 'all';
        this.loadStatus();
      },
      error: (e) => { this.busy = null; this.errorMessage = e?.error?.message || 'Import failed'; },
    });
  }

  // ── table ────────────────────────────────────────────────────────────

  get rows(): HmisImportItem[] {
    const items = this.preview?.items ?? [];
    switch (this.tab) {
      case 'attention': return items.filter((i) => i.action === 'REVIEW' || !!i.error);
      case 'all': return items;
      default: return items.filter((i) => i.action === this.tab);
    }
  }

  tabCount(t: Tab): number {
    const items = this.preview?.items ?? [];
    if (t === 'attention') return items.filter((i) => i.action === 'REVIEW' || !!i.error).length;
    if (t === 'all') return items.length;
    return items.filter((i) => i.action === t).length;
  }

  private loadStatus(): void {
    this.svc.status().pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => { this.status = s; this.statusLoaded = true; this.now = Date.now(); },
      error: () => { this.statusLoaded = true; },
    });
  }
}
