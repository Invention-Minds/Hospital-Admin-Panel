import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Complaint, ComplaintService, ComplaintStats } from '../../services/complaint.service';

/**
 * Phase 9.25 / Phase 4 — Complaint inbox.
 * Route: /complaints
 * Lists open / acknowledged / resolved / escalated complaints with SLA breach
 * count, severity & status pills, click-through to detail.
 */
@Component({
  selector: 'app-complaint-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './complaint-inbox.component.html',
  styleUrls: ['./complaint-inbox.component.css'],
})
export class ComplaintInboxComponent implements OnInit, OnDestroy {
  rows: Complaint[] = [];
  stats: ComplaintStats | null = null;
  loading = false;
  errorMessage = '';
  showRaise = false;

  filters = { status: '', severity: '', source: '' };

  draftCreate: { patientName: string; patientPrn: string; channel: 'sms' | 'whatsapp' | 'kiosk' | 'phone' | 'in-person'; severity: 'low' | 'medium' | 'high'; description: string } = {
    patientName: '', patientPrn: '', channel: 'phone', severity: 'medium', description: '',
  };
  saving = false;

  // Phase 6h — bulk selection state for the grievance officer.
  selected = new Set<string>();
  bulkStatus: 'open' | 'acknowledged' | 'resolved' | 'escalated' = 'acknowledged';
  bulkSaving = false;
  bulkBanner = '';

  readonly STATUSES = ['open', 'acknowledged', 'resolved', 'escalated'];
  readonly SEVERITIES = ['low', 'medium', 'high'];
  readonly SOURCES = ['survey', 'manual'];
  readonly CHANNELS = ['sms', 'whatsapp', 'kiosk', 'phone', 'in-person'];

  private destroy$ = new Subject<void>();
  constructor(private svc: ComplaintService, private router: Router) {}

  ngOnInit(): void { this.load(); this.loadStats(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true; this.errorMessage = '';
    this.svc.list(this.filters as Record<string, string>).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data ?? []; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load complaints'; this.loading = false; },
    });
  }
  loadStats(): void {
    this.svc.stats().pipe(takeUntil(this.destroy$)).subscribe({ next: (s) => (this.stats = s), error: () => { /* best-effort */ } });
  }

  openDetail(c: Complaint): void { this.router.navigate(['/complaints', c.id]); }

  raise(): void {
    if (!this.draftCreate.description.trim()) return;
    this.saving = true;
    this.svc.create({
      patientName: this.draftCreate.patientName.trim() || null,
      patientPrn: this.draftCreate.patientPrn.trim() || null,
      channel: this.draftCreate.channel,
      severity: this.draftCreate.severity,
      description: this.draftCreate.description.trim(),
    }).subscribe({
      next: () => {
        this.saving = false; this.showRaise = false;
        this.draftCreate = { patientName: '', patientPrn: '', channel: 'phone', severity: 'medium', description: '' };
        this.load(); this.loadStats();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to raise complaint'; },
    });
  }

  /** Returns 'breach' if SLA passed without resolution. */
  slaState(c: Complaint): 'ok' | 'soon' | 'breach' | null {
    if (!c.slaDueAt) return null;
    if (c.status === 'resolved') return null;
    const due = new Date(c.slaDueAt).getTime();
    const now = Date.now();
    if (due < now) return 'breach';
    if (due - now < 12 * 60 * 60 * 1000) return 'soon';
    return 'ok';
  }
  slaText(c: Complaint): string {
    if (!c.slaDueAt) return '—';
    const due = new Date(c.slaDueAt).getTime();
    const diff = due - Date.now();
    const hrs = Math.round(Math.abs(diff) / 3_600_000);
    return diff < 0 ? `${hrs}h overdue` : `in ${hrs}h`;
  }

  // ── Phase 6h — bulk selection ──────────────────────────────────────
  toggle(id: string, e?: Event): void {
    e?.stopPropagation();
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
  }
  isSelected(id: string): boolean { return this.selected.has(id); }
  toggleAll(): void {
    if (this.selected.size === this.rows.length) this.selected.clear();
    else for (const r of this.rows) this.selected.add(r.id);
  }
  allSelected(): boolean { return this.rows.length > 0 && this.selected.size === this.rows.length; }

  applyBulk(): void {
    if (this.selected.size === 0) return;
    const ids = Array.from(this.selected);
    this.bulkSaving = true;
    this.bulkBanner = '';
    this.svc.bulkUpdateStatus(ids, this.bulkStatus).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.bulkSaving = false;
        this.selected.clear();
        this.bulkBanner = `${r.data.updated} updated · ${r.data.skipped} skipped (already at status).`;
        setTimeout(() => (this.bulkBanner = ''), 4000);
        this.load(); this.loadStats();
      },
      error: (e) => { this.bulkSaving = false; this.errorMessage = e?.error?.message || 'Bulk update failed'; },
    });
  }
}
