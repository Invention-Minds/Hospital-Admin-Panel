import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Incident, IncidentService, IncidentStats } from '../../services/incident.service';
import { IncidentRaiseComponent } from '../incident-raise/incident-raise.component';

/**
 * Phase 9.24 / Phase 1 — Incident Inbox.
 * Route: /incidents
 * Lists all incidents with filters by status, severity, category, source.
 */
@Component({
  selector: 'app-incident-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, IncidentRaiseComponent],
  templateUrl: './incident-inbox.component.html',
  styleUrls: ['./incident-inbox.component.css'],
})
export class IncidentInboxComponent implements OnInit, OnDestroy {
  rows: Incident[] = [];
  stats: IncidentStats | null = null;
  loading = false;
  errorMessage = '';
  showRaise = false;

  filters = { status: '', severity: '', category: '', source: '', nabhClause: '', qiCode: '' };
  // Phase 6g — "Mine only" toggle. Sent as a separate query param so the
  // user can stack it on top of the other filters.
  mineOnly = false;

  readonly STATUSES = ['open', 'triaged', 'investigated', 'capa_in_progress', 'closed', 'cancelled'];
  readonly SEVERITIES = ['near_miss', 'minor', 'moderate', 'major', 'sentinel'];
  readonly CATEGORIES = ['clinical', 'medication', 'documentation', 'fall', 'infection', 'equipment', 'behavioural', 'security', 'other'];

  private destroy$ = new Subject<void>();

  constructor(private svc: IncidentService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Phase 6c — accept ?nabhClause=… / ?qiCode=… deep-links from the
    // quality dashboard's NABH scorecard cells.
    const params = this.route.snapshot.queryParamMap;
    const nabhClause = params.get('nabhClause');
    const qiCode = params.get('qiCode');
    if (nabhClause) this.filters.nabhClause = nabhClause;
    if (qiCode) this.filters.qiCode = qiCode;
    this.load();
    this.loadStats();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true; this.errorMessage = '';
    this.svc.list({ ...this.filters, ...(this.mineOnly ? { mine: true } : {}) }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data ?? []; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load incidents'; this.loading = false; },
    });
  }
  toggleMine(): void { this.mineOnly = !this.mineOnly; this.load(); }
  loadStats(): void {
    this.svc.stats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => { this.stats = s; },
      error: () => { /* tiles are best-effort */ },
    });
  }

  clearFilters(): void {
    this.filters = { status: '', severity: '', category: '', source: '', nabhClause: '', qiCode: '' };
    this.mineOnly = false;
    // Strip the deep-link query params so a reload doesn't bring them back.
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    this.load();
  }

  openDetail(row: Incident): void { this.router.navigate(['/incidents', row.id]); }

  onRaised(): void {
    this.showRaise = false;
    this.load();
    this.loadStats();
  }

  /** Pretty label for the status pill. */
  statusLabel(s: string): string {
    return s.replace(/_/g, ' ');
  }
}
