import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  QualityAuditService, AuditChecklist, AuditRunSummary, AuditSummary,
} from '../../services/quality-audit.service';
import { QualityUnitService, HospitalUnit } from '../../services/quality-unit.service';
import { SchedulingService, SchedulingStaff } from '../../services/scheduling.service';
import { isQualityEditor, isQualityViewer } from '../quality-access';

type Tab = 'dashboard' | 'audits' | 'checklists';

/**
 * Quality → Audits. Dashboard (compliance / NC by checklist and unit), the
 * audit list with scheduling, and the checklist library (Quality Manager edits).
 * Route: /quality/audits — any signed-in user; the API scopes what they see
 * (auditors see their audits, HODs their units', Quality everything).
 */
@Component({
  selector: 'app-quality-audits',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './quality-audits.component.html',
  styleUrls: ['./quality-audits.component.css'],
})
export class QualityAuditsComponent implements OnInit, OnDestroy {
  readonly isEditor = isQualityEditor();
  readonly isViewer = isQualityViewer() || this.isEditor;
  tab: Tab = this.isViewer ? 'dashboard' : 'audits';

  // Dashboard
  from = '';
  to = '';
  summaryUnit: number | '' = '';
  summary: AuditSummary | null = null;

  // Audits
  runs: AuditRunSummary[] = [];
  statusFilter = 'open';
  mineOnly = !this.isViewer;
  scheduleOpen = false;
  draft = { checklistId: null as number | null, unitId: null as number | null, location: '', dueDate: '', auditorId: null as number | null, notes: '' };
  scheduling = false;

  // Checklists
  checklists: AuditChecklist[] = [];
  importing = false;

  units: HospitalUnit[] = [];
  staff: SchedulingStaff[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  private destroy$ = new Subject<void>();

  readonly GROUP_LABELS: Record<string, string> = {
    clinical: 'Clinical / infection control / patient safety', quality: 'Quality & records', facility: 'Facility & support services',
  };
  readonly STATUS_LABELS: Record<string, string> = {
    scheduled: 'Scheduled', in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled',
  };

  constructor(
    private svc: QualityAuditService, private unitSvc: QualityUnitService, private scheduling$: SchedulingService,
    private router: Router,
  ) {
    const p = (n: number) => String(n).padStart(2, '0');
    const ymd = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const today = new Date();
    this.to = ymd(today);
    this.from = ymd(new Date(today.getTime() - 89 * 86_400_000));
  }

  ngOnInit(): void {
    this.unitSvc.list(true).pipe(takeUntil(this.destroy$)).subscribe({ next: (r) => (this.units = r.data ?? []), error: () => {} });
    this.loadChecklists();
    this.loadRuns();
    if (this.isViewer) this.loadSummary();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private flash(msg: string): void { this.successMessage = msg; setTimeout(() => (this.successMessage = ''), 3500); }
  private err(e: { error?: { message?: string } }, fallback: string): void { this.errorMessage = e?.error?.message || fallback; }

  setTab(t: Tab): void { this.tab = t; this.errorMessage = ''; }

  loadSummary(): void {
    this.svc.summary({ from: this.from, to: this.to, unitId: this.summaryUnit }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => (this.summary = r), error: (e) => this.err(e, 'Failed to load the audit dashboard'),
    });
  }

  loadRuns(): void {
    this.loading = true;
    const status = this.statusFilter === 'open' ? undefined : this.statusFilter;
    this.svc.runs({ status, mine: this.mineOnly }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        const rows = r.data ?? [];
        this.runs = this.statusFilter === 'open' ? rows.filter((x) => x.status === 'scheduled' || x.status === 'in_progress') : rows;
        this.loading = false;
      },
      error: (e) => { this.loading = false; this.err(e, 'Failed to load audits'); },
    });
  }

  loadChecklists(): void {
    this.svc.checklists().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => (this.checklists = r.data ?? []), error: (e) => this.err(e, 'Failed to load checklists'),
    });
  }

  get activeChecklists(): AuditChecklist[] { return this.checklists.filter((c) => c.isActive); }
  checklistsIn(group: string): AuditChecklist[] { return this.checklists.filter((c) => c.group === group); }

  openSchedule(checklistId?: number): void {
    this.scheduleOpen = true;
    this.tab = 'audits';
    if (checklistId) this.draft.checklistId = checklistId;
    if (!this.staff.length) {
      this.scheduling$.listStaff().pipe(takeUntil(this.destroy$)).subscribe({ next: (r) => (this.staff = r ?? []), error: () => {} });
    }
  }

  schedule(): void {
    const d = this.draft;
    if (!d.checklistId) { this.errorMessage = 'Choose a checklist.'; return; }
    this.scheduling = true;
    this.errorMessage = '';
    this.svc.schedule({
      checklistId: d.checklistId, unitId: d.unitId, location: d.location.trim() || null,
      dueDate: d.dueDate ? new Date(`${d.dueDate}T18:00:00`).toISOString() : null,
      auditorId: d.auditorId, notes: d.notes.trim() || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.scheduling = false;
        this.scheduleOpen = false;
        this.draft = { checklistId: null, unitId: null, location: '', dueDate: '', auditorId: null, notes: '' };
        this.flash(`Audit ${r.data.code} scheduled.`);
        this.loadRuns();
      },
      error: (e) => { this.scheduling = false; this.err(e, 'Failed to schedule the audit'); },
    });
  }

  importStarter(): void {
    this.importing = true;
    this.svc.importStarter().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.importing = false;
        this.flash(r.data.created ? `${r.data.created} starter checklist(s) added — review and edit them before use.` : 'All starter checklists are already in your library.');
        this.loadChecklists();
      },
      error: (e) => { this.importing = false; this.err(e, 'Import failed'); },
    });
  }

  open(run: AuditRunSummary): void { this.router.navigate(['/quality/audits/runs', run.id]); }
  pctClass(p: number | null | undefined): string { return p == null ? '' : p >= 90 ? 'qa-good' : p >= 75 ? 'qa-mid' : 'qa-bad'; }
}
