import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { QualityService, QualityIndicatorRca, RcaUpdateBody, RcaStatus } from '../../services/quality.service';

/**
 * Phase 9.26 / Phase 3 — RCA detail + editor.
 * Route: /quality/rcas/:id
 *
 * Shows the originating indicator + record context. Editor mirrors the
 * incident CAPA shape (5-whys, root cause, corrective + preventive,
 * owner, due date, effectiveness review).
 */
@Component({
  selector: 'app-quality-rca-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quality-rca-detail.component.html',
  styleUrls: ['./quality-rca-detail.component.css'],
})
export class QualityRcaDetailComponent implements OnInit, OnDestroy {
  rca: QualityIndicatorRca | null = null;
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  draft: RcaUpdateBody = {
    immediateActions: '', why1: '', why2: '', why3: '', why4: '', why5: '',
    rootCause: '', correctiveActions: '', preventiveActions: '',
    owner: '', dueDate: '', completedAt: '',
    effectivenessReview: '', effectivenessReviewAt: '',
    status: 'open',
  };

  readonly STATUSES: RcaStatus[] = ['open', 'in_progress', 'closed'];

  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private router: Router, private svc: QualityService) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    if (!id) { this.errorMessage = 'Missing RCA id'; return; }
    this.load(id);
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private load(id: number): void {
    this.loading = true;
    this.svc.getRca(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.rca = r.data;
        this.hydrate(r.data);
        this.loading = false;
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load RCA'; this.loading = false; },
    });
  }

  private hydrate(r: QualityIndicatorRca): void {
    this.draft = {
      immediateActions: r.immediateActions ?? '',
      why1: r.why1 ?? '', why2: r.why2 ?? '', why3: r.why3 ?? '',
      why4: r.why4 ?? '', why5: r.why5 ?? '',
      rootCause: r.rootCause ?? '',
      correctiveActions: r.correctiveActions ?? '',
      preventiveActions: r.preventiveActions ?? '',
      owner: r.owner ?? '',
      dueDate: r.dueDate ? r.dueDate.substring(0, 10) : '',
      completedAt: r.completedAt ? r.completedAt.substring(0, 10) : '',
      effectivenessReview: r.effectivenessReview ?? '',
      effectivenessReviewAt: r.effectivenessReviewAt ? r.effectivenessReviewAt.substring(0, 10) : '',
      status: r.status,
    };
  }

  save(): void {
    if (!this.rca) return;
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.svc.updateRca(this.rca.id, this.draft).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.rca = r.data;
        this.hydrate(r.data);
        this.saving = false;
        this.successMessage = 'Saved';
        setTimeout(() => (this.successMessage = ''), 2500);
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to save'; this.saving = false; },
    });
  }

  goBack(): void { this.router.navigate(['/quality/rcas']); }

  recordStatusClass(s: string): string {
    switch (s) {
      case 'green':    return 'q-good';
      case 'amber':    return 'q-warn';
      case 'red':      return 'q-bad';
      case 'critical': return 'q-bad q-critical';
      default:         return '';
    }
  }
}
