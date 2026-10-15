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

  draft = {
    status: 'open' as ComplaintStatus, assignedTo: '', assignedToId: null as number | null,
    resolutionNotes: '', department: '',
  };

  private destroy$ = new Subject<void>();
  constructor(
    private route: ActivatedRoute, private router: Router, private svc: ComplaintService,
    private scheduling: SchedulingService, private doctorService: DoctorServiceService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!id) { this.errorMessage = 'Missing id'; return; }
    this.load(id);
    if (this.isHandler) {
      this.scheduling.listStaff().pipe(takeUntil(this.destroy$)).subscribe({
        next: (rows) => { this.staff = rows ?? []; },
        error: () => { /* picker is best-effort; free-text name still works */ },
      });
      this.doctorService.getDepartments().pipe(takeUntil(this.destroy$)).subscribe({
        next: (rows) => { this.departments = (rows ?? []).map((d) => d.name).filter(Boolean).sort(); },
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
    };
  }

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
    if (!this.complaint || this.saving || !this.isHandler) return;
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
      assignedTo: this.draft.assignedTo.trim() || null,
      assignedToId: this.draft.assignedToId,
      // Only send a changed department — a derived one may not be in the picker.
      ...(this.draft.department !== (this.complaint.department ?? '') && { department: this.draft.department || null }),
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
