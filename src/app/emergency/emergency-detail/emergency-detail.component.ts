import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { environment } from '../../../environment/environment.prod';
import {
  EmergencyInvestigation, EmergencyTreatment, EmergencyProcedure, EmergencySpecimen,
  EmergencyProgressNote, MlcCase, LamaRecord, DamaRecord, EmergencySubentitiesService,
} from '../../services/emergency-subentities.service';
import { ESignComponent } from '../../shared/ui/e-sign/e-sign.component';
import { EmergencyReferralService, EmergencyReferral } from '../../services/emergency-referral.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { Doctor } from '../../models/doctor.model';
import { AlertService } from '../../services/alert.service';
import { DoctorSelectComponent } from '../../shared/ui/doctor-select/doctor-select.component';
import { InvestigationOrderComponent } from '../../assessment/investigation-order/investigation-order.component';
import { PrescriptionCaptureComponent } from '../../shared/ui/prescription-capture/prescription-capture.component';
import { AuthServiceService } from '../../services/auth/auth-service.service';

// Form 5 (Phase 8) — minimal ER detail page that surfaces the four
// sub-entity grids from UHJ/EMR/F-01. Header pulls the Emergency
// summary; four sections list+add per resource.
//
// Route: /emergency/:id  (the intake component navigates here after create)

interface EmergencySummary {
  id: number;
  prn: string;
  patientPrn: string | null;
  patientName: string;
  phoneNumber: string | null;
  age: number | null;
  gender: string | null;
  allergies: string | null;
  triageCategory: string;
  status: string;
  // Intake assessment (UHJ/EMR/F-01) — surfaced read-only below.
  presentingComplaint: string | null;
  abcdeAssessment: string | null;
  traumaScore: number | null;
  vitalsBP: string | null;
  vitalsHR: number | null;
  vitalsRR: number | null;
  vitalsSpO2: number | null;
  vitalsTemp: number | null;
  proceduresDone: string | null;
  modeOfArrival: string | null;
  broughtBy: string | null;
  historyGivenBy: string | null;
  referralFrom: string | null;
  referredTo: string | null;
  identificationMark: string | null;
  policeInformationGiven: boolean | null;
  reasonsForMlc: string | null;
  painScore: number | null;
  airway: string | null;
  breathing: string | null;
  circulation: string | null;
  mentalStatus: string | null;
  pupilsRight: string | null;
  pupilsLeft: string | null;
  secondarySurvey: string | null;
  workingDiagnosis: string | null;
  conditionAtDisposition: string | null;
  disposition: string | null;
  handOffDoctorName: string | null;
  receivingDoctorName: string | null;
  handOffNurseName: string | null;
  receivingNurseName: string | null;
  oxygenFlowRate: number | null;
  oxygenDelivery: string | null;
}

interface DraftInvestigation {
  category: 'blood' | 'imaging' | 'ecg' | 'other';
  name: string;
}
interface DraftTreatment {
  drug: string; dose: string; route: string; frequency: string; givenAt: string; givenBy: string;
}
interface DraftProcedure {
  procedure: string; performedAt: string; notes: string;
}
interface DraftSpecimen {
  container: string; amount: string; handedOverTo: string;
}
// MLC draft — editable subset of MlcCase (consent / examiner signatures store blobUrl).
interface DraftMlc {
  caseType: 'accident' | 'assault' | 'poison' | 'burn' | 'other';
  status: 'documented' | 'examination-done' | 'samples-collected' | 'report-submitted' | 'closed';
  policeStationName: string;
  fir_No: string;
  fir_Date: string;
  investigatingOfficer: string;
  patientConsent: boolean;
  consentSignature: string;
  examinerName: string;
  examinerSignature: string;
  firstExaminationDone: boolean;
  injuries: string;
  photographsTaken: boolean;
  samplesCollected: string;
  sampleStorageInfo: string;
  finalReport: string;
  reportSubmittedTo: string;
  submissionDate: string;
}

// LAMA draft — signatures store the captured blobUrl.
interface DraftLama {
  lamaTime: string;
  doctorAdvice: string;
  riskExplained: boolean;
  reasonForLama: string;
  witnessName: string;
  patientSignature: string;
  witnessSignature: string;
}

// DAMA draft — signatures store the captured blobUrl.
interface DraftDama {
  dischargeTime: string;
  doctorRecommendation: string;
  patientDeclinesAdvice: boolean;
  followUpAdvice: string;
  witnessName: string;
  patientSignature: string;
  witnessSignature: string;
}

@Component({
  selector: 'app-emergency-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, DoctorSelectComponent, InvestigationOrderComponent, PrescriptionCaptureComponent, ESignComponent],
  templateUrl: './emergency-detail.component.html',
  styleUrls: ['./emergency-detail.component.css'],
})
export class EmergencyDetailComponent implements OnInit, OnDestroy {
  emergencyId = 0;
  loading = false;
  errorMessage = '';

  summary: EmergencySummary | null = null;
  investigations: EmergencyInvestigation[] = [];
  treatments: EmergencyTreatment[] = [];
  procedures: EmergencyProcedure[] = [];
  specimens: EmergencySpecimen[] = [];
  progressNotes: EmergencyProgressNote[] = [];

  // ── Draft buffers for the inline-add rows ──
  draftInv: DraftInvestigation = { category: 'blood', name: '' };
  draftTrt: DraftTreatment = { drug: '', dose: '', route: '', frequency: '', givenAt: '', givenBy: '' };
  draftProc: DraftProcedure = { procedure: 'iv-access', performedAt: '', notes: '' };
  draftSpec: DraftSpecimen = { container: '', amount: '', handedOverTo: '' };
  draftNote = { doctorName: '', observation: '', vitalsBP: '', vitalsHR: '', vitalsRR: '', vitalsSpO2: '', vitalsTemp: '' };
  savingNote = false;

  // ── MLC (Medico-Legal Case) ──
  mlc: MlcCase | null = null;
  mlcForm: DraftMlc = {
    caseType: 'accident', status: 'documented', policeStationName: '', fir_No: '', fir_Date: '',
    investigatingOfficer: '', patientConsent: false, consentSignature: '', examinerName: '',
    examinerSignature: '', firstExaminationDone: false,
    injuries: '', photographsTaken: false, samplesCollected: '', sampleStorageInfo: '',
    finalReport: '', reportSubmittedTo: '', submissionDate: '',
  };
  savingMlc = false;

  // ── Against Medical Advice (LAMA / DAMA) ──
  amaMode: 'LAMA' | 'DAMA' = 'LAMA';
  lama: LamaRecord | null = null;
  dama: DamaRecord | null = null;
  lamaForm: DraftLama = {
    lamaTime: '', doctorAdvice: '', riskExplained: false, reasonForLama: '',
    witnessName: '', patientSignature: '', witnessSignature: '',
  };
  damaForm: DraftDama = {
    dischargeTime: '', doctorRecommendation: '', patientDeclinesAdvice: false, followUpAdvice: '',
    witnessName: '', patientSignature: '', witnessSignature: '',
  };
  savingLama = false;
  savingDama = false;
  // Signature pads stay collapsed behind a "Capture" button.
  showLamaPatientSign = false;
  showLamaWitnessSign = false;
  showDamaPatientSign = false;
  showDamaWitnessSign = false;

  // ── Phase 9.19 — referrals ──
  referrals: EmergencyReferral[] = [];
  doctors: Doctor[] = [];
  draftReferral: { referredToDoctorId: number | null; reason: string } = { referredToDoctorId: null, reason: '' };
  savingReferral = false;
  referralError = '';

  readonly investigationCategories: ReadonlyArray<{ value: DraftInvestigation['category']; label: string }> = [
    { value: 'blood', label: 'Blood test' },
    { value: 'imaging', label: 'Imaging / Radiology' },
    { value: 'ecg', label: 'ECG' },
    { value: 'other', label: 'Other' },
  ];

  readonly procedureTypes: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'iv-access', label: 'IV access' },
    { value: 'rt-insertion', label: 'RT insertion' },
    { value: 'foleys', label: 'Foley\'s insertion' },
    { value: 'other', label: 'Other' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private sub: EmergencySubentitiesService,
    private referralSvc: EmergencyReferralService,
    private doctorSvc: DoctorServiceService,
    private alertSvc: AlertService,
    private authSvc: AuthServiceService,
  ) {}

  // Ordering/prescribing clinician for the embedded order + Rx components.
  // ER doesn't model a single treating doctor, so attribute to the logged-in user.
  get orderingDoctorId(): number | null { return this.authSvc.getUserId(); }
  get orderingDoctorName(): string { return this.authSvc.getUsername() ?? ''; }

  // ER Nurse (sub_admin) can open a case and record nursing tasks but must not
  // see doctor-only clinical-decision blocks (referral, MLC, LAMA/DAMA, Rx).
  get isErNurse(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return localStorage.getItem('role') === 'sub_admin'
      && localStorage.getItem('subAdminType') === 'ER Nurse';
  }

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id') ?? '';
    this.emergencyId = parseInt(idStr, 10);
    if (Number.isNaN(this.emergencyId) || !this.emergencyId) {
      this.errorMessage = 'Invalid emergency id';
      return;
    }
    this.loadSummary();
    this.loadAll();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private loadSummary(): void {
    this.loading = true;
    this.http
      .get<{ data: EmergencySummary }>(`${environment.apiUrl}/emergency/${this.emergencyId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => { this.summary = res?.data ?? null; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load case'; this.loading = false; },
      });
  }

  private loadAll(): void {
    this.sub.listInvestigations(this.emergencyId).pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => (this.investigations = r) });
    this.sub.listTreatments(this.emergencyId).pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => (this.treatments = r) });
    this.sub.listProcedures(this.emergencyId).pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => (this.procedures = r) });
    this.sub.listSpecimens(this.emergencyId).pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => (this.specimens = r) });
    this.sub.listProgressNotes(this.emergencyId).pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => (this.progressNotes = r) });
    this.sub.getMlc(this.emergencyId).pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => this.applyMlc(r) });
    this.sub.getLama(this.emergencyId).pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => this.applyLama(r) });
    this.sub.getDama(this.emergencyId).pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => this.applyDama(r) });
    this.loadReferrals();
    this.doctorSvc.getActiveDoctors().pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => (this.doctors = Array.isArray(r) ? r : []) });
  }

  // ─── MLC (Medico-Legal Case) ───────────────────────────────────────────
  // Patch the draft form from a saved row (null = no MLC yet → keep defaults).
  private applyMlc(row: MlcCase | null): void {
    this.mlc = row;
    if (!row) return;
    const dateOnly = (v: string | null): string => (v ? v.slice(0, 10) : '');
    this.mlcForm = {
      caseType: row.caseType,
      status: row.status,
      policeStationName: row.policeStationName ?? '',
      fir_No: row.fir_No ?? '',
      fir_Date: dateOnly(row.fir_Date),
      investigatingOfficer: row.investigatingOfficer ?? '',
      patientConsent: row.patientConsent,
      consentSignature: row.consentSignature ?? '',
      examinerName: row.examinerName ?? '',
      examinerSignature: row.examinerSignature ?? '',
      firstExaminationDone: row.firstExaminationDone,
      injuries: row.injuries ?? '',
      photographsTaken: row.photographsTaken,
      samplesCollected: row.samplesCollected ?? '',
      sampleStorageInfo: row.sampleStorageInfo ?? '',
      finalReport: row.finalReport ?? '',
      reportSubmittedTo: row.reportSubmittedTo ?? '',
      submissionDate: dateOnly(row.submissionDate),
    };
  }

  saveMlc(): void {
    if (this.savingMlc || !this.mlcForm.injuries.trim() || !this.mlcForm.caseType) return;
    this.savingMlc = true;
    const body: Partial<MlcCase> = {
      caseType: this.mlcForm.caseType,
      status: this.mlcForm.status,
      policeStationName: this.mlcForm.policeStationName.trim() || null,
      fir_No: this.mlcForm.fir_No.trim() || null,
      fir_Date: this.mlcForm.fir_Date || null,
      investigatingOfficer: this.mlcForm.investigatingOfficer.trim() || null,
      patientConsent: this.mlcForm.patientConsent,
      consentSignature: this.mlcForm.consentSignature || null,
      examinerName: this.mlcForm.examinerName.trim() || null,
      examinerSignature: this.mlcForm.examinerSignature || null,
      firstExaminationDone: this.mlcForm.firstExaminationDone,
      injuries: this.mlcForm.injuries.trim(),
      photographsTaken: this.mlcForm.photographsTaken,
      samplesCollected: this.mlcForm.samplesCollected.trim() || null,
      sampleStorageInfo: this.mlcForm.sampleStorageInfo.trim() || null,
      finalReport: this.mlcForm.finalReport.trim() || null,
      reportSubmittedTo: this.mlcForm.reportSubmittedTo.trim() || null,
      submissionDate: this.mlcForm.submissionDate || null,
    };
    this.sub.saveMlc(this.emergencyId, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.mlc = row;
          this.savingMlc = false;
          this.alertSvc.show(`MLC record saved (${row.mlcNo}).`, { title: 'Saved' });
        },
        error: (e) => {
          this.savingMlc = false;
          this.alertSvc.show(e?.error?.message || 'Failed to save MLC record', { title: 'Error', severity: 'danger' });
        },
      });
  }

  // ─── Against Medical Advice (LAMA / DAMA) ──────────────────────────────
  // Slice ISO datetimes to the `yyyy-MM-ddThh:mm` form datetime-local expects.
  private dtLocal(v: string | null): string { return v ? v.slice(0, 16) : ''; }

  private applyLama(row: LamaRecord | null): void {
    this.lama = row;
    if (!row) return;
    this.lamaForm = {
      lamaTime: this.dtLocal(row.lamaTime),
      doctorAdvice: row.doctorAdvice ?? '',
      riskExplained: row.riskExplained,
      reasonForLama: row.reasonForLama ?? '',
      witnessName: row.witnessName ?? '',
      patientSignature: row.patientSignature ?? '',
      witnessSignature: row.witnessSignature ?? '',
    };
  }

  private applyDama(row: DamaRecord | null): void {
    this.dama = row;
    if (!row) return;
    this.damaForm = {
      dischargeTime: this.dtLocal(row.dischargeTime),
      doctorRecommendation: row.doctorRecommendation ?? '',
      patientDeclinesAdvice: row.patientDeclinesAdvice,
      followUpAdvice: row.followUpAdvice ?? '',
      witnessName: row.witnessName ?? '',
      patientSignature: row.patientSignature ?? '',
      witnessSignature: row.witnessSignature ?? '',
    };
  }

  saveLama(): void {
    if (this.savingLama || !this.lamaForm.doctorAdvice.trim() || !this.lamaForm.reasonForLama.trim()) return;
    this.savingLama = true;
    const body: Partial<LamaRecord> = {
      lamaTime: this.lamaForm.lamaTime || undefined,
      doctorAdvice: this.lamaForm.doctorAdvice.trim(),
      riskExplained: this.lamaForm.riskExplained,
      reasonForLama: this.lamaForm.reasonForLama.trim(),
      witnessName: this.lamaForm.witnessName.trim() || null,
      patientSignature: this.lamaForm.patientSignature || null,
      witnessSignature: this.lamaForm.witnessSignature || null,
    };
    this.sub.saveLama(this.emergencyId, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.lama = row;
          this.savingLama = false;
          this.alertSvc.show('LAMA form saved.', { title: 'Saved' });
        },
        error: (e) => {
          this.savingLama = false;
          this.alertSvc.show(e?.error?.message || 'Failed to save LAMA form', { title: 'Error', severity: 'danger' });
        },
      });
  }

  saveDama(): void {
    if (this.savingDama || !this.damaForm.doctorRecommendation.trim()) return;
    this.savingDama = true;
    const body: Partial<DamaRecord> = {
      dischargeTime: this.damaForm.dischargeTime || undefined,
      doctorRecommendation: this.damaForm.doctorRecommendation.trim(),
      patientDeclinesAdvice: this.damaForm.patientDeclinesAdvice,
      followUpAdvice: this.damaForm.followUpAdvice.trim() || null,
      witnessName: this.damaForm.witnessName.trim() || null,
      patientSignature: this.damaForm.patientSignature || null,
      witnessSignature: this.damaForm.witnessSignature || null,
    };
    this.sub.saveDama(this.emergencyId, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.dama = row;
          this.savingDama = false;
          this.alertSvc.show('DAMA form saved.', { title: 'Saved' });
        },
        error: (e) => {
          this.savingDama = false;
          this.alertSvc.show(e?.error?.message || 'Failed to save DAMA form', { title: 'Error', severity: 'danger' });
        },
      });
  }

  // ─── Phase 9.19 — Referral to doctor / surgeon ─────────────────────────
  private loadReferrals(): void {
    this.referralSvc.list(this.emergencyId).pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => (this.referrals = r.data ?? []) });
  }

  createReferral(): void {
    this.referralError = '';
    if (!this.draftReferral.referredToDoctorId) { this.referralError = 'Pick a doctor/surgeon to refer to.'; return; }
    this.savingReferral = true;
    this.referralSvc.create(this.emergencyId, {
      referredToDoctorId: this.draftReferral.referredToDoctorId,
      reason: this.draftReferral.reason.trim() || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.referrals = [r.data, ...this.referrals];
        this.draftReferral = { referredToDoctorId: null, reason: '' };
        this.savingReferral = false;
      },
      error: (e) => { this.savingReferral = false; this.referralError = e?.error?.message || 'Failed to create referral'; },
    });
  }

  acknowledgeReferral(ref: EmergencyReferral): void {
    this.referralSvc.acknowledge(ref.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => this.replaceReferral(r.data),
      error: (e) => { this.referralError = e?.error?.message || 'Failed to acknowledge'; },
    });
  }

  async cancelReferral(ref: EmergencyReferral): Promise<void> {
    if (!await this.alertSvc.confirm('Cancel this referral?', { severity: 'warning' })) return;
    this.referralSvc.cancel(ref.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => this.replaceReferral(r.data),
      error: (e) => { this.referralError = e?.error?.message || 'Failed to cancel'; },
    });
  }

  private replaceReferral(row: EmergencyReferral): void {
    this.referrals = this.referrals.map((r) => (r.id === row.id ? { ...r, ...row } : r));
  }

  // ─── Progress notes / serial vitals ────────────────────────────────────
  private toNum(v: string): number | null {
    const t = (v ?? '').trim();
    return t === '' ? null : Number(t);
  }
  addProgressNote(): void {
    if (!this.draftNote.doctorName.trim() || !this.draftNote.observation.trim()) return;
    this.savingNote = true;
    const body = {
      doctorName: this.draftNote.doctorName.trim(),
      observation: this.draftNote.observation.trim(),
      vitalsBP: this.draftNote.vitalsBP.trim() || null,
      vitalsHR: this.toNum(this.draftNote.vitalsHR),
      vitalsRR: this.toNum(this.draftNote.vitalsRR),
      vitalsSpO2: this.toNum(this.draftNote.vitalsSpO2),
      vitalsTemp: this.toNum(this.draftNote.vitalsTemp),
    } as Partial<EmergencyProgressNote>;
    this.sub.addProgressNote(this.emergencyId, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.progressNotes = [row, ...this.progressNotes];
          this.draftNote = { doctorName: '', observation: '', vitalsBP: '', vitalsHR: '', vitalsRR: '', vitalsSpO2: '', vitalsTemp: '' };
          this.savingNote = false;
        },
        error: () => { this.savingNote = false; },
      });
  }

  // ─── Investigations ────────────────────────────────────────────────────
  addInvestigation(): void {
    if (!this.draftInv.name.trim()) return;
    this.sub.createInvestigation(this.emergencyId, { ...this.draftInv, name: this.draftInv.name.trim() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => { this.investigations = [row, ...this.investigations]; this.draftInv = { category: 'blood', name: '' }; },
      });
  }
  markSent(row: EmergencyInvestigation): void {
    this.sub.updateInvestigation(this.emergencyId, row.id, { sentAt: new Date().toISOString() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => this.replace('investigations', r) });
  }
  markReported(row: EmergencyInvestigation): void {
    this.sub.updateInvestigation(this.emergencyId, row.id, { reportedAt: new Date().toISOString() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => this.replace('investigations', r) });
  }
  async removeInvestigation(row: EmergencyInvestigation): Promise<void> {
    if (!await this.alertSvc.confirm('Delete this investigation row?', { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.sub.deleteInvestigation(this.emergencyId, row.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => { this.investigations = this.investigations.filter(r => r.id !== row.id); } });
  }

  // ─── Treatments ────────────────────────────────────────────────────────
  addTreatment(): void {
    if (!this.draftTrt.drug.trim()) return;
    const body = {
      drug: this.draftTrt.drug.trim(),
      dose: this.draftTrt.dose.trim() || null,
      route: this.draftTrt.route.trim() || null,
      frequency: this.draftTrt.frequency.trim() || null,
      givenAt: this.draftTrt.givenAt || null,
      givenBy: this.draftTrt.givenBy.trim() || null,
    } as Partial<EmergencyTreatment>;
    this.sub.createTreatment(this.emergencyId, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.treatments = [row, ...this.treatments];
          this.draftTrt = { drug: '', dose: '', route: '', frequency: '', givenAt: '', givenBy: '' };
        },
      });
  }
  async removeTreatment(row: EmergencyTreatment): Promise<void> {
    if (!await this.alertSvc.confirm('Delete this treatment row?', { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.sub.deleteTreatment(this.emergencyId, row.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => { this.treatments = this.treatments.filter(r => r.id !== row.id); } });
  }

  // ─── Procedures ────────────────────────────────────────────────────────
  addProcedure(): void {
    if (!this.draftProc.procedure.trim()) return;
    const body = {
      procedure: this.draftProc.procedure.trim(),
      performedAt: this.draftProc.performedAt || undefined,
      notes: this.draftProc.notes.trim() || null,
    } as Partial<EmergencyProcedure>;
    this.sub.createProcedure(this.emergencyId, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.procedures = [row, ...this.procedures];
          this.draftProc = { procedure: 'iv-access', performedAt: '', notes: '' };
        },
      });
  }
  async removeProcedure(row: EmergencyProcedure): Promise<void> {
    if (!await this.alertSvc.confirm('Delete this procedure row?', { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.sub.deleteProcedure(this.emergencyId, row.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => { this.procedures = this.procedures.filter(r => r.id !== row.id); } });
  }

  // ─── Specimens ─────────────────────────────────────────────────────────
  addSpecimen(): void {
    const body = {
      container: this.draftSpec.container.trim() || null,
      amount: this.draftSpec.amount.trim() || null,
      handedOverTo: this.draftSpec.handedOverTo.trim() || null,
    } as Partial<EmergencySpecimen>;
    this.sub.createSpecimen(this.emergencyId, body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.specimens = [row, ...this.specimens];
          this.draftSpec = { container: '', amount: '', handedOverTo: '' };
        },
      });
  }
  signHandover(row: EmergencySpecimen): void {
    this.sub.updateSpecimen(this.emergencyId, row.id, { handedOverAt: new Date().toISOString() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => this.replace('specimens', r) });
  }
  async removeSpecimen(row: EmergencySpecimen): Promise<void> {
    if (!await this.alertSvc.confirm('Delete this specimen row?', { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.sub.deleteSpecimen(this.emergencyId, row.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => { this.specimens = this.specimens.filter(r => r.id !== row.id); } });
  }

  // ─── Generic replace helper for in-place updates ───────────────────────
  private replace(
    bucket: 'investigations' | 'treatments' | 'specimens',
    row: { id: number },
  ): void {
    const list = this[bucket] as Array<{ id: number }>;
    this[bucket] = list.map((r) => (r.id === row.id ? row : r)) as never;
  }
}
