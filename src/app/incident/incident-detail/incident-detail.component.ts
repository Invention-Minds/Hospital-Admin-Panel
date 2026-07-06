import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CapaPayload, Incident, IncidentService, IncidentStatus, IncidentSeverity } from '../../services/incident.service';

/**
 * Phase 9.24 / Phase 1 — Incident detail + status transitions.
 * Route: /incidents/:id
 * CAPA editor is added in Phase 3.
 */
@Component({
  selector: 'app-incident-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './incident-detail.component.html',
  styleUrls: ['./incident-detail.component.css'],
})
export class IncidentDetailComponent implements OnInit, OnDestroy {
  incident: Incident | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Status-edit draft.
  draft = { status: 'open' as IncidentStatus, severityFinal: '', assignedTo: '', closureNotes: '' };

  // Phase 3 — CAPA editor draft (root cause + actions).
  capaDraft: CapaPayload = {
    immediateActions: '', why1: '', why2: '', why3: '', why4: '', why5: '',
    rootCause: '', correctiveActions: '', preventiveActions: '',
    owner: '', dueDate: '', completedAt: '', effectivenessReview: '', effectivenessReviewAt: '',
  };
  capaSaving = false;
  capaSavedAt: Date | null = null;

  // Phase 6f — evidence upload state.
  pendingFile: File | null = null;
  evidenceLabel = '';
  evidenceUploading = false;
  evidenceError = '';

  readonly STATUSES: IncidentStatus[] = ['open', 'triaged', 'investigated', 'capa_in_progress', 'closed', 'cancelled'];
  readonly SEVERITIES: IncidentSeverity[] = ['near_miss', 'minor', 'moderate', 'major', 'sentinel'];

  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private router: Router, private svc: IncidentService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!id) { this.errorMessage = 'Missing incident id'; return; }
    this.load(id);
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private load(id: string): void {
    this.loading = true;
    this.svc.get(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.incident = r.data;
        this.draft.status = r.data.status;
        this.draft.severityFinal = r.data.severityFinal ?? '';
        this.draft.assignedTo = r.data.assignedTo ?? '';
        this.draft.closureNotes = r.data.closureNotes ?? '';
        // Hydrate the CAPA draft from the saved row (if any).
        const c = r.data.capa;
        if (c) {
          this.capaDraft = {
            immediateActions: c.immediateActions ?? '',
            why1: c.why1 ?? '', why2: c.why2 ?? '', why3: c.why3 ?? '', why4: c.why4 ?? '', why5: c.why5 ?? '',
            rootCause: c.rootCause ?? '',
            correctiveActions: c.correctiveActions ?? '',
            preventiveActions: c.preventiveActions ?? '',
            owner: c.owner ?? '',
            dueDate: c.dueDate ? c.dueDate.substring(0, 10) : '',
            completedAt: c.completedAt ? c.completedAt.substring(0, 10) : '',
            effectivenessReview: c.effectivenessReview ?? '',
            effectivenessReviewAt: c.effectivenessReviewAt ? c.effectivenessReviewAt.substring(0, 10) : '',
          };
        }
        this.loading = false;
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load incident'; this.loading = false; },
    });
  }

  saveStatus(): void {
    if (!this.incident) return;
    this.errorMessage = '';
    this.svc.updateStatus(this.incident.id, {
      status: this.draft.status,
      severityFinal: this.draft.severityFinal || null,
      assignedTo: this.draft.assignedTo || null,
      closureNotes: this.draft.closureNotes || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.incident = r.data;
        this.successMessage = `Status updated → ${r.data.status}`;
        setTimeout(() => (this.successMessage = ''), 3000);
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to update status'; },
    });
  }

  back(): void { this.router.navigate(['/incidents']); }

  statusLabel(s: string): string { return s.replace(/_/g, ' '); }

  /** Derive OPD/IPD/ER from whichever encounter FK is populated. Empty when
   * none are — the chip is then hidden. We also peek at the description for
   * a bracketed "[OPD]" / "[IPD]" tag in case the FKs weren't snapshotted
   * (older auto-rule incidents put the source only in the title text). */
  encounterType(inc: Incident): string {
    if (inc.admissionId) return 'IPD';
    if (inc.emergencyId) return 'ER';
    if (inc.appointmentId) return 'OPD';
    const m = (inc.title || '').match(/\[(OPD|IPD|ER)\]/i);
    return m ? m[1].toUpperCase() : '';
  }

  /** Phase 6 / Option A — true when any cross-module link is present. */
  hasLinks(): boolean {
    const i = this.incident;
    if (!i) return false;
    return !!(i.feedbackSurvey || i.complaint || (i.relatedIncidents && i.relatedIncidents.length > 0));
  }

  /** Phase 3 — Save the CAPA chain (root cause + actions). */
  saveCapa(): void {
    if (!this.incident || this.capaSaving) return;
    this.capaSaving = true;
    this.errorMessage = '';
    const payload: CapaPayload = {
      ...this.capaDraft,
      // Send empty strings as null so DB doesn't keep dirty empty rows.
      immediateActions: this.capaDraft.immediateActions || null,
      why1: this.capaDraft.why1 || null, why2: this.capaDraft.why2 || null,
      why3: this.capaDraft.why3 || null, why4: this.capaDraft.why4 || null, why5: this.capaDraft.why5 || null,
      rootCause: this.capaDraft.rootCause || null,
      correctiveActions: this.capaDraft.correctiveActions || null,
      preventiveActions: this.capaDraft.preventiveActions || null,
      owner: this.capaDraft.owner || null,
      effectivenessReview: this.capaDraft.effectivenessReview || null,
      // Date inputs are 'YYYY-MM-DD' — promote to ISO at the boundary.
      dueDate: this.capaDraft.dueDate ? new Date(this.capaDraft.dueDate).toISOString() : null,
      completedAt: this.capaDraft.completedAt ? new Date(this.capaDraft.completedAt).toISOString() : null,
      effectivenessReviewAt: this.capaDraft.effectivenessReviewAt ? new Date(this.capaDraft.effectivenessReviewAt).toISOString() : null,
    };
    this.svc.upsertCapa(this.incident.id, payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.capaSaving = false;
        this.capaSavedAt = new Date();
        this.successMessage = 'CAPA saved.';
        setTimeout(() => (this.successMessage = ''), 3000);
      },
      error: (e) => { this.capaSaving = false; this.errorMessage = e?.error?.message || 'Failed to save CAPA'; },
    });
  }

  // ── Phase 6f — evidence upload ────────────────────────────────────
  /** Parse the JSON string in incident.evidenceLinks → typed array. */
  evidenceList(): Array<{ label: string; url: string; uploadedBy?: string | null; uploadedAt?: string }> {
    const raw = this.incident?.evidenceLinks;
    if (!raw) return [];
    try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; }
    catch { return []; }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.pendingFile = file;
    this.evidenceError = '';
    if (file && file.size > 10 * 1024 * 1024) {
      this.evidenceError = 'File exceeds 10 MB cap.';
      this.pendingFile = null;
    }
  }

  uploadEvidence(fileInput: HTMLInputElement): void {
    if (!this.incident || !this.pendingFile) return;
    this.evidenceUploading = true;
    this.evidenceError = '';
    this.svc.uploadEvidence(this.incident.id, this.pendingFile, this.evidenceLabel || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.evidenceUploading = false;
          if (this.incident) {
            this.incident.evidenceLinks = JSON.stringify(r.data.evidenceLinks);
          }
          this.pendingFile = null;
          this.evidenceLabel = '';
          fileInput.value = '';
        },
        error: (e) => {
          this.evidenceUploading = false;
          this.evidenceError = e?.error?.message || 'Upload failed';
        },
      });
  }
}
