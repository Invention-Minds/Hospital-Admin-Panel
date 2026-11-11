import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  CapaPayload, Incident, IncidentService, IncidentStatus, IncidentSeverity,
  INCIDENT_TRANSITIONS, HarmLevel, HARM_LABELS, HARM_TO_SEVERITY,
  CapaAction, CapaActionKind, EffectivenessReview, EffectivenessOutcome, IncidentTaxonomyCategory,
} from '../../services/incident.service';
import { isIncidentManager } from '../../quality/quality-access';
import { SchedulingService, SchedulingStaff } from '../../services/scheduling.service';
import { QualityUnitService, HospitalUnit } from '../../services/quality-unit.service';
import { DownloadOtpService } from '../../shared/download-otp/download-otp.service';
import { openStampedFile } from '../../shared/download-otp/download-stamp';

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

  // Triage / assign / CAPA editing is manager-only (super_admin or admin
  // 'Quality Manager'); reporters, assignees and department viewers get a
  // read-only view. Evidence: reporter, assignee or manager, while not closed.
  readonly isManager = isIncidentManager();
  private readonly myUserId = typeof localStorage !== 'undefined' ? Number(localStorage.getItem('userid')) || null : null;
  staff: SchedulingStaff[] = [];

  /** Closed / cancelled incidents are frozen server-side until reopened. */
  get isLocked(): boolean {
    const s = this.incident?.status;
    return s === 'closed' || s === 'cancelled';
  }
  get canAttachEvidence(): boolean {
    const inc = this.incident;
    if (!inc || this.isLocked) return false;
    const isParty = this.myUserId !== null && (inc.reportedById === this.myUserId || inc.assignedToId === this.myUserId);
    return this.isManager || isParty || !!inc.permissions?.canTriage;
  }

  // Server-computed permissions (manager, or HOD of the incident's unit).
  get canEditStatus(): boolean { const p = this.incident?.permissions; return !!(p?.canTriage || p?.canClose); }
  get canClose(): boolean { return !!this.incident?.permissions?.canClose; }
  get canEditCapa(): boolean { return !!this.incident?.permissions?.canEditCapa; }
  get canChangeUnit(): boolean { return !!this.incident?.permissions?.canChangeUnit; }
  /** Viewer is acting as unit HOD (not a manager). */
  get actingAsHod(): boolean { return this.canEditStatus && !this.canClose; }

  // Sub-types (from the API) + staff also involved.
  taxonomy: IncidentTaxonomyCategory[] = [];
  get subtypes(): Array<{ key: string; label: string }> {
    return this.taxonomy.find((c) => c.category === this.incident?.category)?.subtypes ?? [];
  }
  subLabel(key: string | null | undefined): string {
    if (!key) return '';
    return this.subtypes.find((s) => s.key === key)?.label ?? key.replace(/_/g, ' ');
  }
  get participantNames(): string { return (this.incident?.participants ?? []).map((p) => p.name).join(', '); }
  newParticipant: number | null = null;
  participantBusy = false;
  get availableStaff(): SchedulingStaff[] {
    const taken = new Set((this.incident?.participants ?? []).map((p) => p.userId));
    if (this.incident?.assignedToId) taken.add(this.incident.assignedToId);
    return this.staff.filter((s) => !taken.has(s.id));
  }
  addParticipant(): void {
    if (!this.incident || !this.newParticipant || this.participantBusy) return;
    this.participantBusy = true;
    this.svc.addParticipant(this.incident.id, this.newParticipant).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.participantBusy = false; if (this.incident) this.load(this.incident.id); },
      error: (e) => { this.participantBusy = false; this.errorMessage = e?.error?.message || 'Failed to add'; },
    });
  }
  removeParticipant(userId: number): void {
    if (!this.incident || this.participantBusy) return;
    this.participantBusy = true;
    this.svc.removeParticipant(this.incident.id, userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.participantBusy = false; if (this.incident) this.load(this.incident.id); },
      error: (e) => { this.participantBusy = false; this.errorMessage = e?.error?.message || 'Failed to remove'; },
    });
  }
  units: HospitalUnit[] = [];

  // Status-edit draft. Confirmed harm replaces the old "revised severity"
  // picker — the server derives severityFinal from it.
  draft = {
    status: 'open' as IncidentStatus, harmLevelFinal: null as HarmLevel | null, subCategory: null as string | null,
    assignedTo: '', assignedToId: null as number | null, closureNotes: '',
    unitId: null as number | null,
  };
  saving = false;
  readonly HARM_LEVELS: HarmLevel[] = ['not_reached', 'none', 'mild', 'moderate', 'severe', 'permanent_or_death'];
  readonly HARM_LABELS = HARM_LABELS;
  harmSeverity(h: HarmLevel | null | undefined): IncidentSeverity | null { return h ? HARM_TO_SEVERITY[h] : null; }
  /** Severity that drives escalation / reporting: post-investigation when set. */
  effectiveSeverity(inc: Incident): string { return inc.severityFinal || inc.severity; }

  // Root cause editor (5-Whys). Actions are separate rows below.
  capaDraft: CapaPayload = {
    immediateActions: '', why1: '', why2: '', why3: '', why4: '', why5: '', rootCause: '',
  };
  capaSaving = false;
  capaSavedAt: Date | null = null;

  // CAPA actions.
  newAction = { kind: 'corrective' as CapaActionKind, description: '', ownerId: null as number | null, dueDate: '' };
  actionBusy = false;
  /** Inline "mark done / drop" note editor: action id + target status. */
  closingAction: { id: string; status: 'done' | 'dropped'; note: string } | null = null;
  editingAction: { id: string; description: string; ownerId: number | null; dueDate: string } | null = null;

  // Effectiveness checks.
  reviewDraft: Record<string, { outcome: EffectivenessOutcome | ''; notes: string }> = {};
  reviewBusy = false;
  readonly OUTCOME_LABELS: Record<EffectivenessOutcome, string> = {
    effective: 'Effective', partial: 'Partly effective', not_effective: 'Not effective',
  };
  get canReview(): boolean { return !!this.incident?.permissions?.canReviewEffectiveness; }

  // Phase 6f — evidence upload state.
  pendingFile: File | null = null;
  evidenceLabel = '';
  evidenceUploading = false;
  evidenceError = '';

  readonly STATUSES: IncidentStatus[] = ['open', 'triaged', 'investigated', 'capa_in_progress', 'closed', 'cancelled'];
  readonly SEVERITIES: IncidentSeverity[] = ['near_miss', 'minor', 'moderate', 'major', 'sentinel'];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute, private router: Router,
    private svc: IncidentService, private scheduling: SchedulingService,
    private downloadOtp: DownloadOtpService,
    private unitSvc: QualityUnitService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!id) { this.errorMessage = 'Missing incident id'; return; }
    this.load(id);
    this.svc.taxonomy().pipe(takeUntil(this.destroy$)).subscribe({ next: (r) => (this.taxonomy = r.data ?? []), error: () => {} });
  }

  /** Pickers for whoever may edit (manager or unit HOD) — loaded once after the first fetch. */
  private pickersLoaded = false;
  private loadPickers(): void {
    if (this.pickersLoaded || !this.canEditStatus) return;
    this.pickersLoaded = true;
    this.scheduling.listStaff().pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => { this.staff = rows ?? []; },
      error: () => { /* picker is best-effort; free-text name still works */ },
    });
    if (this.canChangeUnit) {
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
      next: (r) => {
        this.incident = r.data;
        this.draft.status = r.data.status;
        this.draft.harmLevelFinal = r.data.harmLevelFinal ?? null;
        this.draft.subCategory = r.data.subCategory ?? null;
        this.newParticipant = null;
        this.closingAction = null;
        this.editingAction = null;
        this.reviewDraft = {};
        for (const rv of r.data.effectivenessReviews ?? []) this.reviewDraft[rv.id] = { outcome: '', notes: '' };
        this.draft.assignedTo = r.data.assignedTo ?? '';
        this.draft.assignedToId = r.data.assignedToId ?? null;
        this.draft.closureNotes = r.data.closureNotes ?? '';
        this.draft.unitId = r.data.unitId ?? null;
        this.loadPickers();
        // Hydrate the CAPA draft from the saved row (if any).
        const c = r.data.capa;
        if (c) {
          this.capaDraft = {
            immediateActions: c.immediateActions ?? '',
            why1: c.why1 ?? '', why2: c.why2 ?? '', why3: c.why3 ?? '', why4: c.why4 ?? '', why5: c.why5 ?? '',
            rootCause: c.rootCause ?? '',
          };
        }
        this.loading = false;
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load incident'; this.loading = false; },
    });
  }

  /** Current status plus the moves the backend allows from it. */
  statusOptions(): IncidentStatus[] {
    const cur = this.incident?.status;
    if (!cur) return this.STATUSES;
    const next = INCIDENT_TRANSITIONS[cur] ?? [];
    // Unit HODs investigate; closing / cancelling stays with the Quality Manager.
    return [cur, ...(this.canClose ? next : next.filter((s) => s !== 'closed' && s !== 'cancelled'))];
  }

  /** Picker → keep the id and the display name in sync. */
  onAssigneeSelected(id: number | null): void {
    this.draft.assignedToId = id;
    const u = this.staff.find((s) => s.id === id);
    if (u) this.draft.assignedTo = u.username;
  }

  saveStatus(): void {
    if (!this.incident || this.saving) return;
    this.errorMessage = '';
    this.saving = true;
    const id = this.incident.id;
    this.svc.updateStatus(id, {
      status: this.draft.status,
      ...(this.draft.harmLevelFinal !== (this.incident.harmLevelFinal ?? null) && { harmLevelFinal: this.draft.harmLevelFinal }),
      ...(this.draft.subCategory !== (this.incident.subCategory ?? null) && { subCategory: this.draft.subCategory }),
      assignedTo: this.draft.assignedTo || null,
      assignedToId: this.draft.assignedToId,
      closureNotes: this.draft.closureNotes || null,
      ...(this.canChangeUnit && this.draft.unitId !== (this.incident.unitId ?? null) && { unitId: this.draft.unitId }),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.saving = false;
        this.successMessage = `Status updated → ${this.statusLabel(r.data.status)}`;
        setTimeout(() => (this.successMessage = ''), 3000);
        // The PUT returns the bare row — refetch so CAPA + linked records stay.
        this.load(id);
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to update status'; },
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

  /** Save the root-cause analysis (5-Whys). Legacy free-text actions are left untouched. */
  saveCapa(): void {
    if (!this.incident || this.capaSaving) return;
    this.capaSaving = true;
    this.errorMessage = '';
    // Send empty strings as null so the DB doesn't keep dirty empty rows.
    const payload: CapaPayload = {
      immediateActions: this.capaDraft.immediateActions || null,
      why1: this.capaDraft.why1 || null, why2: this.capaDraft.why2 || null,
      why3: this.capaDraft.why3 || null, why4: this.capaDraft.why4 || null, why5: this.capaDraft.why5 || null,
      rootCause: this.capaDraft.rootCause || null,
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

  // ── CAPA actions ──────────────────────────────────────────────────
  /** Old CAPAs kept their actions as free text — shown read-only. */
  get legacyCapaNotes(): Array<{ label: string; text: string }> {
    const c = this.incident?.capa;
    if (!c) return [];
    return [
      { label: 'Corrective actions', text: c.correctiveActions ?? '' },
      { label: 'Preventive actions', text: c.preventiveActions ?? '' },
      { label: 'Effectiveness review', text: c.effectivenessReview ?? '' },
    ].filter((n) => n.text.trim());
  }

  actionsOf(kind: CapaActionKind): CapaAction[] {
    return (this.incident?.capaActions ?? []).filter((a) => a.kind === kind);
  }
  get openActionCount(): number {
    return (this.incident?.capaActions ?? []).filter((a) => a.status === 'open').length;
  }
  isOverdue(a: CapaAction): boolean {
    return a.status === 'open' && !!a.dueDate && new Date(a.dueDate).getTime() < Date.now();
  }
  staffName(id: number | null): string {
    const u = this.staff.find((s) => s.id === id);
    return u ? u.username : '';
  }

  private actionDone(msg: string): void {
    this.actionBusy = false;
    this.successMessage = msg;
    setTimeout(() => (this.successMessage = ''), 3000);
    if (this.incident) this.load(this.incident.id);
  }
  private actionFailed(e: { error?: { message?: string } }): void {
    this.actionBusy = false;
    this.errorMessage = e?.error?.message || 'Failed to update the action';
  }

  addAction(): void {
    if (!this.incident || this.actionBusy) return;
    const d = this.newAction;
    if (d.description.trim().length < 3) { this.errorMessage = 'Describe the action (min 3 chars).'; return; }
    this.actionBusy = true;
    this.errorMessage = '';
    this.svc.addCapaAction(this.incident.id, {
      kind: d.kind, description: d.description.trim(), ownerId: d.ownerId,
      dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.newAction = { kind: d.kind, description: '', ownerId: null, dueDate: '' };
        this.actionDone('Action added.');
      },
      error: (e) => this.actionFailed(e),
    });
  }

  startEdit(a: CapaAction): void {
    this.closingAction = null;
    this.editingAction = { id: a.id, description: a.description, ownerId: a.ownerId, dueDate: a.dueDate ? a.dueDate.substring(0, 10) : '' };
  }
  saveEdit(): void {
    const e = this.editingAction;
    if (!this.incident || !e || this.actionBusy) return;
    this.actionBusy = true;
    this.errorMessage = '';
    this.svc.updateCapaAction(this.incident.id, e.id, {
      description: e.description.trim(), ownerId: e.ownerId,
      dueDate: e.dueDate ? new Date(e.dueDate).toISOString() : null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.actionDone('Action updated.'),
      error: (err) => this.actionFailed(err),
    });
  }

  startClose(a: CapaAction, status: 'done' | 'dropped'): void {
    this.editingAction = null;
    this.closingAction = { id: a.id, status, note: '' };
  }
  confirmClose(): void {
    const c = this.closingAction;
    if (!this.incident || !c || this.actionBusy) return;
    if (!c.note.trim()) {
      this.errorMessage = c.status === 'done' ? 'Add a note on what was done.' : 'Add a note on why it is dropped.';
      return;
    }
    this.actionBusy = true;
    this.errorMessage = '';
    this.svc.updateCapaAction(this.incident.id, c.id, { status: c.status, completionNote: c.note.trim() })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => this.actionDone(c.status === 'done' ? 'Action marked done.' : 'Action dropped.'),
        error: (e) => this.actionFailed(e),
      });
  }
  reopenAction(a: CapaAction): void {
    if (!this.incident || this.actionBusy) return;
    this.actionBusy = true;
    this.svc.updateCapaAction(this.incident.id, a.id, { status: 'open' }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.actionDone('Action reopened.'),
      error: (e) => this.actionFailed(e),
    });
  }

  // ── Effectiveness checks ──────────────────────────────────────────
  /** Checks can be recorded from 7 days before they fall due (mirrors the API). */
  reviewOpen(r: EffectivenessReview): boolean {
    return r.status === 'pending' && Date.now() >= new Date(r.dueAt).getTime() - 7 * 86_400_000;
  }
  reviewOverdue(r: EffectivenessReview): boolean {
    return r.status === 'pending' && new Date(r.dueAt).getTime() < Date.now();
  }
  recordReview(r: EffectivenessReview): void {
    const d = this.reviewDraft[r.id];
    if (!this.incident || !d || this.reviewBusy) return;
    if (!d.outcome) { this.errorMessage = 'Choose an outcome.'; return; }
    if (d.outcome !== 'effective' && !d.notes.trim()) { this.errorMessage = 'Describe what was found.'; return; }
    if (d.outcome === 'not_effective' &&
        !confirm('Recording "not effective" reopens this incident so new CAPA actions can be added. Continue?')) return;
    this.reviewBusy = true;
    this.errorMessage = '';
    this.svc.recordEffectiveness(this.incident.id, r.id, { outcome: d.outcome, notes: d.notes.trim() || null })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => {
          this.reviewBusy = false;
          this.successMessage = res.reopened
            ? 'Recorded — the incident is reopened for new CAPA actions.'
            : `${r.dayOffset}-day check recorded.`;
          setTimeout(() => (this.successMessage = ''), 4000);
          if (this.incident) this.load(this.incident.id);
        },
        error: (e) => { this.reviewBusy = false; this.errorMessage = e?.error?.message || 'Failed to record the check'; },
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

  async openFile(url: string) {
    if (!(await this.downloadOtp.verify('Incident evidence file'))) return;
    await openStampedFile(url);
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
