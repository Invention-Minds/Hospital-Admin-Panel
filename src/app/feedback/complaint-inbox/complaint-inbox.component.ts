import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  Complaint, ComplaintChannel, ComplaintDuplicate, ComplaintService, ComplaintSeverity, ComplaintStats, ComplaintStatus,
} from '../../services/complaint.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { isComplaintHandler, isComplaintDepartmentViewer, isNursingSuperintendent } from '../../quality/quality-access';

/**
 * Phase 9.25 / Phase 4 — Complaint inbox.
 * Route: /complaints  (optional deep-link to the raise form:
 * ?raise=1&patientPrn=&patientName=&appointmentId=&admissionId=&emergencyId=)
 * Handlers see and act on everything; other staff see what they raised or are
 * assigned (+ their department, read-only). The server scopes list + stats.
 */
@Component({
  selector: 'app-complaint-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './complaint-inbox.component.html',
  styleUrls: ['./complaint-inbox.component.css'],
})
export class ComplaintInboxComponent implements OnInit, OnDestroy {
  rows: Complaint[] = [];
  stats: ComplaintStats | null = null;
  loading = false;
  errorMessage = '';
  showRaise = false;

  readonly isHandler = isComplaintHandler();
  readonly isDeptViewer = isComplaintDepartmentViewer();
  readonly isSuperintendent = isNursingSuperintendent();

  filters = { status: '', severity: '', source: '', department: '', from: '', to: '' };
  readonly pageSize = 50;
  skip = 0;
  total = 0;

  departments: string[] = [];

  draftCreate = this.blankDraft();
  // Encounter ids arrive via deep-link query params only.
  encounter: { appointmentId: number | null; admissionId: string | null; emergencyId: number | null } =
    { appointmentId: null, admissionId: null, emergencyId: null };
  saving = false;
  raiseError = '';
  duplicates: ComplaintDuplicate[] = [];

  // Phase 6h — bulk selection state for the grievance officer.
  selected = new Set<string>();
  bulkStatus: ComplaintStatus = 'acknowledged';
  bulkNotes = '';
  bulkSaving = false;
  bulkBanner = '';

  readonly STATUSES: ComplaintStatus[] = ['open', 'acknowledged', 'resolved', 'escalated'];
  readonly SEVERITIES: ComplaintSeverity[] = ['low', 'medium', 'high'];
  readonly SOURCES = ['survey', 'manual'];
  readonly CHANNELS: ComplaintChannel[] = ['sms', 'whatsapp', 'kiosk', 'phone', 'in-person'];

  private destroy$ = new Subject<void>();
  constructor(
    private svc: ComplaintService, private router: Router, private route: ActivatedRoute,
    private doctorService: DoctorServiceService,
  ) {}

  ngOnInit(): void {
    this.applyRaiseDeepLink();
    this.load();
    this.loadStats();
    this.doctorService.getDepartments().pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => { this.departments = (rows ?? []).map((d) => d.name).filter(Boolean).sort(); },
      error: () => { /* department pickers are best-effort */ },
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private blankDraft(): { patientName: string; patientPrn: string; channel: ComplaintChannel; severity: ComplaintSeverity; department: string; description: string } {
    return { patientName: '', patientPrn: '', channel: 'phone', severity: 'medium', department: '', description: '' };
  }

  private applyRaiseDeepLink(): void {
    const p = this.route.snapshot.queryParamMap;
    if (p.get('raise') !== '1') return;
    const num = (k: string): number | null => (/^\d+$/.test(p.get(k) ?? '') ? Number(p.get(k)) : null);
    this.draftCreate.patientPrn = p.get('patientPrn') ?? '';
    this.draftCreate.patientName = p.get('patientName') ?? '';
    this.encounter = { appointmentId: num('appointmentId'), admissionId: p.get('admissionId') || null, emergencyId: num('emergencyId') };
    this.showRaise = true;
  }

  hasEncounter(): boolean {
    return !!(this.encounter.appointmentId || this.encounter.admissionId || this.encounter.emergencyId);
  }

  /** Filter change → back to the first page. */
  search(): void { this.skip = 0; this.load(); }

  load(): void {
    this.loading = true; this.errorMessage = '';
    this.selected.clear();
    this.svc.list({
      ...this.filters,
      // Date inputs are local 'YYYY-MM-DD' — cover the whole of the 'to' day.
      from: this.filters.from ? new Date(`${this.filters.from}T00:00:00`).toISOString() : '',
      to: this.filters.to ? new Date(`${this.filters.to}T23:59:59.999`).toISOString() : '',
      take: this.pageSize, skip: this.skip,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data ?? []; this.total = r.total ?? this.rows.length; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load complaints'; this.loading = false; },
    });
  }
  loadStats(): void {
    this.svc.stats().pipe(takeUntil(this.destroy$)).subscribe({ next: (s) => (this.stats = s), error: () => { /* best-effort */ } });
  }

  prevPage(): void { if (this.skip === 0) return; this.skip = Math.max(0, this.skip - this.pageSize); this.load(); }
  nextPage(): void { if (this.skip + this.pageSize >= this.total) return; this.skip += this.pageSize; this.load(); }
  pageEnd(): number { return Math.min(this.skip + this.rows.length, this.total); }

  openDetail(c: Complaint): void { this.router.navigate(['/complaints', c.id]); }

  openRaise(): void { this.raiseError = ''; this.duplicates = []; this.showRaise = true; }
  closeRaise(): void {
    if (this.saving) return;
    this.showRaise = false; this.duplicates = []; this.raiseError = '';
  }

  raise(proceedDespiteDuplicate = false): void {
    if (!this.draftCreate.description.trim() || this.saving) return;
    this.saving = true;
    this.raiseError = '';
    this.svc.create({
      patientName: this.draftCreate.patientName.trim() || null,
      patientPrn: this.draftCreate.patientPrn.trim() || null,
      channel: this.draftCreate.channel,
      severity: this.draftCreate.severity,
      department: this.draftCreate.department || null,
      description: this.draftCreate.description.trim(),
      appointmentId: this.encounter.appointmentId,
      admissionId: this.encounter.admissionId,
      emergencyId: this.encounter.emergencyId,
      ...(proceedDespiteDuplicate && { proceedDespiteDuplicate: true }),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.showRaise = false; this.duplicates = [];
        this.draftCreate = this.blankDraft();
        this.encounter = { appointmentId: null, admissionId: null, emergencyId: null };
        this.skip = 0;
        this.load(); this.loadStats();
      },
      error: (e) => {
        this.saving = false;
        if (e?.status === 409 && Array.isArray(e?.error?.possibleDuplicates)) {
          this.duplicates = e.error.possibleDuplicates;
          return;
        }
        this.raiseError = e?.error?.message || 'Failed to raise complaint';
      },
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
    if (c.status === 'resolved') return '—';
    const due = new Date(c.slaDueAt).getTime();
    const diff = due - Date.now();
    const hrs = Math.round(Math.abs(diff) / 3_600_000);
    return diff < 0 ? `${hrs}h overdue` : `in ${hrs}h`;
  }

  // ── Phase 6h — bulk selection (handlers only) ──────────────────────
  toggle(id: string, e?: Event): void {
    e?.stopPropagation();
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
  }
  isSelected(id: string): boolean { return this.selected.has(id); }
  toggleAll(): void {
    if (this.allSelected()) this.selected.clear();
    else for (const r of this.rows) this.selected.add(r.id);
  }
  allSelected(): boolean { return this.rows.length > 0 && this.rows.every((r) => this.selected.has(r.id)); }

  applyBulk(): void {
    if (!this.isHandler || this.selected.size === 0) return;
    if (this.bulkStatus === 'resolved' && !this.bulkNotes.trim()) {
      this.errorMessage = 'Resolution notes are required to resolve complaints.';
      return;
    }
    const ids = Array.from(this.selected);
    this.bulkSaving = true;
    this.bulkBanner = '';
    this.svc.bulkUpdateStatus(ids, this.bulkStatus, this.bulkStatus === 'resolved' ? this.bulkNotes.trim() : null)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => {
          this.bulkSaving = false;
          this.bulkNotes = '';
          const reasons = (r.data.skippedRows ?? []).slice(0, 5).map((s) => `${s.code ?? s.id}: ${s.reason}`).join('; ');
          this.bulkBanner = `${r.data.updated} updated · ${r.data.skipped} skipped${reasons ? ` (${reasons}${r.data.skipped > 5 ? '; …' : ''})` : ''}.`;
          setTimeout(() => (this.bulkBanner = ''), 8000);
          this.load(); this.loadStats();
        },
        error: (e) => { this.bulkSaving = false; this.errorMessage = e?.error?.message || 'Bulk update failed'; },
      });
  }
}
