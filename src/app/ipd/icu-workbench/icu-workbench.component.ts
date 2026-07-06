import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  IcuClinicalService,
  IcuWorkbenchPayload,
  IcuVitalsReading,
  IcuProgressNote,
  IcuSedationLog,
  IcuRestraintLog,
  IcuRestraintReviewEntry,
  IcuBundleLog,
  IcuFamilyCommunication,
  IcuStepDownRequest,
  IcuInvasiveLine,
  IcuLineType,
  IcuNursingCarePlan,
  CarePlanRow,
  IcuNurseNote,
} from '../../services/icu-clinical.service';
import { AlertService } from '../../services/alert.service';
import { DoctorSelectComponent } from '../../shared/ui/doctor-select/doctor-select.component';

type IcuTab =
  | 'overview' | 'vitals' | 'progress' | 'sedation'
  | 'restraints' | 'bundles' | 'family' | 'stepdown'
  | 'lines' | 'careplan' | 'notes';

/**
 * Phase 9.6 — ICU Workbench (NABH COP.3).
 *
 * Single tabbed page that owns every ICU clinical artefact for one
 * admission. Loaded by route /ipd/admission/:admissionId/icu and surfaced
 * from the IPD admission detail page once the patient enters an ICU bed.
 *
 * Tabs:
 *   Overview   — patient strip + ICU day counter + 30-day readmission banner
 *   Vitals     — hourly vitals + ventilator + ABG add form
 *   Progress   — daily intensivist SOAP + SOFA/APACHE/GCS scoring
 *   Sedation   — RASS + CPOT per-shift logs
 *   Restraints — orders + 4-hourly review chain
 *   Bundles    — daily VAP/CLABSI/CAUTI/PU/DVT checklist
 *   Family     — communication log (prognosis, consent, EOL)
 *   Step-Down  — ICU → ward back-transfer workflow
 */
@Component({
  selector: 'app-icu-workbench',
  standalone: true,
  imports: [CommonModule, FormsModule, DoctorSelectComponent],
  templateUrl: './icu-workbench.component.html',
  styleUrls: ['./icu-workbench.component.css'],
})
export class IcuWorkbenchComponent implements OnInit, OnDestroy {
  admissionId = '';
  tab: IcuTab = 'overview';

  payload: IcuWorkbenchPayload | null = null;
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  // ── Vitals draft ───────────────────────────────────────────────────
  vitalsDraft: Partial<IcuVitalsReading> = {
    intervalMinutes: 60, hr: null, sbp: null, dbp: null, rr: null, spo2: null,
    temp: null, gcs: null, ventilatorMode: null, fiO2: null, peep: null,
    abgPh: null, abgPco2: null, abgPo2: null, abgHco3: null,
    inotropes: null, notes: null,
  };

  // ── Progress note draft ────────────────────────────────────────────
  progressDraft = {
    doctorName: '', subjective: '', objective: '', assessment: '', plan: '',
    sofaScore: null as number | null, apacheScore: null as number | null,
    gcsScore: null as number | null,
    trajectory: 'stable' as 'improving' | 'stable' | 'deteriorating' | 'critical',
  };

  // ── Sedation draft ─────────────────────────────────────────────────
  sedationDraft = {
    shift: 'morning' as 'morning' | 'evening' | 'night',
    rassScore: null as number | null, rassBehavior: '',
    cpotScore: null as number | null, cpotBehavior: '',
    sedativeAgent: '', sedativeRate: '',
    analgesicAgent: '', analgesicRate: '',
    rassGoal: null as number | null, notes: '',
  };

  // ── Restraint draft ────────────────────────────────────────────────
  restraintDraft = {
    orderedBy: '', reason: '',
    restraintType: 'physical-soft' as 'physical-soft' | 'physical-hard' | 'chemical' | 'mitten',
    bodyPart: '',
  };
  reviewDrafts: Record<string, { status: 'continue' | 'discontinue'; notes: string }> = {};

  // ── Bundle draft (one per day; upserted) ──────────────────────────
  bundleDraft = {
    chartDate: '',
    vapStatus: '' as string, vapNotes: '',
    clabsiStatus: '', clabsiNotes: '',
    cautiStatus: '', cautiNotes: '',
    pressureUlcerStatus: '', pressureUlcerNotes: '',
    dvtStatus: '', dvtNotes: '',
    glycemicControlStatus: '', glycemicControlNotes: '',
  };

  // ── Family communication draft ─────────────────────────────────────
  familyDraft = {
    category: 'update' as string,
    participantName: '', participantRelation: '', participantPhone: '',
    topicsDiscussed: '', decisionsReached: '',
    secondOpinionRequested: false, multiPartyMeeting: false,
  };

  // ── Step-down draft ────────────────────────────────────────────────
  stepDownDraft = {
    rationale: '', stepDownCriteriaMet: false,
    ongoingMeds: '', carryForwardOrders: '',
    codeStatus: 'full-code' as 'full-code' | 'DNR' | 'DNI' | 'comfort-care',
  };

  // ── Enum sources ───────────────────────────────────────────────────
  readonly rassScale: ReadonlyArray<{ value: number; label: string }> = [
    { value: -5, label: '−5 · Unarousable' },
    { value: -4, label: '−4 · Deep sedation' },
    { value: -3, label: '−3 · Moderate sedation' },
    { value: -2, label: '−2 · Light sedation' },
    { value: -1, label: '−1 · Drowsy' },
    { value: 0,  label: ' 0 · Alert & calm' },
    { value: 1,  label: '+1 · Restless' },
    { value: 2,  label: '+2 · Agitated' },
    { value: 3,  label: '+3 · Very agitated' },
    { value: 4,  label: '+4 · Combative' },
  ];
  // Keys of bundleDraft that hold a status value (one per NABH bundle item).
  // Listed as a string-literal union so the template can [(ngModel)]="bundleDraft[item.key]"
  // without TS complaining about index access.
  readonly bundleItems: ReadonlyArray<{
    key: 'vapStatus' | 'clabsiStatus' | 'cautiStatus' | 'pressureUlcerStatus' | 'dvtStatus' | 'glycemicControlStatus';
    label: string;
  }> = [
    { key: 'vapStatus', label: 'VAP prophylaxis (head-up 30°, oral care, sedation hold)' },
    { key: 'clabsiStatus', label: 'CLABSI prophylaxis (line site clean, dressing intact)' },
    { key: 'cautiStatus', label: 'CAUTI prophylaxis (catheter necessity reviewed)' },
    { key: 'pressureUlcerStatus', label: 'Pressure ulcer prevention (turn q2h, skin check)' },
    { key: 'dvtStatus', label: 'DVT prophylaxis (LMWH or mechanical)' },
    { key: 'glycemicControlStatus', label: 'Glycemic control (sliding scale reviewed)' },
  ];
  readonly bundleStatuses = ['done', 'not-applicable', 'deferred'];
  readonly familyCategories: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'update', label: 'Routine update' },
    { value: 'prognosis', label: 'Prognosis discussion' },
    { value: 'procedure-consent', label: 'Procedure / informed consent' },
    { value: 'goals-of-care', label: 'Goals of care' },
    { value: 'end-of-life', label: 'End-of-life' },
    { value: 'transfer-explanation', label: 'Transfer explanation' },
    { value: 'other', label: 'Other' },
  ];
  readonly ventModes = ['VC', 'PC', 'SIMV', 'PSV', 'CPAP', 'NIV', 'HFNC'];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: IcuClinicalService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    if (this.admissionId) this.load();
    const today = new Date();
    this.bundleDraft.chartDate = today.toISOString().slice(0, 10);
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true; this.errorMessage = '';
    this.svc.workbench(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.payload = r.data; this.loading = false; },
      error: (e) => {
        this.errorMessage = e?.error?.message || 'Failed to load ICU workbench';
        this.loading = false;
      },
    });
  }

  setTab(t: IcuTab): void {
    this.tab = t;
    this.errorMessage = '';
    // Phase 9.16 — lazy-load nurses-care resources when their tab opens.
    if (t === 'lines' && !this.linesLoaded) this.loadLines();
    if (t === 'careplan' && !this.carePlansLoaded) this.loadCarePlans();
    if (t === 'notes' && !this.nurseNotesLoaded) this.loadNurseNotes();
  }

  // ─── Phase 9.16 — Nurses Care Record ─────────────────────────────────
  invasiveLines: IcuInvasiveLine[] = [];
  carePlans: IcuNursingCarePlan[] = [];
  nurseNotes: IcuNurseNote[] = [];
  linesLoaded = false;
  carePlansLoaded = false;
  nurseNotesLoaded = false;

  readonly lineTypes: { value: IcuLineType; label: string }[] = [
    { value: 'peripheral', label: 'Peripheral line' },
    { value: 'central', label: 'Central line' },
    { value: 'arterial', label: 'Arterial line' },
    { value: 'hd-catheter', label: 'HD catheter' },
    { value: 'trach-et', label: 'Tracheostomy / ET tube' },
    { value: 'foley', label: 'Foley catheter' },
  ];
  readonly goalDefs: { key: keyof IcuNursingCarePlan; label: string }[] = [
    { key: 'goalPatentAirway', label: 'Maintain patent airway' },
    { key: 'goalAdequateOxygenation', label: 'Maintain adequate oxygenation' },
    { key: 'goalTissuePerfusion', label: 'Maintain tissue perfusion & hemodynamics' },
    { key: 'goalFluidBalance', label: 'Maintain fluid balance' },
    { key: 'goalPainRelief', label: 'Relief of pain and discomfort' },
    { key: 'goalNutrition', label: 'Maintain good nutritional status' },
    { key: 'goalPreventDvt', label: 'Prevent DVT' },
    { key: 'goalSkinIntegrity', label: 'Maintain skin integrity' },
    { key: 'goalActivityTolerance', label: 'Improve activity tolerance' },
    { key: 'goalPersonalHygiene', label: 'Maintain personal hygiene' },
    { key: 'goalEliminationNeed', label: 'Meet elimination need' },
    { key: 'goalSafety', label: 'Ensure safety' },
    { key: 'goalReduceAnxiety', label: 'Reduce anxiety' },
    { key: 'goalCommunication', label: 'Provide effective means of communication' },
    { key: 'goalPatientFamilyEducation', label: 'Patient and family education' },
  ];

  lineDraft: Partial<IcuInvasiveLine> = this.blankLine();
  carePlanModalOpen = false;
  carePlanDraft: Record<string, unknown> = this.blankCarePlan();
  carePlanRowDraft: CarePlanRow[] = [];
  noteDraft = { recordedAt: '', note: '', nurseName: '', nurseEmpNo: '' };

  private blankLine(): Partial<IcuInvasiveLine> {
    return { lineType: 'central', site: '', insertedAt: new Date().toISOString().slice(0, 16), notes: '' };
  }
  private blankCarePlan(): Record<string, unknown> {
    const o: Record<string, unknown> = { planDate: new Date().toISOString().slice(0, 10), shift: 'M', nurseName: '', nurseEmpNo: '' };
    for (const g of this.goalDefs) o[g.key as string] = false;
    return o;
  }

  loadLines(): void {
    this.svc.listInvasiveLines(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.invasiveLines = r.data ?? []; this.linesLoaded = true; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load lines'; },
    });
  }
  loadCarePlans(): void {
    this.svc.listCarePlans(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.carePlans = r.data ?? []; this.carePlansLoaded = true; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load care plans'; },
    });
  }
  loadNurseNotes(): void {
    this.svc.listNurseNotes(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.nurseNotes = r.data ?? []; this.nurseNotesLoaded = true; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load notes'; },
    });
  }

  /** Line-days = (removedAt ?? now) − insertedAt, in whole days (min 1). */
  lineDays(l: IcuInvasiveLine): number {
    const end = l.removedAt ? new Date(l.removedAt).getTime() : Date.now();
    const days = Math.floor((end - new Date(l.insertedAt).getTime()) / 86_400_000);
    return Math.max(days, 0) + 1;
  }

  addLine(): void {
    if (this.saving) return;
    if (!this.lineDraft.lineType || !this.lineDraft.insertedAt) { this.errorMessage = 'Line type and insertion date are required.'; return; }
    this.saving = true;
    this.svc.addInvasiveLine(this.admissionId, {
      ...this.lineDraft,
      insertedAt: new Date(this.lineDraft.insertedAt as string).toISOString(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.flash('Line added.'); this.lineDraft = this.blankLine(); this.loadLines(); },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to add line'; },
    });
  }
  async removeLineRow(l: IcuInvasiveLine, mode: 'remove' | 'delete'): Promise<void> {
    if (mode === 'remove') {
      // Mark the line removed (sets removedAt → freezes line-days).
      this.svc.updateInvasiveLine(l.id, { removedAt: new Date().toISOString() })
        .pipe(takeUntil(this.destroy$)).subscribe({ next: () => { this.flash('Line marked removed.'); this.loadLines(); } });
    } else {
      if (!await this.alertSvc.confirm('Delete this line entry?', { severity: 'danger', confirmLabel: 'Delete' })) return;
      this.svc.removeInvasiveLine(l.id).pipe(takeUntil(this.destroy$)).subscribe({ next: () => { this.flash('Deleted.'); this.loadLines(); } });
    }
  }

  openCarePlan(): void {
    this.carePlanDraft = this.blankCarePlan();
    this.carePlanRowDraft = [{ goal: '', planning: '', implementation: '', outcome: '' }];
    this.carePlanModalOpen = true;
  }
  addCarePlanRow(): void { this.carePlanRowDraft.push({ goal: '', planning: '', implementation: '', outcome: '' }); }
  removeCarePlanRow(i: number): void { this.carePlanRowDraft.splice(i, 1); }
  saveCarePlan(): void {
    if (this.saving) return;
    this.saving = true;
    const rows = this.carePlanRowDraft.filter((r) => r.goal || r.planning || r.implementation || r.outcome);
    this.svc.createCarePlan(this.admissionId, {
      ...(this.carePlanDraft as Partial<IcuNursingCarePlan>),
      carePlanRows: JSON.stringify(rows) as unknown as string,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.flash('Care plan saved.'); this.carePlanModalOpen = false; this.loadCarePlans(); },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to save care plan'; },
    });
  }
  async removeCarePlanEntry(p: IcuNursingCarePlan): Promise<void> {
    if (!await this.alertSvc.confirm('Delete this care plan?', { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.svc.removeCarePlan(p.id).pipe(takeUntil(this.destroy$)).subscribe({ next: () => { this.flash('Deleted.'); this.loadCarePlans(); } });
  }
  parseCarePlanRows(json: string | null): CarePlanRow[] {
    if (!json) return [];
    try { return JSON.parse(json) as CarePlanRow[]; } catch { return []; }
  }
  activeGoals(p: IcuNursingCarePlan): string[] {
    return this.goalDefs.filter((g) => (p as unknown as Record<string, boolean>)[g.key as string]).map((g) => g.label);
  }

  addNurseNote(): void {
    if (this.saving) return;
    if (!this.noteDraft.note.trim()) { this.errorMessage = 'Note text is required.'; return; }
    this.saving = true;
    this.svc.addNurseNote(this.admissionId, {
      recordedAt: this.noteDraft.recordedAt ? new Date(this.noteDraft.recordedAt).toISOString() : new Date().toISOString(),
      note: this.noteDraft.note.trim(),
      nurseName: this.noteDraft.nurseName.trim() || null,
      nurseEmpNo: this.noteDraft.nurseEmpNo.trim() || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.flash('Note added.'); this.noteDraft = { recordedAt: '', note: '', nurseName: '', nurseEmpNo: '' }; this.loadNurseNotes(); },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to add note'; },
    });
  }
  async removeNurseNoteRow(n: IcuNurseNote): Promise<void> {
    if (!await this.alertSvc.confirm('Delete this note?', { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.svc.removeNurseNote(n.id).pipe(takeUntil(this.destroy$)).subscribe({ next: () => { this.flash('Deleted.'); this.loadNurseNotes(); } });
  }
  lineTypeLabel(t: string): string { return this.lineTypes.find((x) => x.value === t)?.label ?? t; }

  flash(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => (this.successMessage = ''), 2500);
  }

  // ── Vitals ─────────────────────────────────────────────────────────
  saveVitals(): void {
    this.saving = true;
    this.svc.addVitals(this.admissionId, this.vitalsDraft).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.flash('Vitals recorded.');
        this.vitalsDraft = {
          intervalMinutes: 60, hr: null, sbp: null, dbp: null, rr: null, spo2: null,
          temp: null, gcs: null, ventilatorMode: null, fiO2: null, peep: null,
          abgPh: null, abgPco2: null, abgPo2: null, abgHco3: null,
          inotropes: null, notes: null,
        };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Save failed'; },
    });
  }

  // ── Progress notes ─────────────────────────────────────────────────
  saveProgressNote(): void {
    const d = this.progressDraft;
    if (!d.doctorName.trim() || !d.subjective.trim() || !d.objective.trim() || !d.assessment.trim() || !d.plan.trim()) {
      this.errorMessage = 'Doctor name and full SOAP are required'; return;
    }
    this.saving = true;
    this.svc.addProgressNote(this.admissionId, {
      doctorName: d.doctorName, subjective: d.subjective, objective: d.objective,
      assessment: d.assessment, plan: d.plan,
      sofaScore: d.sofaScore, apacheScore: d.apacheScore, gcsScore: d.gcsScore,
      trajectory: d.trajectory,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.flash('Progress note saved.');
        this.progressDraft = {
          doctorName: d.doctorName, // keep doctor name for next note
          subjective: '', objective: '', assessment: '', plan: '',
          sofaScore: null, apacheScore: null, gcsScore: null, trajectory: 'stable',
        };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Save failed'; },
    });
  }

  // ── Sedation ───────────────────────────────────────────────────────
  saveSedation(): void {
    const d = this.sedationDraft;
    if (d.rassScore === null && d.cpotScore === null) {
      this.errorMessage = 'Record at least one of RASS or CPOT';
      return;
    }
    this.saving = true;
    this.svc.addSedation(this.admissionId, {
      shift: d.shift, rassScore: d.rassScore, rassBehavior: d.rassBehavior || null,
      cpotScore: d.cpotScore, cpotBehavior: d.cpotBehavior || null,
      sedativeAgent: d.sedativeAgent || null, sedativeRate: d.sedativeRate || null,
      analgesicAgent: d.analgesicAgent || null, analgesicRate: d.analgesicRate || null,
      rassGoal: d.rassGoal, notes: d.notes || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.flash('Sedation log saved.');
        this.sedationDraft = {
          shift: d.shift,
          rassScore: null, rassBehavior: '',
          cpotScore: null, cpotBehavior: '',
          sedativeAgent: d.sedativeAgent, sedativeRate: d.sedativeRate,
          analgesicAgent: d.analgesicAgent, analgesicRate: d.analgesicRate,
          rassGoal: d.rassGoal, notes: '',
        };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Save failed'; },
    });
  }

  // ── Restraints ─────────────────────────────────────────────────────
  saveRestraint(): void {
    const d = this.restraintDraft;
    if (!d.orderedBy.trim() || !d.reason.trim()) {
      this.errorMessage = 'Ordering doctor and reason are required'; return;
    }
    this.saving = true;
    this.svc.addRestraint(this.admissionId, {
      orderedBy: d.orderedBy, reason: d.reason,
      restraintType: d.restraintType, bodyPart: d.bodyPart || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.flash('Restraint order saved.');
        this.restraintDraft = {
          orderedBy: d.orderedBy, reason: '',
          restraintType: 'physical-soft', bodyPart: '',
        };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Save failed'; },
    });
  }
  appendRestraintReview(restraint: IcuRestraintLog): void {
    const draft = this.reviewDrafts[restraint.id] ?? { status: 'continue' as const, notes: '' };
    this.svc.appendRestraintReview(restraint.id, draft).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.flash(draft.status === 'discontinue' ? 'Restraint discontinued.' : 'Review logged.');
        this.reviewDrafts[restraint.id] = { status: 'continue', notes: '' };
        this.load();
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Review failed'; },
    });
  }
  parseReviewLog(raw: string | null): IcuRestraintReviewEntry[] {
    if (!raw) return [];
    try { return JSON.parse(raw) as IcuRestraintReviewEntry[]; } catch { return []; }
  }

  // ── Bundles ────────────────────────────────────────────────────────
  saveBundle(): void {
    this.saving = true;
    this.svc.upsertBundle(this.admissionId, this.bundleDraft).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.flash('Bundle log saved.'); this.load(); },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Save failed'; },
    });
  }

  // ── Family communication ───────────────────────────────────────────
  saveFamilyComm(): void {
    const d = this.familyDraft;
    if (!d.participantName.trim() || !d.participantRelation.trim() || !d.topicsDiscussed.trim()) {
      this.errorMessage = 'Participant name, relation and topics are required'; return;
    }
    this.saving = true;
    this.svc.addFamilyComm(this.admissionId, {
      category: d.category, participantName: d.participantName,
      participantRelation: d.participantRelation,
      participantPhone: d.participantPhone || null,
      topicsDiscussed: d.topicsDiscussed,
      decisionsReached: d.decisionsReached || null,
      secondOpinionRequested: d.secondOpinionRequested,
      multiPartyMeeting: d.multiPartyMeeting,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.flash('Family communication logged.');
        this.familyDraft = {
          category: 'update',
          participantName: '', participantRelation: '', participantPhone: '',
          topicsDiscussed: '', decisionsReached: '',
          secondOpinionRequested: false, multiPartyMeeting: false,
        };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Save failed'; },
    });
  }

  // ── Step-down ──────────────────────────────────────────────────────
  proposeStepDown(): void {
    const d = this.stepDownDraft;
    if (!d.rationale.trim()) { this.errorMessage = 'Rationale is required'; return; }
    this.saving = true;
    this.svc.proposeStepDown(this.admissionId, {
      rationale: d.rationale, stepDownCriteriaMet: d.stepDownCriteriaMet,
      ongoingMeds: d.ongoingMeds || null,
      carryForwardOrders: d.carryForwardOrders || null,
      codeStatus: d.codeStatus,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.flash('Step-down proposed.');
        this.stepDownDraft = {
          rationale: '', stepDownCriteriaMet: false,
          ongoingMeds: '', carryForwardOrders: '', codeStatus: 'full-code',
        };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Propose failed'; },
    });
  }
  async acknowledgeStepDown(r: IcuStepDownRequest, accept: boolean): Promise<void> {
    let reason: string | undefined;
    if (!accept) {
      const entered = await this.alertSvc.prompt('Reason for declining?', { title: 'Decline step-down', placeholder: 'Reason…' });
      reason = entered ?? 'No reason given';
    }
    this.svc.acknowledgeStepDown(r.id, { accept, declineReason: reason }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.flash(accept ? 'Acknowledged.' : 'Declined.'); this.load(); },
      error: (e) => { this.errorMessage = e?.error?.message || 'Acknowledge failed'; },
    });
  }

  goBack(): void { this.router.navigate(['/ipd/admission', this.admissionId]); }

  // Convenience getters
  get isInIcu(): boolean { return !!this.payload?.admission?.icuAdmittedAt; }
  get latestProgress(): IcuProgressNote | null { return this.payload?.progressNotes[0] ?? null; }
  get activeRestraints(): IcuRestraintLog[] {
    return (this.payload?.restraints ?? []).filter((r) => !r.discontinuedAt);
  }
}
