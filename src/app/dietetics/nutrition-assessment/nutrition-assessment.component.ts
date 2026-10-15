import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  DieteticsService,
  NutritionRecord,
  ScreeningForm,
  SCREENING_FORM_LABEL,
  DietHistoryEvent,
} from '../../services/dietetics.service';
import { SignatureCreateResponse } from '../../services/signature.service';

/** Maternal checklist — the printed form's 15 risk lines (keys match the server). */
export const MATERNAL_RISKS: Array<{ key: string; label: string }> = [
  { key: 'underweight', label: 'Underweight (BMI < 18.5 kg/m²)' },
  { key: 'overweightObesity', label: 'Overweight / obesity (BMI ≥ 23 kg/m²)' },
  { key: 'inadequateGwg', label: 'Inadequate gestational weight gain' },
  { key: 'excessiveGwg', label: 'Excessive gestational weight gain' },
  { key: 'anemia', label: 'Haemoglobin < 11 g/dL (anaemia)' },
  { key: 'poorIntakeOrHyperemesis', label: 'Poor oral intake (> 5 days) or hyperemesis gravidarum' },
  { key: 'diabetes', label: 'GDM or pre-existing diabetes' },
  { key: 'renal', label: 'Renal disorder' },
  { key: 'pihPreeclampsia', label: 'PIH / pre-eclampsia' },
  { key: 'hypothyroidism', label: 'Hypothyroidism' },
  { key: 'iugr', label: 'Intra-uterine growth restriction (IUGR)' },
  { key: 'multiplePregnancy', label: 'Multiple pregnancy' },
  { key: 'oligohydramnios', label: 'Oligohydramnios' },
  { key: 'polyhydramnios', label: 'Polyhydramnios' },
  { key: 'others', label: 'Others' },
];

/**
 * Nutrition screening & notes for one admission — `/dietetics/nutrition/:admissionId`.
 * The hospital's forms, filled on screen and scored by the server:
 *   NRS-2002 (adult) · STAMP (paediatric) · Maternal · Re-assessment.
 * Pre-filled from the doctor's initial assessment (weight, height, diet
 * pattern, food allergy, complaints, pregnancy weeks).
 */
@Component({
  selector: 'app-nutrition-assessment',
  templateUrl: './nutrition-assessment.component.html',
  styleUrls: ['../dietetics-shared.css', './nutrition-assessment.component.css'],
})
export class NutritionAssessmentComponent implements OnInit, OnDestroy {
  admissionId = '';
  record: NutritionRecord | null = null;
  history: DietHistoryEvent[] = [];
  formType: ScreeningForm = 'NRS2002';
  readonly formLabel = SCREENING_FORM_LABEL;
  readonly formTypes = Object.keys(SCREENING_FORM_LABEL) as ScreeningForm[];
  readonly maternalRisks = MATERNAL_RISKS;

  // Common anthropometry + requirements.
  common = {
    weightKg: null as number | null, heightCm: null as number | null, ibwKg: null as number | null,
    energyKcal: null as number | null, proteinG: null as number | null, fluidMl: null as number | null,
    otherNutrients: '', intervention: '',
  };
  nrs = {
    dietAdvisedOnAdmission: '', presentComplaints: '', pastHistory: '', foodAllergy: '', foodPreference: '',
    initial: { bmiBelow205: false, weightLoss3m: false, reducedIntake: false, severelyIll: false },
    nutritionScore: null as number | null, severityScore: null as number | null, drugNutrientInteraction: '',
  };
  stamp = {
    headCircumferenceCm: null as number | null, dietPrescription: '', symptoms: [] as string[], intakeRoute: 'Oral',
    foodAllergies: '', supplements: '', dietPattern: '', indicators: [] as string[],
    diagnosisScore: null as number | null, intakeScore: null as number | null, anthroScore: null as number | null,
    abnormalBcp: '',
  };
  maternal = {
    gravida: '', para: '', gestationalWeeks: null as number | null, dietPrescription: '', appetite: '', appetiteReason: '',
    foodAllergy: '', dietPattern: '', supplements: '', pastHistory: '', medications: '',
    biochem: { hb: '', rbsFbs: '', hba1c: '', ferritin: '', b12: '', vitD: '', others: '' },
    clinical: [] as string[], hydration: 'Adequate', prePregnancyWeightKg: null as number | null,
    gwgStatus: '', weightGainKg: null as number | null, riskFactors: [] as string[], severeCondition: false,
    counselling: '',
  };
  reassess = { changesInBcp: '', changeInIntake: '', changeInDiagnosis: '', weightTrend: '', dietAdvised: '' };

  readonly stampSymptoms = ['Appetite change', 'Swallowing difficulty', 'Vomiting', 'Nausea', 'Loose stools'];
  readonly stampIndicators = ['Stunting', 'Underweight / wasting', 'Overweight', 'Obesity', 'Oedema', 'Ascites'];
  readonly maternalClinical = ['Pallor', 'Edema', 'Nausea / vomiting', 'Constipation', 'Reflux'];

  signingAssessment = false;
  noteText = '';
  signingNote = false;
  loading = false;
  errorMessage = '';
  successMessage = '';
  readonly username = typeof localStorage !== 'undefined' ? (localStorage.getItem('username') ?? '') : '';

  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private svc: DieteticsService) {}

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    if (!this.admissionId) return;
    this.loading = true;
    this.svc.getNutrition(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.record = r;
        this.formType = r.suggestedForm;
        this.prefill();
        this.loading = false;
      },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load nutrition record'; this.loading = false; },
    });
    this.svc.getDietHistory(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (h) => { this.history = h.slice().reverse(); },
      error: () => { /* swallow */ },
    });
  }

  /** Last dietitian measurement, else the doctor's initial assessment. */
  private prefill(): void {
    const r = this.record;
    if (!r) return;
    const last = r.assessments.find((a) => a.weightKg || a.heightCm);
    const ia = r.patient.ia;
    this.common.weightKg = last?.weightKg ?? ia?.weightKg ?? null;
    this.common.heightCm = last?.heightCm ?? ia?.heightCm ?? null;
    const diet = r.dietOnAdmission ?? '';
    this.nrs.dietAdvisedOnAdmission = diet;
    this.stamp.dietPrescription = diet;
    this.maternal.dietPrescription = diet;
    this.nrs.presentComplaints = ia?.chiefComplaints ?? '';
    const allergy = ia?.allergyOthers ?? (ia?.foodAllergy ? 'Food allergy (see initial assessment)' : '');
    this.nrs.foodAllergy = allergy;
    this.stamp.foodAllergies = allergy;
    this.maternal.foodAllergy = allergy;
    this.nrs.foodPreference = ia?.dietPattern ?? '';
    this.stamp.dietPattern = ia?.dietPattern ?? '';
    this.maternal.dietPattern = ia?.dietPattern ?? '';
    this.maternal.gestationalWeeks = ia?.pregnancyWeeks ?? null;
    this.nrs.initial.bmiBelow205 = this.bmi !== null && this.bmi < 20.5;
  }

  get bmi(): number | null {
    const { weightKg: w, heightCm: h } = this.common;
    return w && h ? Math.round((w / ((h / 100) ** 2)) * 10) / 10 : null;
  }
  get prePregBmi(): number | null {
    const w = this.maternal.prePregnancyWeightKg;
    const h = this.common.heightCm;
    return w && h ? Math.round((w / ((h / 100) ** 2)) * 10) / 10 : null;
  }
  get prePregBmiCategory(): string {
    const b = this.prePregBmi;
    if (b === null) return '';
    if (b < 18.5) return 'Underweight';
    if (b < 23) return 'Normal';
    if (b < 25) return 'Overweight';
    if (b < 30) return 'Obese I';
    return 'Obese II';
  }
  private ageYears(): number | null {
    const a = this.record?.patient.age;
    if (!a) return null;
    const n = Number.parseFloat(a.replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  /** Same scoring as the server — shown live; the server's result is what's saved. */
  get preview(): { score: number | null; level: string; note: string } {
    if (this.formType === 'NRS2002') {
      const i = this.nrs.initial;
      if (!(i.bmiBelow205 || i.weightLoss3m || i.reducedIntake || i.severelyIll)) {
        return { score: 0, level: 'NIL', note: 'All NO — re-screen weekly' };
      }
      if (this.nrs.nutritionScore === null || this.nrs.severityScore === null) {
        return { score: null, level: '—', note: 'A YES answer — complete the final screening' };
      }
      const age = this.ageYears();
      const total = this.nrs.nutritionScore + this.nrs.severityScore + (age !== null && age >= 70 ? 1 : 0);
      const level = total === 0 ? 'NIL' : total === 1 ? 'MILD' : total === 2 ? 'MODERATE' : 'SEVERE';
      return {
        score: total, level,
        note: `${age !== null && age >= 70 ? 'Includes +1 for age ≥ 70. ' : ''}${total >= 3 ? 'At risk — start a nutritional care plan.' : 'Re-screen weekly.'}`,
      };
    }
    if (this.formType === 'STAMP') {
      const s = this.stamp;
      if (s.diagnosisScore === null || s.intakeScore === null || s.anthroScore === null) {
        return { score: null, level: '—', note: 'Score all three items' };
      }
      const total = s.diagnosisScore + s.intakeScore + s.anthroScore;
      return { score: total, level: total >= 4 ? 'HIGH' : total >= 2 ? 'MEDIUM' : 'LOW', note: 'Repeat screening after 3 days' };
    }
    if (this.formType === 'MATERNAL') {
      const total = this.maternal.riskFactors.length;
      const level = this.maternal.severeCondition || total >= 4 ? 'HIGH' : total >= 2 ? 'MODERATE' : 'LOW';
      return { score: total, level, note: `${total} / 15 risk factors${this.maternal.severeCondition ? ' · severe condition' : ''}` };
    }
    return { score: null, level: '—', note: 'Re-assessment is not scored' };
  }

  toggle(list: string[], value: string): void {
    const i = list.indexOf(value);
    if (i >= 0) list.splice(i, 1); else list.push(value);
  }

  private answers(): Record<string, unknown> {
    switch (this.formType) {
      case 'NRS2002': return { ...this.nrs };
      case 'STAMP': return { ...this.stamp };
      case 'MATERNAL': return { ...this.maternal, prePregnancyBmi: this.prePregBmi, prePregnancyBmiCategory: this.prePregBmiCategory };
      default: return { ...this.reassess };
    }
  }

  onAssessmentSigned(sig: SignatureCreateResponse): void {
    this.svc.createAssessment({
      admissionId: this.admissionId,
      formType: this.formType,
      weightKg: this.common.weightKg,
      heightCm: this.common.heightCm,
      ibwKg: this.common.ibwKg,
      answers: this.answers(),
      energyKcal: this.common.energyKcal,
      proteinG: this.common.proteinG,
      fluidMl: this.common.fluidMl,
      otherNutrients: this.common.otherNutrients,
      intervention: this.common.intervention,
      signatureId: sig.id,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (a) => {
        this.signingAssessment = false;
        this.successMessage = `${this.formLabel[a.formType]} saved — ${a.riskLevel ?? 'recorded'}${a.riskScore !== null ? ' (score ' + a.riskScore + ')' : ''}${a.nextScreeningDue ? '. Next screening due ' + new Date(a.nextScreeningDue).toLocaleDateString() : ''}.`;
        this.load();
      },
      error: (e) => { this.signingAssessment = false; this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }

  onNoteSigned(sig: SignatureCreateResponse): void {
    if (!this.noteText.trim()) { this.signingNote = false; return; }
    this.svc.createNote({ admissionId: this.admissionId, note: this.noteText, signatureId: sig.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.signingNote = false; this.noteText = ''; this.successMessage = 'Note added.'; this.load(); },
        error: (e) => { this.signingNote = false; this.errorMessage = e?.error?.error || 'Save failed'; },
      });
  }
}
