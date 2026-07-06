import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Complaint, ComplaintService, ComplaintStatus } from '../../services/complaint.service';

/**
 * Phase 9.25 / Phase 4 — Complaint detail + status workflow.
 * Route: /complaints/:id
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
  errorMessage = '';
  successMessage = '';

  draft = { status: 'open' as ComplaintStatus, assignedTo: '', resolutionNotes: '' };
  readonly STATUSES: ComplaintStatus[] = ['open', 'acknowledged', 'resolved', 'escalated'];

  private destroy$ = new Subject<void>();
  constructor(private route: ActivatedRoute, private router: Router, private svc: ComplaintService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!id) { this.errorMessage = 'Missing id'; return; }
    this.loading = true;
    this.svc.get(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.complaint = r.data;
        this.draft.status = r.data.status;
        this.draft.assignedTo = r.data.assignedTo ?? '';
        this.draft.resolutionNotes = r.data.resolutionNotes ?? '';
        this.loading = false;
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load complaint'; this.loading = false; },
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  save(): void {
    if (!this.complaint) return;
    this.svc.updateStatus(this.complaint.id, {
      status: this.draft.status,
      assignedTo: this.draft.assignedTo || null,
      resolutionNotes: this.draft.resolutionNotes || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.complaint = r.data;
        this.successMessage = `Status → ${r.data.status}`;
        setTimeout(() => (this.successMessage = ''), 3000);
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to save'; },
    });
  }
  back(): void { this.router.navigate(['/complaints']); }
}
