import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  DieteticsService, DietMaster, MealTimeSlot, RoundsRow, localDateString,
  QUALITY_PARAMETERS, QUALITY_SCALE, qualityGrade, FoodQualityCheck,
  FEEDBACK_PARAMETERS, FEEDBACK_SCALE, DietFeedbackList,
} from '../../services/dietetics.service';
import { SignatureCreateResponse } from '../../services/signature.service';

/**
 * Quality & feedback — `/dietetics/quality`.
 *
 *   Food quality check — the dietary team rates a meal on 10 parameters
 *     (1 Unacceptable … 5 Excellent); total out of 50 gives the grade.
 *     Poor / Unacceptable needs a corrective action.
 *   Patient feedback — the Patient Dietary Service Feedback Form, filled at
 *     the bedside with the patient or attendant (rated 1 Poor … 5 Excellent,
 *     "served the correct prescribed diet?", comments, signature).
 */
@Component({
  selector: 'app-diet-quality',
  templateUrl: './diet-quality.component.html',
  styleUrls: ['../dietetics-shared.css', './diet-quality.component.css'],
})
export class DietQualityComponent implements OnInit, OnDestroy {
  tab: 'quality' | 'feedback' = 'quality';
  readonly qParams = QUALITY_PARAMETERS;
  readonly qScale = QUALITY_SCALE;
  readonly fParams = FEEDBACK_PARAMETERS;
  readonly fScale = FEEDBACK_SCALE;

  slots: MealTimeSlot[] = [];
  diets: DietMaster[] = [];
  patients: RoundsRow[] = [];

  // Quality check form + history.
  q = this.blankQuality();
  checks: FoodQualityCheck[] = [];
  // Feedback form + history.
  f = this.blankFeedback();
  signing = false;
  feedback: DietFeedbackList | null = null;

  from = localDateString(new Date(Date.now() - 6 * 86400000));
  to = localDateString();
  saving = false;
  errorMessage = '';
  successMessage = '';

  readonly username = typeof localStorage !== 'undefined' ? (localStorage.getItem('username') ?? '') : '';
  private destroy$ = new Subject<void>();

  constructor(private svc: DieteticsService) {}

  ngOnInit(): void {
    this.svc.listMealTimeSlots().pipe(takeUntil(this.destroy$)).subscribe({ next: (s) => { this.slots = s.filter((x) => x.isActive); } });
    this.svc.listDiets({ activeOnly: true }).pipe(takeUntil(this.destroy$)).subscribe({ next: (d) => { this.diets = d; } });
    this.loadChecks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(t: 'quality' | 'feedback'): void {
    this.tab = t;
    this.errorMessage = '';
    this.successMessage = '';
    if (t === 'feedback') {
      if (!this.patients.length) {
        this.svc.getRounds().pipe(takeUntil(this.destroy$)).subscribe({ next: (p) => { this.patients = p; } });
      }
      this.loadFeedback();
    } else {
      this.loadChecks();
    }
  }

  reload(): void { if (this.tab === 'quality') this.loadChecks(); else this.loadFeedback(); }

  // ─── Food quality check ───────────────────────────────────────────
  private blankQuality() {
    return {
      checkDate: localDateString(), mealTimeSlotId: '', dietMasterId: '', item: '',
      ratings: {} as Record<string, number>, observations: '', correctiveAction: '',
    };
  }
  get qRated(): number { return this.qParams.filter((p) => this.q.ratings[p.key]).length; }
  get qTotal(): number { return this.qParams.reduce((s, p) => s + (this.q.ratings[p.key] ?? 0), 0); }
  get qGrade(): string { return qualityGrade(this.qTotal); }
  gradeClass(g: string): string {
    return g === 'Excellent' || g === 'Very good' ? 'dx-pill-ok' : g === 'Satisfactory' ? 'dx-pill-info' : 'dx-pill-bad';
  }
  get qNeedsAction(): boolean { return this.qRated === this.qParams.length && (this.qGrade === 'Poor' || this.qGrade === 'Unacceptable'); }

  saveQuality(): void {
    this.errorMessage = '';
    if (this.qRated < this.qParams.length) { this.errorMessage = `Rate all ${this.qParams.length} parameters (${this.qRated} rated).`; return; }
    if (this.qNeedsAction && !this.q.correctiveAction.trim()) { this.errorMessage = `Grade is ${this.qGrade} — record the corrective action.`; return; }
    this.saving = true;
    this.svc.createQualityCheck({
      checkDate: this.q.checkDate,
      mealTimeSlotId: this.q.mealTimeSlotId || null,
      dietMasterId: this.q.dietMasterId || null,
      item: this.q.item.trim() || null,
      ratings: this.q.ratings,
      observations: this.q.observations.trim() || null,
      correctiveAction: this.q.correctiveAction.trim() || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.saving = false;
        this.successMessage = `Quality check saved — ${r.totalScore}/50, ${r.grade}.`;
        this.q = this.blankQuality();
        this.loadChecks();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }

  loadChecks(): void {
    this.svc.listQualityChecks(this.from, this.to).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.checks = r; },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load quality checks'; },
    });
  }
  get checksAverage(): number | null {
    return this.checks.length ? Math.round((this.checks.reduce((s, c) => s + c.totalScore, 0) / this.checks.length) * 10) / 10 : null;
  }

  // ─── Patient feedback ─────────────────────────────────────────────
  private blankFeedback() {
    return {
      admissionId: '', ratings: {} as Record<string, number>, correctDiet: null as boolean | null, comments: '',
      respondent: 'PATIENT' as 'PATIENT' | 'ATTENDANT', respondentName: '', staffName: this.username,
    };
  }
  get fRated(): number { return this.fParams.filter((p) => this.f.ratings[p.key]).length; }

  startFeedbackSign(): void {
    this.errorMessage = '';
    if (!this.f.admissionId) { this.errorMessage = 'Pick the patient.'; return; }
    if (this.fRated < this.fParams.length) { this.errorMessage = `Rate all ${this.fParams.length} items (${this.fRated} rated).`; return; }
    this.signing = true;
  }
  onFeedbackSigned(sig: SignatureCreateResponse | null): void {
    this.signing = false;
    this.saving = true;
    this.svc.createFeedback({
      admissionId: this.f.admissionId,
      ratings: this.f.ratings,
      correctDiet: this.f.correctDiet,
      comments: this.f.comments.trim() || null,
      respondent: this.f.respondent,
      respondentName: this.f.respondentName.trim() || null,
      signatureId: sig?.id ?? null,
      staffName: this.f.staffName.trim() || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.saving = false;
        this.successMessage = `Feedback saved — average ${r.averageScore}/5.`;
        this.f = this.blankFeedback();
        this.loadFeedback();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }
  loadFeedback(): void {
    this.svc.listFeedback(this.from, this.to).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.feedback = r; },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load feedback'; },
    });
  }
  patientLabel(p: RoundsRow): string {
    return `${p.bedNumber || '—'} · ${p.patientName || p.admissionNo} (PRN ${p.prn})`;
  }
  get selectedPatientName(): string {
    const p = this.patients.find((x) => x.admissionId === this.f.admissionId);
    return p?.patientName || 'Patient';
  }
}
