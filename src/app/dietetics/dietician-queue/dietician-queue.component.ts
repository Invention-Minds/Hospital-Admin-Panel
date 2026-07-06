import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  DieteticsService,
  DieticianQueue,
  DieticianQueueRow,
  DietMaster,
  DietPlan,
  UpsertDietPlanPayload,
  AllergenMaster,
} from '../../services/dietetics.service';
import { NoteTemplateService, NoteTemplate } from '../../services/note-template.service';
import { SignatureCreateResponse } from '../../services/signature.service';
import { AlertService } from '../../services/alert.service';

/**
 * Dietician queue — `/dietetics/queue`.
 *
 * Three buckets:
 *   • Pending — admitted patients with no ACTIVE diet plan yet (sorted oldest first
 *     so the 24h SLA pressure is visible).
 *   • Re-assess — admissions with low-intake flags on recent meals.
 *   • Active — current ACTIVE plans, for browsing.
 *
 * Clicking a row opens an inline editor: pick a diet, attach an optional
 * `diet-plan` note template (the form-renderer dynamically renders its fields),
 * jot kitchen notes, list allergens/restrictions. Save creates/updates a DRAFT.
 * Sign opens the e-sign pad — on success the plan flips to ACTIVE and any
 * prior ACTIVE plan is auto-demoted to SUPERSEDED.
 */
@Component({
  selector: 'app-dietician-queue',
  templateUrl: './dietician-queue.component.html',
  styleUrls: ['./dietician-queue.component.css'],
})
export class DieticianQueueComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage = '';
  successMessage = '';

  queue: DieticianQueue = { pending: [], reassess: [], active: [] };
  diets: DietMaster[] = [];
  allergens: AllergenMaster[] = [];
  templates: NoteTemplate[] = [];

  selected: DieticianQueueRow | null = null;
  editingPlan: DietPlan | null = null;
  // Editor buffer — bound to inputs.
  form: {
    dietMasterId: string;
    notesForKitchen: string;
    startDate: string;
    endDate: string;
    npoUntil: string;
    restrictionsSnapshot: string[];
    allergensSnapshot: string[];
    noteTemplateId: string | null;
    templatedValueMap: Record<string, unknown>;
    reassessmentReason: string;
  } = this.blankForm();

  saving = false;
  signing = false;

  private destroy$ = new Subject<void>();

  constructor(
    private svc: DieteticsService,
    private noteTemplateSvc: NoteTemplateService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.refreshQueue();
    this.svc.listDiets({ isActive: true }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.diets = r; },
      error: () => { /* swallow */ },
    });
    this.svc.listAllergens().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.allergens = r; },
      error: () => { /* swallow */ },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshQueue(): void {
    this.loading = true;
    this.svc.getQueue().pipe(takeUntil(this.destroy$)).subscribe({
      next: (q) => { this.queue = q; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load queue'; this.loading = false; },
    });
  }

  selectAdmission(row: DieticianQueueRow, isReassess = false): void {
    this.selected = row;
    this.errorMessage = '';
    this.successMessage = '';
    this.editingPlan = null;
    this.form = this.blankForm();
    if (isReassess) {
      this.form.reassessmentReason = 'Low meal intake flagged';
    }

    // Pull dept-scoped diet-plan templates for the department.
    this.noteTemplateSvc
      .getActiveForDepartment(row.department, 'diet-plan')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => { this.templates = rows; },
        error: () => { this.templates = []; },
      });

    // Existing current plan, if any.
    this.svc.getCurrentPlan(row.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (plan) => {
        if (plan) {
          this.editingPlan = plan;
          this.hydrateFormFromPlan(plan);
        }
      },
      error: () => { /* swallow */ },
    });
  }

  selectActivePlan(plan: DietPlan): void {
    this.editingPlan = plan;
    this.selected = {
      id: plan.admissionId,
      admissionNo: '',
      prn: '',
      admissionDate: '',
      department: '',
      diagnosis: '',
      admittingDoctor: '',
    };
    this.hydrateFormFromPlan(plan);
  }

  private hydrateFormFromPlan(plan: DietPlan): void {
    this.form = {
      dietMasterId: plan.dietMasterId,
      notesForKitchen: plan.notesForKitchen ?? '',
      startDate: plan.startDate ? plan.startDate.slice(0, 10) : '',
      endDate: plan.endDate ? plan.endDate.slice(0, 10) : '',
      npoUntil: plan.npoUntil ?? '',
      restrictionsSnapshot: this.parseJsonArray(plan.restrictionsSnapshot),
      allergensSnapshot: this.parseJsonArray(plan.allergensSnapshot),
      noteTemplateId: plan.noteTemplateId ?? null,
      templatedValueMap: this.parseTemplatedValues(plan.templatedValues),
      reassessmentReason: plan.reassessmentReason ?? '',
    };
  }

  private parseJsonArray(s: string | null | undefined): string[] {
    if (!s) return [];
    try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
  }

  private parseTemplatedValues(s: string | null | undefined): Record<string, unknown> {
    if (!s) return {};
    try { const v = JSON.parse(s); return (v?._values as Record<string, unknown>) ?? {}; } catch { return {}; }
  }

  toggleRestriction(name: string): void {
    const set = new Set(this.form.restrictionsSnapshot);
    if (set.has(name)) set.delete(name); else set.add(name);
    this.form.restrictionsSnapshot = Array.from(set);
  }
  toggleAllergen(name: string): void {
    const set = new Set(this.form.allergensSnapshot);
    if (set.has(name)) set.delete(name); else set.add(name);
    this.form.allergensSnapshot = Array.from(set);
  }
  selectedTemplate(): NoteTemplate | undefined {
    return this.templates.find((t) => t.id === this.form.noteTemplateId);
  }

  saveDraft(): void {
    if (!this.selected || !this.form.dietMasterId) {
      this.errorMessage = 'Pick an admission and a diet first.';
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const payload: UpsertDietPlanPayload = {
      admissionId: this.selected.id,
      dietMasterId: this.form.dietMasterId,
      startDate: this.form.startDate || undefined,
      endDate: this.form.endDate || null,
      npoUntil: this.form.npoUntil || null,
      restrictionsSnapshot: this.form.restrictionsSnapshot,
      allergensSnapshot: this.form.allergensSnapshot,
      notesForKitchen: this.form.notesForKitchen || null,
      noteTemplateId: this.form.noteTemplateId,
      templatedValueMap: this.form.templatedValueMap,
      reassessmentReason: this.form.reassessmentReason || null,
    };
    const obs = this.editingPlan && this.editingPlan.status === 'DRAFT'
      ? this.svc.updateDraft(this.editingPlan.id, payload)
      : this.svc.createDraft(payload);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (plan) => {
        this.editingPlan = plan;
        this.saving = false;
        this.successMessage = 'Draft saved.';
        this.refreshQueue();
      },
      error: (e) => {
        this.errorMessage = e?.error?.error || 'Save failed';
        this.saving = false;
      },
    });
  }

  onSigned(sig: SignatureCreateResponse): void {
    if (!this.editingPlan) return;
    this.signing = true;
    this.svc.signPlan(this.editingPlan.id, { signatureId: sig.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plan) => {
          this.editingPlan = plan;
          this.signing = false;
          this.successMessage = 'Plan signed and active.';
          this.refreshQueue();
        },
        error: (e) => {
          this.signing = false;
          this.errorMessage = e?.error?.error || 'Sign failed';
        },
      });
  }

  async endPlan(): Promise<void> {
    if (!this.editingPlan) return;
    if (!await this.alertSvc.confirm('End this diet plan? Meal orders generated after now will stop.', { severity: 'warning', confirmLabel: 'End plan' })) return;
    this.svc.endPlan(this.editingPlan.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (plan) => {
        this.editingPlan = plan;
        this.successMessage = 'Plan ended.';
        this.refreshQueue();
      },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed'; },
    });
  }

  blankForm(): typeof this.form {
    return {
      dietMasterId: '',
      notesForKitchen: '',
      startDate: '',
      endDate: '',
      npoUntil: '',
      restrictionsSnapshot: [],
      allergensSnapshot: [],
      noteTemplateId: null,
      templatedValueMap: {},
      reassessmentReason: '',
    };
  }
}
