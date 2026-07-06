import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

import {
  AttenderAckDischargePayload,
  DischargeMedication,
  DischargeSummaryStatus,
  EditDischargePayload,
  IpdDischarge,
  IpdService,
  SignDischargePayload,
} from '../../services/ipd.service';
import { CanComponentDeactivate } from '../../guards/unsaved-changes.guard';
import { SignatureCreateResponse } from '../../services/signature.service';
import {
  FieldDef,
  NoteTemplate,
  NoteTemplateService,
} from '../../services/note-template.service';
import { DischargeClearanceService } from '../../services/discharge-clearance.service';

/**
 * Phase 6 (WF-5) — AI-drafted discharge summary with clinician sign-off.
 *
 * Lifecycle (drives screen layout):
 *
 *   NONE      — no row yet. User sees "Generate AI Draft" button + a manual form.
 *   DRAFTED   — AI populated the form. Banner shows "Drafted by AI · please review".
 *   EDITED    — clinician saved manual edits (aiDraftJson preserved server-side).
 *   SIGNED    — form locks. Attender acknowledgement panel appears below.
 *   DELIVERED — complete read-only view.
 *
 * Field names mirror the IpdDischarge schema columns 1:1
 * (`finalDiagnosis`, `proceduresDone`, `conditionAtDischarge`, `dischargeSummary`,
 *  `medications`, `advice`, `followUpDate`, `followUpDoctor`, `clinicianSignatureId`,
 *  `attenderAcknowledgmentSignatureId`, `summaryStatus`).
 */

interface DischargeMedicationFormValue {
  genericName: string;
  brandName: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  notes: string;
}

interface DischargeFormValue {
  dischargeType: 'regular' | 'LAMA' | 'transfer' | 'expired';
  finalDiagnosis: string;
  conditionAtDischarge: string;
  dischargeSummary: string;
  proceduresDone: string;
  followUpDate: Date | null;
  followUpDoctor: string;
  advice: string;
  medications: DischargeMedicationFormValue[];
}

export interface DischargeTypeOption {
  value: 'regular' | 'LAMA' | 'transfer' | 'expired';
  label: string;
}

@Component({
  selector: 'app-ipd-discharge',
  templateUrl: './ipd-discharge.component.html',
  styleUrls: ['./ipd-discharge.component.css'],
})
export class IpdDischargeComponent
  implements OnInit, OnDestroy, CanComponentDeactivate
{
  admissionId = '';
  form: FormGroup;

  // Lifecycle bookkeeping (mirrors IpdDischarge.summaryStatus column).
  summaryStatus: DischargeSummaryStatus = 'NONE';
  discharge: IpdDischarge | null = null;

  // Phase 9.5i — standardised condition-at-discharge enum so summaries
  // report consistent statuses for analytics + NABH reporting.
  readonly conditionOptions: ReadonlyArray<string> = [
    'Stable', 'Improved', 'Unchanged', 'Worsened', 'Critical', 'Death',
  ];

  loading = true;
  drafting = false;       // POST /ai-draft in flight
  savingEdits = false;    // PUT /edit in flight
  signing = false;        // POST /sign in flight
  ackSubmitting = false;  // POST /attender-ack in flight

  // Attender ack state (mirrors AttenderAckDischargePayload).
  attenderName = '';
  attenderRelation = '';
  clinicianName = '';

  // ─── Note-template integration ──────────────────────────────────────
  // Available templates for this admission's department (active only,
  // default-first). When the doctor picks one, the dynamic renderer takes
  // over and the legacy form fields hide. Backend snapshots the field defs
  // at sign-time so signed copies print identically forever.
  availableTemplates: NoteTemplate[] = [];
  selectedTemplateId = '';
  templateValues: Record<string, unknown> = {};
  /** Field defs to render — either live (from selected template) or snapshot (post-sign). */
  activeTemplateFields: FieldDef[] = [];
  loadingTemplates = false;

  // Confirm-discharge dialog state (legacy fallback path, when no AI draft exists)
  confirmDischargeVisible = false;

  // Unsaved-changes discard dialog state
  confirmDiscardVisible = false;
  private discardDecision$ = new Subject<boolean>();

  readonly dischargeTypes: DischargeTypeOption[] = [
    { value: 'regular',  label: 'Regular (normal)' },
    { value: 'LAMA',     label: 'LAMA' },
    { value: 'transfer', label: 'Transferred' },
    // Stored value stays 'expired' (DB column + backend logic unchanged);
    // only the user-facing label reads "Death".
    { value: 'expired',  label: 'Death' },
  ];

  readonly relationOptions = [
    'father', 'mother', 'spouse', 'son', 'daughter',
    'sibling', 'guardian', 'friend', 'other',
  ];

  private destroy$ = new Subject<void>();

  // Phase D — Doctor toggles "ready for discharge" at the top of this page.
  // Once flipped, the MT queue + diet/billing pre-notifies fire and the
  // discharge clearance board becomes meaningful (it spawns its rows when the
  // summary is later signed).
  dischargeReadyAt: string | null = null;
  togglingReady = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ipdService: IpdService,
    private messageService: MessageService,
    private noteTemplateService: NoteTemplateService,
    private clearanceService: DischargeClearanceService,
  ) {
    this.form = this.fb.group({
      dischargeType: ['regular' as DischargeFormValue['dischargeType'], [Validators.required]],
      finalDiagnosis: ['', [Validators.required]],
      conditionAtDischarge: ['', [Validators.required]],
      dischargeSummary: ['', [Validators.required]],
      proceduresDone: [''],
      followUpDate: [null as Date | null],
      followUpDoctor: [''],
      advice: [''],
      medications: this.fb.array<FormGroup>([]),
      // Phase 9.6 — ICU stay section (NABH COP.3). Mirrors IpdDischarge schema.
      icuStay: [false],
      icuDays: [null as number | null],
      icuOutcome: [''],
      icuSummary: [''],
    });
  }

  /** Phase 9.6 — derived from the admission row. True if the patient was
   *  ever in ICU during this admission (current OR historical). Drives the
   *  conditional render of the ICU section. */
  hadIcuStay = false;

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    if (!this.admissionId) {
      this.loading = false;
      return;
    }
    this.loadExisting();
    this.loadTemplatesForAdmission();
  }

  /**
   * Pull active discharge templates for this admission's department. Runs in
   * parallel with `loadExisting()`. We need the admission row first so we can
   * read its department; quick fetch via the ipdService.
   */
  private loadTemplatesForAdmission(): void {
    this.loadingTemplates = true;
    this.ipdService.getAdmission(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (admission) => {
        // Phase D — surface the ready-for-discharge state at the top of the page.
        const ready = (admission as { dischargeReadyAt?: string | null }).dischargeReadyAt;
        this.dischargeReadyAt = ready ?? null;
        // Phase 9.6 — flag any ICU exposure for this admission. Either
        // icuAdmittedAt is set (currently in ICU) or icuDischargedAt is set
        // (was in ICU earlier and stepped down).
        const a = admission as { icuAdmittedAt?: string | null; icuDischargedAt?: string | null };
        this.hadIcuStay = !!(a.icuAdmittedAt || a.icuDischargedAt);
        if (this.hadIcuStay) {
          this.form.patchValue({ icuStay: true });
          // Estimate ICU days from the timestamps
          const start = a.icuAdmittedAt ? new Date(a.icuAdmittedAt) : null;
          const end = a.icuDischargedAt ? new Date(a.icuDischargedAt) : new Date();
          if (start) {
            const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
            this.form.patchValue({ icuDays: days });
          }
        }

        const dept = (admission as { department?: string })?.department;
        if (!dept) { this.loadingTemplates = false; return; }
        this.noteTemplateService
          .getActiveForDepartment(dept, 'discharge')
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (rows) => {
              this.availableTemplates = rows ?? [];
              this.loadingTemplates = false;
              // If no template is yet selected on this discharge AND there is
              // a default for the department, auto-pick it. Doctor can switch.
              if (
                !this.selectedTemplateId &&
                this.availableTemplates.length > 0 &&
                !this.discharge?.noteTemplateId
              ) {
                const def = this.availableTemplates.find((t) => t.isDefault);
                if (def) this.applyTemplateSelection(def.id);
              }
            },
            error: () => { this.loadingTemplates = false; },
          });
      },
      error: () => { this.loadingTemplates = false; },
    });
  }

  /** User picked a template from the dropdown — load its fields[] to render. */
  onTemplateSelected(templateId: string): void {
    if (this.isLocked) return;
    this.applyTemplateSelection(templateId);
  }

  private applyTemplateSelection(templateId: string): void {
    this.selectedTemplateId = templateId;
    if (!templateId) {
      this.activeTemplateFields = [];
      return;
    }
    const tpl = this.availableTemplates.find((t) => t.id === templateId);
    if (tpl) {
      this.activeTemplateFields = tpl.fields ?? [];
      // Initialise any keys the form doesn't already have, so ngModel reflects '' / [] / etc.
      const seeded: Record<string, unknown> = { ...this.templateValues };
      for (const f of this.activeTemplateFields) {
        if (!(f.key in seeded)) {
          seeded[f.key] = f.type === 'multiselect' ? [] : f.type === 'checkbox' ? false : '';
        }
      }
      this.templateValues = seeded;
    }
  }

  /** Renderer emits the entire updated values map; we just store it. */
  onTemplateValuesChange(values: Record<string, unknown>): void {
    this.templateValues = values;
    this.form.markAsDirty();
  }

  /** True when the doctor is currently using a template for this discharge. */
  get isTemplated(): boolean {
    return !!this.selectedTemplateId && this.activeTemplateFields.length > 0;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Phase D — Doctor flips "ready for discharge". Fires the MT queue +
   * diet/billing pre-notify. Idempotent on the backend. */
  toggleReadyForDischarge(): void {
    if (this.togglingReady) return;
    this.togglingReady = true;
    const goingReady = !this.dischargeReadyAt;
    this.clearanceService.setReady(this.admissionId, goingReady).pipe(take(1)).subscribe({
      next: (r) => {
        this.dischargeReadyAt = r.data.dischargeReadyAt;
        this.togglingReady = false;
        this.messageService.add({
          severity: 'success',
          summary: goingReady ? 'Ready for discharge' : 'Ready flag cleared',
          detail: goingReady
            ? 'MT, Diet and Billing have been pre-notified.'
            : 'Pre-notify state cleared.',
        });
      },
      error: (e: { error?: { error?: string } }) => {
        this.togglingReady = false;
        this.messageService.add({
          severity: 'error', summary: 'Toggle failed',
          detail: e?.error?.error || 'Could not update ready-for-discharge state.',
        });
      },
    });
  }

  /** Phase D — Open the per-admission clearance board (7-dept traffic light
   * + Front-Desk finalise button). */
  openClearanceBoard(): void {
    this.router.navigate(['/ipd', 'admission', this.admissionId, 'discharge-clearance']);
  }

  // ---- Initial load -------------------------------------------------------
  private loadExisting(): void {
    this.ipdService
      .getDischarge(this.admissionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: unknown) => {
          // GET .../discharge returns a { message, data } envelope; the spec
          // mock returns the row directly — handle both.
          const row = ((res as { data?: IpdDischarge })?.data ?? res) as IpdDischarge;
          this.adopt(row);
          this.loading = false;
        },
        error: () => {
          // 404 = no discharge yet, which is the normal "ready to draft" state.
          this.summaryStatus = 'NONE';
          this.loading = false;
        },
      });
  }

  /** Pull a backend row into the form. Lock the form if SIGNED/DELIVERED. */
  private adopt(row: IpdDischarge): void {
    this.discharge = row;
    this.summaryStatus = row.summaryStatus ?? 'NONE';

    // Medications come back as either an array or a JSON string depending on
    // whether Prisma deserialised — handle both.
    const meds = parseMedications(row.medications);

    // Reset medications FormArray.
    while (this.medications.length) this.medications.removeAt(0);
    meds.forEach((m) => this.medications.push(this.medicationGroup(m)));

    this.form.patchValue({
      dischargeType: row.dischargeType,
      finalDiagnosis: row.finalDiagnosis ?? '',
      conditionAtDischarge: row.conditionAtDischarge ?? '',
      dischargeSummary: row.dischargeSummary ?? '',
      proceduresDone: row.proceduresDone ?? '',
      followUpDate: row.followUpDate ? new Date(row.followUpDate) : null,
      followUpDoctor: row.followUpDoctor ?? '',
      advice: row.advice ?? '',
    });
    this.form.markAsPristine();

    // ── Templated path adoption ──────────────────────────────────────
    // Two cases:
    //   1. Row is signed/delivered → templatedValues holds {_schema, _values}.
    //      We render the snapshot exactly as signed (NABH-safe).
    //   2. Row is drafted/edited → templatedValues holds at most {_values: {…}}.
    //      The schema comes from the live template (loaded separately).
    const parsed = parseTemplatedValues(row.templatedValues);
    if (parsed?._values) this.templateValues = parsed._values;
    if (parsed?._schema && Array.isArray(parsed._schema) && parsed._schema.length > 0) {
      // Locked snapshot present — render from it. selectedTemplateId still
      // points at the row's template id for the dropdown label.
      this.activeTemplateFields = parsed._schema as FieldDef[];
    }
    if (row.noteTemplateId) {
      this.selectedTemplateId = row.noteTemplateId;
    }

    if (this.isLocked) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
  }

  // ---- Form helpers -------------------------------------------------------
  get medications(): FormArray<FormGroup> {
    return this.form.get('medications') as FormArray<FormGroup>;
  }

  private medicationGroup(seed?: Partial<DischargeMedicationFormValue>): FormGroup {
    return this.fb.group({
      genericName: [seed?.genericName ?? '', [Validators.required]],
      brandName: [seed?.brandName ?? ''],
      dose: [seed?.dose ?? '', [Validators.required]],
      route: [seed?.route ?? 'oral', [Validators.required]],
      frequency: [seed?.frequency ?? '', [Validators.required]],
      duration: [seed?.duration ?? ''],
      notes: [seed?.notes ?? ''],
    });
  }

  addMedicationRow(): void {
    if (this.isLocked) return;
    this.medications.push(this.medicationGroup());
    this.form.markAsDirty();
  }

  removeMedicationRow(index: number): void {
    if (this.isLocked) return;
    this.medications.removeAt(index);
    this.form.markAsDirty();
  }

  shouldShowError(name: keyof DischargeFormValue): boolean {
    const ctrl = this.form.get(name);
    if (!ctrl) return false;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  // ---- Status guards used by the template ---------------------------------
  get hasDraft(): boolean {
    return this.summaryStatus !== 'NONE';
  }
  get isDrafted(): boolean {
    return this.summaryStatus === 'DRAFTED';
  }
  get isEdited(): boolean {
    return this.summaryStatus === 'EDITED';
  }
  get isSigned(): boolean {
    return this.summaryStatus === 'SIGNED' || this.summaryStatus === 'DELIVERED';
  }
  get isDelivered(): boolean {
    return this.summaryStatus === 'DELIVERED';
  }
  get isLocked(): boolean {
    return this.isSigned;
  }
  get canSign(): boolean {
    if (this.isLocked) return false;
    // Templated path — the legacy required-field guard doesn't apply because
    // the doctor is filling templated fields, not the legacy form. We only
    // require that a template is selected and the discharge has been edited
    // (status=DRAFTED|EDITED). Required-field validation per template is the
    // doctor's responsibility for now (a follow-up will add per-field guards).
    if (this.isTemplated) return this.hasDraft;
    return this.hasDraft && this.form.valid;
  }
  get canRecordAttenderAck(): boolean {
    return (
      this.summaryStatus === 'SIGNED' &&
      !!this.attenderName?.trim() &&
      !!this.attenderRelation
    );
  }

  // ---- AI draft (Phase 6 §1) ---------------------------------------------
  generateAiDraft(): void {
    if (this.drafting || this.isLocked) return;
    this.drafting = true;
    this.ipdService
      .generateDischargeAiDraft(this.admissionId, this.selectedTemplateId || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.drafting = false;
          this.adopt(row);
          this.messageService.add({
            severity: 'success',
            summary: 'AI draft generated',
            detail: 'Please review every field carefully before signing.',
            life: 5000,
          });
        },
        error: (err) => {
          this.drafting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'AI draft failed',
            detail: toErrorMessage(err),
            life: 6000,
          });
        },
      });
  }

  // ---- Save edits (Phase 6 §2) -------------------------------------------
  saveEdits(): void {
    if (this.isLocked || this.savingEdits) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Required fields missing',
        life: 4000,
      });
      return;
    }
    this.savingEdits = true;
    const payload = this.buildEditPayload();
    this.ipdService
      .editDischarge(this.admissionId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.savingEdits = false;
          this.adopt(row);
          this.messageService.add({
            severity: 'success',
            summary: 'Edits saved',
            life: 3000,
          });
        },
        error: (err) => {
          this.savingEdits = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not save edits',
            detail: toErrorMessage(err),
            life: 5000,
          });
        },
      });
  }

  // ---- Clinician sign-off (Phase 6 §3) -----------------------------------
  onClinicianSigned(resp: SignatureCreateResponse): void {
    if (this.signing || this.isLocked) return;
    this.signing = true;
    const payload: SignDischargePayload = {
      clinicianSignatureId: resp.id,
      clinicianSignedBy: this.clinicianName?.trim() || undefined,
    };
    this.ipdService
      .signDischarge(this.admissionId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.signing = false;
          this.adopt(row);
          this.messageService.add({
            severity: 'success',
            summary: 'Discharge signed',
            detail: 'Bed freed. Hand the printed summary to the attender for acknowledgement.',
            life: 6000,
          });
        },
        error: (err) => {
          this.signing = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not sign discharge',
            detail: toErrorMessage(err),
            life: 6000,
          });
        },
      });
  }

  // ---- Attender ack (Phase 6 §4) -----------------------------------------
  onAttenderSigned(resp: SignatureCreateResponse): void {
    if (this.ackSubmitting) return;
    if (!this.canRecordAttenderAck) return;
    this.ackSubmitting = true;
    const payload: AttenderAckDischargePayload = {
      attenderName: this.attenderName.trim(),
      attenderRelation: this.attenderRelation,
      attenderAcknowledgmentSignatureId: resp.id,
    };
    this.ipdService
      .recordDischargeAttenderAck(this.admissionId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.ackSubmitting = false;
          this.adopt(row);
          this.messageService.add({
            severity: 'success',
            summary: 'Attender acknowledgement recorded',
            life: 4000,
          });
        },
        error: (err) => {
          this.ackSubmitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not record acknowledgement',
            detail: toErrorMessage(err),
            life: 5000,
          });
        },
      });
  }

  // ---- Legacy free-text discharge (kept as fallback) ---------------------
  attemptDischarge(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.admissionId) return;
    this.confirmDischargeVisible = true;
  }

  onDischargeConfirm(): void {
    this.confirmDischargeVisible = false;
    this.performLegacyDischarge();
  }

  onDischargeCancel(): void {
    this.confirmDischargeVisible = false;
  }

  private performLegacyDischarge(): void {
    this.savingEdits = true;
    const raw = this.form.getRawValue() as DischargeFormValue;
    const meds: DischargeMedication[] = raw.medications
      .filter((m) => m.genericName.trim().length > 0)
      .map((m) => ({
        genericName: m.genericName.trim(),
        brandName: m.brandName?.trim() || undefined,
        dose: m.dose.trim(),
        route: m.route.trim(),
        frequency: m.frequency.trim(),
        duration: m.duration.trim(),
        notes: m.notes?.trim() || undefined,
      }));

    this.ipdService
      .createDischarge(this.admissionId, {
        admissionId: this.admissionId,
        dischargeDate: new Date(),
        dischargeTime: '',
        dischargeType: raw.dischargeType,
        finalDiagnosis: raw.finalDiagnosis.trim(),
        proceduresDone: raw.proceduresDone?.trim() || undefined,
        conditionAtDischarge: raw.conditionAtDischarge.trim(),
        dischargeSummary: raw.dischargeSummary.trim(),
        followUpDate: raw.followUpDate ?? undefined,
        followUpDoctor: raw.followUpDoctor?.trim() || undefined,
        medications: meds,
        advice: raw.advice?.trim() || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.savingEdits = false;
          this.form.markAsPristine();
          this.messageService.add({
            severity: 'success',
            summary: 'Patient discharged',
            life: 4000,
          });
          this.router.navigate(['/ipd']);
        },
        error: (err) => {
          this.savingEdits = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not discharge patient',
            detail: toErrorMessage(err),
            life: 6000,
          });
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/ipd']);
  }

  private buildEditPayload(): EditDischargePayload {
    const raw = this.form.getRawValue() as DischargeFormValue;
    const medications: DischargeMedication[] = raw.medications
      .filter((m) => m.genericName.trim().length > 0)
      .map((m) => ({
        genericName: m.genericName.trim(),
        brandName: m.brandName?.trim() || undefined,
        dose: m.dose.trim(),
        route: m.route.trim(),
        frequency: m.frequency.trim(),
        duration: m.duration.trim(),
        notes: m.notes?.trim() || undefined,
      }));

    const payload: EditDischargePayload = {
      dischargeType: raw.dischargeType,
      finalDiagnosis: raw.finalDiagnosis.trim(),
      proceduresDone: raw.proceduresDone?.trim() || undefined,
      conditionAtDischarge: raw.conditionAtDischarge.trim(),
      dischargeSummary: raw.dischargeSummary.trim(),
      followUpDate: raw.followUpDate ? raw.followUpDate.toISOString() : undefined,
      followUpDoctor: raw.followUpDoctor?.trim() || undefined,
      medications,
      advice: raw.advice?.trim() || undefined,
    };

    // Templated path — sent alongside legacy fields so existing print + AI
    // paths keep working. Backend snapshot happens on /sign.
    if (this.isTemplated) {
      payload.noteTemplateId = this.selectedTemplateId;
      payload.templatedValueMap = this.templateValues;
    }

    return payload;
  }

  // ---- Unsaved-changes guard ---------------------------------------------
  canDeactivate(): Observable<boolean> | boolean {
    if (this.form.pristine) return true;
    this.confirmDiscardVisible = true;
    return this.discardDecision$.pipe(take(1));
  }

  onDiscardConfirm(): void {
    this.confirmDiscardVisible = false;
    this.discardDecision$.next(true);
  }

  onDiscardCancel(): void {
    this.confirmDiscardVisible = false;
    this.discardDecision$.next(false);
  }
}

// ---- Local helpers (typed, no `any`) --------------------------------------

function parseMedications(input: unknown): DischargeMedication[] {
  if (Array.isArray(input)) return input as DischargeMedication[];
  if (typeof input === 'string' && input.trim().startsWith('[')) {
    try {
      const arr = JSON.parse(input);
      if (Array.isArray(arr)) return arr as DischargeMedication[];
    } catch {
      return [];
    }
  }
  return [];
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const maybe = err as { error?: { message?: string; error?: string }; status?: number; message?: string };
    if (maybe.status === 409) {
      return maybe.error?.message ?? maybe.error?.error ?? 'Conflict — discharge state has changed.';
    }
    return maybe.error?.message ?? maybe.error?.error ?? maybe.message ?? 'Unknown error';
  }
  return 'Unknown error';
}

/**
 * Defensive parse of the `templatedValues` LongText column.
 * Returns null when empty / not parseable. Matches the backend helper.
 */
function parseTemplatedValues(raw: unknown):
  | { _schema?: unknown; _values?: Record<string, unknown> }
  | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as { _schema?: unknown; _values?: Record<string, unknown> };
  } catch {
    return null;
  }
}
