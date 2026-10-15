import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  DieteticsService,
  DieticianQueue,
  DieticianQueueRow,
  DietMaster,
  DietPlan,
  DietTexture,
  UpsertDietPlanPayload,
  AllergenMaster,
  decodeJsonList,
  suggestDiets,
  toDateTimeLocal,
  fromDateTimeLocal,
} from '../../services/dietetics.service';
import { NoteTemplateService, NoteTemplate } from '../../services/note-template.service';
import { SignatureCreateResponse } from '../../services/signature.service';
import { AlertService } from '../../services/alert.service';

type WorkTab = 'pending' | 'reassess' | 'check' | 'active';

/**
 * Dietician queue — `/dietetics/queue`. The dietitian prescribes the diet;
 * the doctor only records the initial assessment.
 *
 * Buckets:
 *   • Pending — admitted, no signed diet yet (oldest first, 24h SLA). Rows on
 *     an INTERIM diet from the nursing census are badged.
 *   • Re-assess — low meal intake flagged in the last 48h.
 *   • Needs check — current plan flagged "check" (the sheet's "NPO? ND? CHECK").
 *   • Active — current ACTIVE plans, for browsing.
 *
 * The editor captures everything on the hospital's Diet Information Sheet
 * row: diet + texture (SRDD-SD), food allergy / avoid, fluid restriction,
 * disposable plate, NPO window, RT / tube feed, check flag, remarks. Per-meal
 * items are edited on the Diet Information Sheet itself.
 */
@Component({
  selector: 'app-dietician-queue',
  templateUrl: './dietician-queue.component.html',
  styleUrls: ['../dietetics-shared.css', './dietician-queue.component.css'],
})
export class DieticianQueueComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage = '';
  successMessage = '';

  queue: DieticianQueue = { pending: [], reassess: [], check: [], active: [] };
  diets: DietMaster[] = [];
  textures: DietTexture[] = [];
  allergens: AllergenMaster[] = [];
  templates: NoteTemplate[] = [];

  tab: WorkTab = 'pending';
  search = '';
  wardFilter = '';

  selected: DieticianQueueRow | null = null;
  editingPlan: DietPlan | null = null;
  // Editor buffer — bound to inputs.
  form = this.blankForm();

  saving = false;
  signing = false;

  /** Restrictions that came from the currently selected diet (removed again if the diet changes). */
  private appliedDietRestrictions: string[] = [];
  private static readonly BASE_RESTRICTIONS = [
    'No salt', 'Low fat', 'Low protein', 'Soft', 'Liquid', 'Tube feed', 'Lactose-free', 'Gluten-free',
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private svc: DieteticsService,
    private noteTemplateSvc: NoteTemplateService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.refreshQueue();
    this.svc.listDiets({ activeOnly: true }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.diets = r; },
      error: () => { /* swallow */ },
    });
    this.svc.listTextures().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.textures = r.filter((t) => t.isActive); },
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

  /**
   * Opens the editor for an admission. Plan picked, in order: newest unsigned
   * DRAFT, else the ACTIVE plan, else the census INTERIM plan. Saving an
   * ACTIVE / INTERIM plan creates a new draft (re-assessment).
   */
  selectAdmission(row: DieticianQueueRow, isReassess = false): void {
    this.selected = row;
    this.errorMessage = '';
    this.successMessage = '';
    this.editingPlan = null;
    this.form = this.blankForm();
    this.appliedDietRestrictions = [];
    const reassessReason = isReassess ? 'Low meal intake flagged' : '';
    this.form.reassessmentReason = reassessReason;

    // Pull dept-scoped diet-plan templates for the department.
    this.noteTemplateSvc
      .getActiveForDepartment(row.department, 'diet-plan')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => { this.templates = rows; },
        error: () => { this.templates = []; },
      });

    this.svc.getPlanHistory(row.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (plans) => {
        const plan = plans.find((p) => p.status === 'DRAFT')
          ?? plans.find((p) => p.status === 'ACTIVE')
          ?? plans.find((p) => p.status === 'INTERIM');
        if (plan) {
          this.editingPlan = plan;
          this.hydrateFormFromPlan(plan);
          if (reassessReason && !this.form.reassessmentReason) this.form.reassessmentReason = reassessReason;
        }
      },
      error: () => { /* swallow */ },
    });
  }

  /** Save button label for the current editor state. */
  get saveLabel(): string {
    if (this.saving) return 'Saving…';
    if (this.editingPlan?.status === 'DRAFT') return 'Update draft';
    if (this.editingPlan?.status === 'ACTIVE') return 'Save as new draft (re-assessment)';
    if (this.editingPlan?.status === 'INTERIM') return 'Save as draft (replaces interim diet)';
    return 'Save as draft';
  }

  /** The selected diet's kind decides whether the feed fields matter. */
  get selectedDiet(): DietMaster | undefined {
    return this.diets.find((d) => d.id === this.form.dietMasterId);
  }

  selectActivePlan(plan: DietPlan): void {
    // Load the full history so a newer draft (if any) is picked up.
    if (plan.patient) { this.selectAdmission(plan.patient); return; }
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

  // ─── Worklist (tabs, search, ward filter) ───────────────────────────
  get tabs(): Array<{ key: WorkTab; label: string; count: number }> {
    return [
      { key: 'pending', label: 'Awaiting assessment', count: this.queue.pending.length },
      { key: 'reassess', label: 'Re-assess', count: this.queue.reassess.length },
      { key: 'check', label: 'To verify', count: this.queue.check.length },
      { key: 'active', label: 'Active plans', count: this.queue.active.length },
    ];
  }

  /** Rows for the current tab, as one shape. Active rows carry their plan. */
  private get tabRows(): Array<{ row: DieticianQueueRow; plan: DietPlan | null }> {
    if (this.tab === 'active') {
      return this.queue.active
        .filter((p) => !!p.patient)
        .map((p) => ({ row: p.patient as DieticianQueueRow, plan: p }));
    }
    return this.queue[this.tab].map((row) => ({ row, plan: null }));
  }

  get wards(): string[] {
    const all = [...this.queue.pending, ...this.queue.reassess, ...this.queue.check,
      ...this.queue.active.map((p) => p.patient).filter((r): r is DieticianQueueRow => !!r)];
    return Array.from(new Set(all.map((r) => r.wardName ?? 'No ward'))).sort();
  }

  get rows(): Array<{ row: DieticianQueueRow; plan: DietPlan | null }> {
    const q = this.search.trim().toLowerCase();
    return this.tabRows.filter(({ row }) =>
      (!this.wardFilter || (row.wardName ?? 'No ward') === this.wardFilter)
      && (!q || [row.patientName, row.prn, row.bedNumber, row.admissionNo, row.diagnosis]
        .some((v) => (v ?? '').toLowerCase().includes(q))));
  }

  openRow(item: { row: DieticianQueueRow; plan: DietPlan | null }): void {
    this.selectAdmission(item.row, this.tab === 'reassess');
  }

  closeEditor(): void {
    this.selected = null;
    this.editingPlan = null;
  }

  /** "3 h", "2 d 4 h" since admission. */
  waiting(admissionDate: string): string {
    const ms = Date.now() - new Date(admissionDate).getTime();
    if (!Number.isFinite(ms) || ms < 0) return '—';
    const h = Math.floor(ms / 3_600_000);
    if (h < 24) return `${h} h`;
    const d = Math.floor(h / 24);
    return h % 24 ? `${d} d ${h % 24} h` : `${d} d`;
  }

  /** Past the 24 h assessment target (NABH COP.7). */
  overdue(admissionDate: string): boolean {
    return Date.now() - new Date(admissionDate).getTime() > 24 * 3_600_000;
  }

  get overdueCount(): number {
    return this.queue.pending.filter((r) => this.overdue(r.admissionDate)).length;
  }

  private hydrateFormFromPlan(plan: DietPlan): void {
    this.form = {
      dietMasterId: plan.dietMasterId,
      textureId: plan.textureId ?? '',
      notesForKitchen: plan.notesForKitchen ?? '',
      startDate: plan.startDate ? plan.startDate.slice(0, 10) : '',
      endDate: plan.endDate ? plan.endDate.slice(0, 10) : '',
      npoFrom: toDateTimeLocal(plan.npoFrom),
      npoUntil: toDateTimeLocal(plan.npoUntil),
      restrictionsSnapshot: decodeJsonList(plan.restrictionsSnapshot),
      allergensSnapshot: decodeJsonList(plan.allergensSnapshot),
      noteTemplateId: plan.noteTemplateId ?? null,
      templatedValueMap: this.parseTemplatedValues(plan.templatedValues),
      reassessmentReason: plan.reassessmentReason ?? '',
      foodAvoid: plan.foodAvoid ?? '',
      fluidRestrictionMl: plan.fluidRestrictionMl ?? null,
      disposablePlate: !!plan.disposablePlate,
      feedVolumeMl: plan.feedVolumeMl ?? null,
      feedIntervalHours: plan.feedIntervalHours ?? null,
      feedNotes: plan.feedNotes ?? '',
      needsCheck: !!plan.needsCheck,
      checkNote: plan.checkNote ?? '',
      remarks: plan.remarks ?? '',
    };
    // So switching away from this plan's diet drops that diet's restrictions.
    this.appliedDietRestrictions = decodeJsonList(
      this.diets.find((d) => d.id === plan.dietMasterId)?.restrictions,
    );
  }

  private parseTemplatedValues(s: string | null | undefined): Record<string, unknown> {
    if (!s) return {};
    try { const v = JSON.parse(s); return (v?._values as Record<string, unknown>) ?? {}; } catch { return {}; }
  }

  /** Checkbox list: the standard options plus anything a diet / earlier plan added. */
  get restrictionOptions(): string[] {
    return Array.from(new Set([
      ...DieticianQueueComponent.BASE_RESTRICTIONS,
      ...this.form.restrictionsSnapshot,
    ]));
  }

  /** Diets whose target conditions share a meaningful word with the diagnosis. */
  get suggestedDiets(): DietMaster[] {
    return suggestDiets(this.diets, this.selected?.diagnosis);
  }
  get otherDiets(): DietMaster[] {
    const suggested = new Set(this.suggestedDiets.map((d) => d.id));
    return this.diets.filter((d) => !suggested.has(d.id));
  }

  /**
   * Picking a diet ticks its own restrictions. Switching diet removes the
   * previous diet's restrictions but keeps any the dietitian ticked by hand.
   */
  onDietChange(dietId: string): void {
    this.form.dietMasterId = dietId;
    const diet = this.diets.find((d) => d.id === dietId);
    const fromDiet = decodeJsonList(diet?.restrictions);
    const kept = this.form.restrictionsSnapshot.filter((r) => !this.appliedDietRestrictions.includes(r));
    this.form.restrictionsSnapshot = Array.from(new Set([...kept, ...fromDiet]));
    this.appliedDietRestrictions = fromDiet;
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
    const f = this.form;
    const payload: UpsertDietPlanPayload = {
      admissionId: this.selected.id,
      dietMasterId: f.dietMasterId,
      startDate: f.startDate || undefined,
      endDate: f.endDate || null,
      // datetime-local has no zone — convert in the browser so the server
      // stores the instant the dietitian meant, whatever the server's TZ.
      npoFrom: fromDateTimeLocal(f.npoFrom),
      npoUntil: fromDateTimeLocal(f.npoUntil),
      restrictionsSnapshot: f.restrictionsSnapshot,
      allergensSnapshot: f.allergensSnapshot,
      notesForKitchen: f.notesForKitchen || null,
      noteTemplateId: f.noteTemplateId,
      templatedValueMap: f.templatedValueMap,
      reassessmentReason: f.reassessmentReason || null,
      textureId: f.textureId || null,
      foodAvoid: f.foodAvoid || null,
      fluidRestrictionMl: f.fluidRestrictionMl,
      disposablePlate: f.disposablePlate,
      feedVolumeMl: f.feedVolumeMl,
      feedIntervalHours: f.feedIntervalHours,
      feedNotes: f.feedNotes || null,
      needsCheck: f.needsCheck,
      checkNote: f.needsCheck ? (f.checkNote || null) : null,
      remarks: f.remarks || null,
    };
    const obs = this.editingPlan && this.editingPlan.status === 'DRAFT'
      ? this.svc.updateDraft(this.editingPlan.id, payload)
      : this.svc.createDraft(payload);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (plan) => {
        this.editingPlan = plan;
        this.saving = false;
        this.successMessage = 'Draft saved — sign below to activate.';
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
          this.successMessage = 'Plan signed and active — the kitchen has been updated.';
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
    if (!await this.alertSvc.confirm('End this diet plan? Trays not yet prepared will be cancelled.', { severity: 'warning', confirmLabel: 'End plan' })) return;
    this.svc.endPlan(this.editingPlan.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (plan) => {
        this.editingPlan = plan;
        this.successMessage = 'Plan ended.';
        this.refreshQueue();
      },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed'; },
    });
  }

  blankForm() {
    return {
      dietMasterId: '',
      textureId: '',
      notesForKitchen: '',
      startDate: '',
      endDate: '',
      npoFrom: '',
      npoUntil: '',
      restrictionsSnapshot: [] as string[],
      allergensSnapshot: [] as string[],
      noteTemplateId: null as string | null,
      templatedValueMap: {} as Record<string, unknown>,
      reassessmentReason: '',
      foodAvoid: '',
      fluidRestrictionMl: null as number | null,
      disposablePlate: false,
      feedVolumeMl: null as number | null,
      feedIntervalHours: null as number | null,
      feedNotes: '',
      needsCheck: false,
      checkNote: '',
      remarks: '',
    };
  }
}
