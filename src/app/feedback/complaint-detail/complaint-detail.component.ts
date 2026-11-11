import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Complaint, ComplaintService, ComplaintStatus, COMPLAINT_TRANSITIONS } from '../../services/complaint.service';
import { SchedulingService, SchedulingStaff } from '../../services/scheduling.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { isComplaintHandler } from '../../quality/quality-access';
import { QualityUnitService, HospitalUnit, ComplaintCategory } from '../../services/quality-unit.service';

/**
 * Phase 9.25 / Phase 4 — Complaint detail + status workflow.
 * Route: /complaints/:id
 * Status / assignment / department edits are for complaint handlers; everyone
 * else who can read the complaint gets a read-only view.
 */
@Component({
  selector: 'app-complaint-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './complaint-detail.component.html',
  styleUrls: ['./complaint-detail.component.css'],
})
export class ComplaintDetailComponent implements OnInit, OnDestroy {
  complaint: Complaint | null = null;
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  readonly isHandler = isComplaintHandler();
  staff: SchedulingStaff[] = [];
  departments: string[] = [];
  units: HospitalUnit[] = [];

  draft = {
    status: 'open' as ComplaintStatus, assignedTo: '', assignedToId: null as number | null,
    resolutionNotes: '', department: '', unitId: null as number | null, category: null as string | null,
  };
  categories: ComplaintCategory[] = [];

  categoryLabel(key: string | null | undefined): string {
    if (!key) return 'Not set';
    return this.categories.find((t) => t.key === key)?.label ?? key;
  }

  private destroy$ = new Subject<void>();
  constructor(
    private route: ActivatedRoute, private router: Router, private svc: ComplaintService,
    private scheduling: SchedulingService, private doctorService: DoctorServiceService,
    private unitSvc: QualityUnitService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!id) { this.errorMessage = 'Missing id'; return; }
    this.load(id);
    this.unitSvc.complaintCategories().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.categories = r.data ?? []; },
      error: () => { /* labels fall back to the key */ },
    });
  }

  /** Pickers for whoever may assign / move it — loaded once after the first fetch. */
  private pickersLoaded = false;
  private loadPickers(): void {
    if (this.pickersLoaded || !this.canAssign) return;
    this.pickersLoaded = true;
    this.scheduling.listStaff().pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => { this.staff = rows ?? []; },
      error: () => { /* picker is best-effort; free-text name still works */ },
    });
    if (this.canChangeUnit) {
      this.doctorService.getDepartments().pipe(takeUntil(this.destroy$)).subscribe({
        next: (rows) => { this.departments = (rows ?? []).map((d) => d.name).filter(Boolean).sort(); },
        error: () => { /* best-effort */ },
      });
      this.unitSvc.list(true).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.units = r.data ?? []; },
        error: () => { /* best-effort */ },
      });
    }
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private load(id: string): void {
    this.loading = true;
    this.svc.get(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.hydrate(r.data); this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load complaint'; this.loading = false; },
    });
  }

  private hydrate(c: Complaint): void {
    this.complaint = c;
    this.draft = {
      status: c.status,
      assignedTo: c.assignedTo ?? '',
      assignedToId: c.assignedToId ?? null,
      resolutionNotes: c.resolutionNotes ?? '',
      department: c.department ?? '',
      unitId: c.unitId ?? null,
      category: c.category ?? null,
    };
    this.loadPickers();
  }

  // Server-computed: handlers do everything; the unit HOD works + assigns;
  // the assignee updates status + notes only.
  get canAct(): boolean { return !!this.complaint?.permissions?.canUpdateStatus; }
  get canAssign(): boolean { return !!this.complaint?.permissions?.canAssign; }
  get canChangeUnit(): boolean { return !!this.complaint?.permissions?.canChangeUnit; }

  /** Current status plus the moves the backend allows from it. */
  statusOptions(): ComplaintStatus[] {
    const cur = this.complaint?.status;
    if (!cur) return [];
    return [cur, ...(COMPLAINT_TRANSITIONS[cur] ?? [])];
  }

  /** Picker → keep the id and the display name in sync. */
  onAssigneeSelected(id: number | null): void {
    this.draft.assignedToId = id;
    const u = this.staff.find((s) => s.id === id);
    if (u) this.draft.assignedTo = u.username;
  }

  /** Picker options, keeping the saved value even if it isn't a Department row. */
  departmentOptions(): string[] {
    const cur = this.complaint?.department;
    return cur && !this.departments.includes(cur) ? [cur, ...this.departments] : this.departments;
  }

  needsNotes(): boolean {
    return this.draft.status === 'resolved' && this.complaint?.status !== 'resolved';
  }

  save(): void {
    if (!this.complaint || this.saving || !this.canAct) return;
    if (this.needsNotes() && !this.draft.resolutionNotes.trim()) {
      this.errorMessage = 'Resolution notes are required to resolve a complaint.';
      return;
    }
    this.errorMessage = '';
    this.saving = true;
    const id = this.complaint.id;
    const reopening = this.complaint.status === 'resolved' && this.draft.status !== 'resolved';
    this.svc.updateStatus(id, {
      status: this.draft.status,
      // Only send what this user may change (the backend rejects the rest).
      ...(this.canAssign && {
        assignedTo: this.draft.assignedTo.trim() || null,
        assignedToId: this.draft.assignedToId,
      }),
      // Only send a changed department / unit — a derived one may not be in the picker.
      ...(this.canChangeUnit && this.draft.department !== (this.complaint.department ?? '') && { department: this.draft.department || null }),
      ...(this.canChangeUnit && this.draft.unitId !== (this.complaint.unitId ?? null) && { unitId: this.draft.unitId }),
      ...(this.canAssign && this.draft.category !== (this.complaint.category ?? null) && { category: this.draft.category }),
      // Reopen clears the resolution server-side — don't resend the old notes.
      ...(!reopening && { resolutionNotes: this.draft.resolutionNotes.trim() || null }),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = `Saved — status ${this.draft.status}`;
        setTimeout(() => (this.successMessage = ''), 3000);
        // The PUT returns the bare row — refetch so links + raisedByName stay.
        this.load(id);
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to save'; },
    });
  }
  back(): void { this.router.navigate(['/complaints']); }
}
