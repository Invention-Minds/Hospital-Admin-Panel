import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  OtImplant,
  OtSchedule,
  OtWorkflowService,
} from '../../services/ot-workflow.service';
import { SignatureCreateResponse } from '../../services/signature.service';

/**
 * Phase 11 — OT schedule detail page.
 *
 * Reachable at /surgery-ot/:id — shows the full clinical chain for one OT
 * booking with collapsible sections for Pre-op / WHO sign-in / Time-out /
 * Intra-op / Sign-out / PACU / Outcome.
 *
 * Each section becomes a separate collapsible card so the surgical team can
 * fill them in sequentially during the day.
 */
@Component({
  selector: 'app-ot-schedule-detail',
  templateUrl: './ot-schedule-detail.component.html',
  styleUrls: ['./ot-schedule-detail.component.css'],
})
export class OtScheduleDetailComponent implements OnInit, OnDestroy {
  scheduleId = '';
  schedule: OtSchedule | null = null;

  loading = true;
  errorMessage = '';
  successMessage = '';

  activeSection: 'pre-op' | 'sign-in' | 'time-out' | 'intra-op' | 'sign-out' | 'pacu' | 'outcome' = 'pre-op';

  // Pre-op form
  preOp = {
    fasting: false,
    fastingHours: null as number | null,
    groupTyped: false,
    crossMatched: false,
    internalUnitsReserved: null as number | null,
    externalUnitsReserved: null as number | null,
    preOpHemoglobin: null as number | null,
    surgeryClass: '' as string,
    anticipatedBloodLossMl: null as number | null,
    antibioticPlanned: false,
    antibioticName: '',
    prophylaxisGiven: false,
    surgicalSiteMarked: false,
    allergiesReviewed: false,
    allergiesNote: '',
    fitnessCleared: false,
    fitnessClearedBy: '',
    preAnaesthesiaNotes: '',
    signerName: '',
  };

  // Sign-in form
  signIn = {
    patientIdentityConfirmed: false,
    siteMarked: false,
    anaesthesiaSafetyChecked: false,
    pulseOximeterFunctional: false,
    knownAllergies: false,
    difficultAirwayRisk: false,
    bloodLossRisk: false,
    signInBy: '',
    // Phase 9.2 — UHJ/OTS/F-01 additions
    consentConfirmed: false,
    preopMedicationTaken: false,
    anaesthEquipSpo2: false,
    anaesthEquipNibp: false,
    anaesthEquipEcg: false,
    anaesthEquipBis: false,
    hypothermiaRisk: false,
    warmerInPlace: false,
    equipmentImplantsAvailable: false,
    allergyDescription: '',
    bloodLossArrangement: '',
    airwayRiskArrangement: '',
    // Phase 9.12 — UHJ Nursing Safety Checklist additions
    fastingStatusConfirmed: false,
    ivLineSecured: false,
    bloodAvailabilityChecked: false,
  };

  // Time-out form
  timeOut = {
    teamIntroduced: false,
    procedureConfirmed: false,
    antibioticAdministered: false,
    imagingDisplayed: false,
    criticalEventsAnticipated: false,
    timeOutBy: '',
    // Phase 9.2 — UHJ/OTS/F-01 additions
    antibioticName: '',
    vteProphylaxisProvided: false,
    anticipatedDurationMins: null as number | null,
    anticipatedBloodLossMl: null as number | null,
    bloodAvailable: false,
    glycemicControl: '',
    sterilityConcerns: '',
    anaesthetistConcerns: '',
    // Phase 9.12 — UHJ Nursing Safety Checklist additions
    correctPatientConfirmed: false,
    correctSiteConfirmed: false,
    sterilityConfirmed: false,
    instrumentsAvailable: false,
    spongeNeedleCountDone: false,
  };

  // Intra-op form
  intraOp = {
    startAt: '',
    endAt: '',
    anaesthesiaType: 'GA',
    surgeons: '',
    findings: '',
    procedureDone: '',
    bloodLossMl: null as number | null,
    fluidsMl: null as number | null,
    complications: '',
    implants: [] as OtImplant[],
    pendingImplantName: '',
    pendingImplantBatch: '',
    pendingImplantSerial: '',
    pendingImplantManufacturer: '',
    // Phase 9.2 — UHJ/OTS/F-03 additions
    noteNumber: 1,
    caseType: '' as '' | 'emergency' | 'routine' | 'unplanned-return',
    assistantsText: '',
    preOpDiagnosis: '',
    postOpDiagnosis: '',
    postOpDiagnosisSame: false,
    materialToLabHpe: '',
    materialToLabCis: '',
    materialToLabOthers: '',
    materialToSecurityMlc: '',
    drains: '',
    prosthesisLabel: '',
    significantIntraOpEvent: '',
    position: '',
    incision: '',
    procedureSteps: '',
    incisionAt: '',
    woundClosureAt: '',
    woundClosureDone: false,
    skinClosureDone: false,
    spongeInstrumentCountVerified: false,
    disposition: '' as '' | 'icu' | 'patient-room' | 'home',
  };

  // Sign-out form
  signOut = {
    procedureRecordedName: '',
    swabCount: false,
    swabCountInitial: null as number | null,
    swabCountFinal: null as number | null,
    instrumentCount: false,
    instrumentCountInitial: null as number | null,
    instrumentCountFinal: null as number | null,
    specimenLabelled: false,
    equipmentIssues: '',
    recoveryConcerns: '',
    signOutBy: '',
    // Phase 9.2 — UHJ/OTS/F-01 addition
    correctiveAction: '',
    // Phase 9.12 — UHJ Nursing Safety Checklist additions
    procedureCompletedConfirmed: false,
    postOpInstructionsGiven: false,
    patientShiftedSafely: false,
  };

  // PACU form
  pacu = {
    arrivalAt: '',
    arrivalHr: null as number | null,
    arrivalSbp: null as number | null,
    arrivalDbp: null as number | null,
    arrivalSpo2: null as number | null,
    arrivalRr: null as number | null,
    arrivalTemp: null as number | null,
    arrivalGcs: null as number | null,
    painScore: null as number | null,
    dischargedTo: 'ward' as 'ward' | 'icu' | 'home' | 'expired',
  };

  // Outcome form
  outcome = {
    unplannedReturn: false,
    linkedScheduleId: '',
    surgicalSiteInfection: false,
    ssiOrganism: '',
    ssiClassification: '' as '' | 'superficial' | 'deep' | 'organ-space',
    mortality: false,
    mortalityCause: '',
    lengthOfStayDays: null as number | null,
    followUpNotes: '',
  };

  saving = false;

  // Phase 9.5h — prior OT schedules for the same patient, used by the
  // Outcome panel's "Unplanned return to OT" dropdown so the user picks a
  // prior schedule by date+procedure instead of typing a UUID.
  priorSchedules: OtSchedule[] = [];

  // Phase 9.4b — multi-role 4-signer chain. The existing surgeon signer
  // uses the legacy onSignInSigned/onTimeOutSigned/onSignOutSigned
  // handlers; this `roleSignerName` map drives the 3 additional roles
  // per phase (anaesthetist / nurse / technician).
  roleSignerName: Record<'signIn' | 'timeOut' | 'signOut', Record<'anaesthetist' | 'nurse' | 'technician', string>> = {
    signIn:  { anaesthetist: '', nurse: '', technician: '' },
    timeOut: { anaesthetist: '', nurse: '', technician: '' },
    signOut: { anaesthetist: '', nurse: '', technician: '' },
  };

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private otService: OtWorkflowService,
  ) {}

  ngOnInit(): void {
    this.scheduleId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.scheduleId) {
      this.errorMessage = 'No schedule id in URL';
      this.loading = false;
      return;
    }
    this.refresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loading = true;
    this.otService.getSchedule(this.scheduleId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (sch) => {
        this.schedule = sch;
        this.adopt(sch);
        this.loadPriorSchedules(sch);
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Failed to load schedule';
        this.loading = false;
      },
    });
  }

  /** Fetch this patient's other OT schedules so the Outcome "Unplanned
   *  return to OT" field can offer them as a dropdown. */
  private loadPriorSchedules(sch: OtSchedule): void {
    if (!sch.prn) { this.priorSchedules = []; return; }
    this.otService.listSchedules({ prn: sch.prn, excludeId: sch.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          // Most recent first
          this.priorSchedules = rows.sort((a, b) => +new Date(b.date) - +new Date(a.date));
        },
        error: () => { this.priorSchedules = []; },
      });
  }

  /** Pull row data into the local forms so existing values pre-populate. */
  private adopt(s: OtSchedule): void {
    if (s.preOpChecklist) {
      const p = s.preOpChecklist;
      this.preOp = {
        fasting: p.fasting,
        fastingHours: p.fastingHours ?? null,
        groupTyped: p.groupTyped,
        crossMatched: p.crossMatched,
        internalUnitsReserved: p.internalUnitsReserved ?? null,
        externalUnitsReserved: p.externalUnitsReserved ?? null,
        preOpHemoglobin: p.preOpHemoglobin ?? null,
        surgeryClass: p.surgeryClass ?? '',
        anticipatedBloodLossMl: p.anticipatedBloodLossMl ?? null,
        antibioticPlanned: p.antibioticPlanned,
        antibioticName: p.antibioticName ?? '',
        prophylaxisGiven: p.prophylaxisGiven,
        surgicalSiteMarked: p.surgicalSiteMarked,
        allergiesReviewed: p.allergiesReviewed,
        allergiesNote: p.allergiesNote ?? '',
        fitnessCleared: p.fitnessCleared,
        fitnessClearedBy: p.fitnessClearedBy ?? '',
        preAnaesthesiaNotes: p.preAnaesthesiaNotes ?? '',
        signerName: '',
      };
    }
    // Phase 11 fix — pull the saved WHO safety checklist back into the
    // sign-in / time-out / sign-out forms so values reappear on reload.
    if (s.safetyChecklist) {
      const c = s.safetyChecklist;
      this.signIn = {
        patientIdentityConfirmed: c.patientIdentityConfirmed,
        siteMarked: c.siteMarked,
        anaesthesiaSafetyChecked: c.anaesthesiaSafetyChecked,
        pulseOximeterFunctional: c.pulseOximeterFunctional,
        knownAllergies: c.knownAllergies,
        difficultAirwayRisk: c.difficultAirwayRisk,
        bloodLossRisk: c.bloodLossRisk,
        signInBy: c.signInBy ?? '',
        consentConfirmed: c.consentConfirmed ?? false,
        preopMedicationTaken: c.preopMedicationTaken ?? false,
        anaesthEquipSpo2: c.anaesthEquipSpo2 ?? false,
        anaesthEquipNibp: c.anaesthEquipNibp ?? false,
        anaesthEquipEcg: c.anaesthEquipEcg ?? false,
        anaesthEquipBis: c.anaesthEquipBis ?? false,
        hypothermiaRisk: c.hypothermiaRisk ?? false,
        warmerInPlace: c.warmerInPlace ?? false,
        equipmentImplantsAvailable: c.equipmentImplantsAvailable ?? false,
        allergyDescription: c.allergyDescription ?? '',
        bloodLossArrangement: c.bloodLossArrangement ?? '',
        airwayRiskArrangement: c.airwayRiskArrangement ?? '',
        fastingStatusConfirmed: c.fastingStatusConfirmed ?? false,
        ivLineSecured: c.ivLineSecured ?? false,
        bloodAvailabilityChecked: c.bloodAvailabilityChecked ?? false,
      };
      this.timeOut = {
        teamIntroduced: c.teamIntroduced,
        procedureConfirmed: c.procedureConfirmed,
        antibioticAdministered: c.antibioticAdministered,
        imagingDisplayed: c.imagingDisplayed,
        criticalEventsAnticipated: c.criticalEventsAnticipated,
        timeOutBy: c.timeOutBy ?? '',
        antibioticName: c.antibioticName ?? '',
        vteProphylaxisProvided: c.vteProphylaxisProvided ?? false,
        anticipatedDurationMins: c.anticipatedDurationMins ?? null,
        anticipatedBloodLossMl: c.anticipatedBloodLossMl ?? null,
        bloodAvailable: c.bloodAvailable ?? false,
        glycemicControl: c.glycemicControl ?? '',
        sterilityConcerns: c.sterilityConcerns ?? '',
        anaesthetistConcerns: c.anaesthetistConcerns ?? '',
        correctPatientConfirmed: c.correctPatientConfirmed ?? false,
        correctSiteConfirmed: c.correctSiteConfirmed ?? false,
        sterilityConfirmed: c.sterilityConfirmed ?? false,
        instrumentsAvailable: c.instrumentsAvailable ?? false,
        spongeNeedleCountDone: c.spongeNeedleCountDone ?? false,
      };
      this.signOut = {
        procedureRecordedName: c.procedureRecordedName ?? '',
        swabCount: c.swabCount,
        swabCountInitial: c.swabCountInitial ?? null,
        swabCountFinal: c.swabCountFinal ?? null,
        instrumentCount: c.instrumentCount,
        instrumentCountInitial: c.instrumentCountInitial ?? null,
        instrumentCountFinal: c.instrumentCountFinal ?? null,
        specimenLabelled: c.specimenLabelled,
        equipmentIssues: c.equipmentIssues ?? '',
        recoveryConcerns: c.recoveryConcerns ?? '',
        signOutBy: c.signOutBy ?? '',
        correctiveAction: c.correctiveAction ?? '',
        procedureCompletedConfirmed: c.procedureCompletedConfirmed ?? false,
        postOpInstructionsGiven: c.postOpInstructionsGiven ?? false,
        patientShiftedSafely: c.patientShiftedSafely ?? false,
      };
    }
    // Phase 9.1c — relation is 1:N. Adopt the primary note (noteNumber=1)
    // into the form so the existing single-note UX still works.
    const primaryNote = s.intraOpNotes?.find((n) => n.noteNumber === 1) ?? s.intraOpNotes?.[0];
    if (primaryNote) {
      const n = primaryNote;
      let implants: OtImplant[] = [];
      try {
        implants = JSON.parse(n.implants ?? '[]');
      } catch { /* ignore */ }
      let assistantsText = '';
      try {
        const parsed = JSON.parse(n.assistants ?? '[]') as Array<{ name: string; role?: string }>;
        assistantsText = parsed.map((a) => a.role ? `${a.name} (${a.role})` : a.name).join(', ');
      } catch { /* ignore */ }
      this.intraOp = {
        startAt: n.startAt ? new Date(n.startAt).toISOString().slice(0, 16) : '',
        endAt: n.endAt ? new Date(n.endAt).toISOString().slice(0, 16) : '',
        anaesthesiaType: n.anaesthesiaType ?? 'GA',
        surgeons: n.surgeons ?? '',
        findings: n.findings ?? '',
        procedureDone: n.procedureDone ?? '',
        bloodLossMl: n.bloodLossMl ?? null,
        fluidsMl: n.fluidsMl ?? null,
        complications: n.complications ?? '',
        implants,
        pendingImplantName: '',
        pendingImplantBatch: '',
        pendingImplantSerial: '',
        pendingImplantManufacturer: '',
        // Phase 9.2 — F-03 additions
        noteNumber: n.noteNumber ?? 1,
        caseType: (n.caseType ?? '') as '' | 'emergency' | 'routine' | 'unplanned-return',
        assistantsText,
        preOpDiagnosis: n.preOpDiagnosis ?? '',
        postOpDiagnosis: n.postOpDiagnosis ?? '',
        postOpDiagnosisSame: n.postOpDiagnosisSame ?? false,
        materialToLabHpe: n.materialToLabHpe ?? '',
        materialToLabCis: n.materialToLabCis ?? '',
        materialToLabOthers: n.materialToLabOthers ?? '',
        materialToSecurityMlc: n.materialToSecurityMlc ?? '',
        drains: n.drains ?? '',
        prosthesisLabel: n.prosthesisLabel ?? '',
        significantIntraOpEvent: n.significantIntraOpEvent ?? '',
        position: n.position ?? '',
        incision: n.incision ?? '',
        procedureSteps: n.procedureSteps ?? '',
        incisionAt: n.incisionAt ? new Date(n.incisionAt).toISOString().slice(0, 16) : '',
        woundClosureAt: n.woundClosureAt ? new Date(n.woundClosureAt).toISOString().slice(0, 16) : '',
        woundClosureDone: n.woundClosureDone ?? false,
        skinClosureDone: n.skinClosureDone ?? false,
        spongeInstrumentCountVerified: n.spongeInstrumentCountVerified ?? false,
        disposition: (n.disposition ?? '') as '' | 'icu' | 'patient-room' | 'home',
      };
    }
  }

  selectSection(section: typeof this.activeSection): void {
    this.activeSection = section;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // ─── Pre-op ────────────────────────────────────────────────────────
  onPreOpSigned(resp: SignatureCreateResponse): void {
    this.saving = true;
    this.otService.upsertPreOp(this.scheduleId, {
      fasting: this.preOp.fasting,
      fastingHours: this.preOp.fastingHours ?? undefined,
      groupTyped: this.preOp.groupTyped,
      crossMatched: this.preOp.crossMatched,
      internalUnitsReserved: this.preOp.internalUnitsReserved ?? undefined,
      externalUnitsReserved: this.preOp.externalUnitsReserved ?? undefined,
      preOpHemoglobin: this.preOp.preOpHemoglobin ?? undefined,
      surgeryClass: this.preOp.surgeryClass?.trim() || undefined,
      anticipatedBloodLossMl: this.preOp.anticipatedBloodLossMl ?? undefined,
      antibioticPlanned: this.preOp.antibioticPlanned,
      antibioticName: this.preOp.antibioticName?.trim() || undefined,
      prophylaxisGiven: this.preOp.prophylaxisGiven,
      surgicalSiteMarked: this.preOp.surgicalSiteMarked,
      allergiesReviewed: this.preOp.allergiesReviewed,
      allergiesNote: this.preOp.allergiesNote?.trim() || undefined,
      fitnessCleared: this.preOp.fitnessCleared,
      fitnessClearedBy: this.preOp.fitnessClearedBy?.trim() || undefined,
      preAnaesthesiaNotes: this.preOp.preAnaesthesiaNotes?.trim() || undefined,
      signatureId: resp.id,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Pre-op checklist signed.';
        this.refresh();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.error || 'Failed to save pre-op';
      },
    });
  }

  // ─── WHO Sign-in ───────────────────────────────────────────────────
  onSignInSigned(resp: SignatureCreateResponse): void {
    if (!this.signIn.signInBy?.trim()) {
      this.errorMessage = 'Sign-in by name is required.';
      return;
    }
    this.saving = true;
    this.otService.signIn(this.scheduleId, {
      ...this.signIn,
      signInBy: this.signIn.signInBy.trim(),
      signInSignatureId: resp.id,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'WHO sign-in recorded.';
        this.refresh();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.error || 'Failed to record sign-in';
      },
    });
  }

  // ─── WHO Time-out ──────────────────────────────────────────────────
  onTimeOutSigned(resp: SignatureCreateResponse): void {
    if (!this.timeOut.timeOutBy?.trim()) {
      this.errorMessage = 'Time-out by name is required.';
      return;
    }
    this.saving = true;
    this.otService.timeOut(this.scheduleId, {
      ...this.timeOut,
      timeOutBy: this.timeOut.timeOutBy.trim(),
      timeOutSignatureId: resp.id,
      // Phase 9.2 — null → undefined to match TimeOutPayload optional shape
      anticipatedDurationMins: this.timeOut.anticipatedDurationMins ?? undefined,
      anticipatedBloodLossMl: this.timeOut.anticipatedBloodLossMl ?? undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'WHO time-out recorded.';
        this.refresh();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.error || 'Failed to record time-out';
      },
    });
  }

  // ─── Intra-op ──────────────────────────────────────────────────────
  addImplant(): void {
    if (!this.intraOp.pendingImplantName?.trim() || !this.intraOp.pendingImplantBatch?.trim()) {
      this.errorMessage = 'Implant name + batch are required.';
      return;
    }
    this.intraOp.implants.push({
      name: this.intraOp.pendingImplantName.trim(),
      batch: this.intraOp.pendingImplantBatch.trim(),
      serial: this.intraOp.pendingImplantSerial?.trim() || undefined,
      manufacturer: this.intraOp.pendingImplantManufacturer?.trim() || undefined,
    });
    this.intraOp.pendingImplantName = '';
    this.intraOp.pendingImplantBatch = '';
    this.intraOp.pendingImplantSerial = '';
    this.intraOp.pendingImplantManufacturer = '';
  }
  removeImplant(idx: number): void {
    this.intraOp.implants.splice(idx, 1);
  }

  /**
   * Append a picked name to a comma-separated intra-op string field
   * (surgeons / assistantsText), de-duped case-insensitively. Keeps the
   * backend payload (a single comma-sep string) unchanged.
   */
  appendName(field: 'surgeons' | 'assistantsText', name: string): void {
    const picked = (name || '').trim();
    if (!picked) return;
    const existing = (this.intraOp[field] || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => !!s);
    if (existing.some((s) => s.toLowerCase() === picked.toLowerCase())) return;
    existing.push(picked);
    this.intraOp[field] = existing.join(', ');
  }

  onIntraOpSigned(resp: SignatureCreateResponse): void {
    if (!this.intraOp.startAt) {
      this.errorMessage = 'Surgery start time is required.';
      return;
    }
    this.saving = true;
    // Phase 9.2 — parse assistants free-text ("Name (role), Name 2") into the
    // backend's expected array. Empty entries get dropped.
    const assistants = this.intraOp.assistantsText
      .split(',').map((s) => s.trim()).filter(Boolean)
      .map((entry) => {
        const m = entry.match(/^(.+?)\s*\((.+)\)$/);
        return m ? { name: m[1].trim(), role: m[2].trim() } : { name: entry };
      });
    this.otService.upsertIntraOp(this.scheduleId, {
      startAt: new Date(this.intraOp.startAt).toISOString(),
      endAt: this.intraOp.endAt ? new Date(this.intraOp.endAt).toISOString() : undefined,
      anaesthesiaType: this.intraOp.anaesthesiaType,
      surgeons: this.intraOp.surgeons?.trim() || undefined,
      findings: this.intraOp.findings?.trim() || undefined,
      procedureDone: this.intraOp.procedureDone?.trim() || undefined,
      bloodLossMl: this.intraOp.bloodLossMl ?? undefined,
      fluidsMl: this.intraOp.fluidsMl ?? undefined,
      complications: this.intraOp.complications?.trim() || undefined,
      implants: this.intraOp.implants,
      signatureId: resp.id,
      // Phase 9.2 — F-03 fields
      noteNumber: this.intraOp.noteNumber || 1,
      caseType: this.intraOp.caseType || null,
      assistants,
      preOpDiagnosis: this.intraOp.preOpDiagnosis?.trim() || undefined,
      postOpDiagnosis: this.intraOp.postOpDiagnosis?.trim() || undefined,
      postOpDiagnosisSame: this.intraOp.postOpDiagnosisSame,
      materialToLabHpe: this.intraOp.materialToLabHpe?.trim() || undefined,
      materialToLabCis: this.intraOp.materialToLabCis?.trim() || undefined,
      materialToLabOthers: this.intraOp.materialToLabOthers?.trim() || undefined,
      materialToSecurityMlc: this.intraOp.materialToSecurityMlc?.trim() || undefined,
      drains: this.intraOp.drains?.trim() || undefined,
      prosthesisLabel: this.intraOp.prosthesisLabel?.trim() || undefined,
      significantIntraOpEvent: this.intraOp.significantIntraOpEvent?.trim() || undefined,
      position: this.intraOp.position?.trim() || undefined,
      incision: this.intraOp.incision?.trim() || undefined,
      procedureSteps: this.intraOp.procedureSteps?.trim() || undefined,
      incisionAt: this.intraOp.incisionAt ? new Date(this.intraOp.incisionAt).toISOString() : undefined,
      woundClosureAt: this.intraOp.woundClosureAt ? new Date(this.intraOp.woundClosureAt).toISOString() : undefined,
      woundClosureDone: this.intraOp.woundClosureDone,
      skinClosureDone: this.intraOp.skinClosureDone,
      spongeInstrumentCountVerified: this.intraOp.spongeInstrumentCountVerified,
      disposition: this.intraOp.disposition || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Intra-op note signed.';
        this.refresh();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.error || 'Failed to save intra-op';
      },
    });
  }

  // ─── WHO Sign-out ──────────────────────────────────────────────────
  onSignOutSigned(resp: SignatureCreateResponse): void {
    if (!this.signOut.signOutBy?.trim() || !this.signOut.procedureRecordedName?.trim()) {
      this.errorMessage = 'Procedure name and sign-out by are required.';
      return;
    }
    this.saving = true;
    this.otService.signOut(this.scheduleId, {
      ...this.signOut,
      swabCountInitial: this.signOut.swabCountInitial ?? undefined,
      swabCountFinal: this.signOut.swabCountFinal ?? undefined,
      instrumentCountInitial: this.signOut.instrumentCountInitial ?? undefined,
      instrumentCountFinal: this.signOut.instrumentCountFinal ?? undefined,
      equipmentIssues: this.signOut.equipmentIssues?.trim() || undefined,
      recoveryConcerns: this.signOut.recoveryConcerns?.trim() || undefined,
      procedureRecordedName: this.signOut.procedureRecordedName.trim(),
      signOutBy: this.signOut.signOutBy.trim(),
      signOutSignatureId: resp.id,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'WHO sign-out recorded — patient safe to leave OT.';
        this.refresh();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.error || 'Failed to record sign-out';
      },
    });
  }

  // ─── PACU ──────────────────────────────────────────────────────────
  savePacuArrival(): void {
    this.saving = true;
    this.otService.upsertPacu(this.scheduleId, {
      arrivalAt: this.pacu.arrivalAt ? new Date(this.pacu.arrivalAt).toISOString() : undefined,
      arrivalHr: this.pacu.arrivalHr ?? undefined,
      arrivalSbp: this.pacu.arrivalSbp ?? undefined,
      arrivalDbp: this.pacu.arrivalDbp ?? undefined,
      arrivalSpo2: this.pacu.arrivalSpo2 ?? undefined,
      arrivalRr: this.pacu.arrivalRr ?? undefined,
      arrivalTemp: this.pacu.arrivalTemp ?? undefined,
      arrivalGcs: this.pacu.arrivalGcs ?? undefined,
      painScore: this.pacu.painScore ?? undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'PACU arrival saved.';
        this.refresh();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.error || 'Failed to save PACU arrival';
      },
    });
  }

  onPacuDischargeSigned(resp: SignatureCreateResponse): void {
    this.saving = true;
    this.otService.dischargeFromPacu(this.scheduleId, {
      dischargedTo: this.pacu.dischargedTo,
      dischargeCriteriaMet: true,
      signatureId: resp.id,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = `Patient discharged from PACU to ${this.pacu.dischargedTo}.`;
        this.refresh();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.error || 'Failed to discharge from PACU';
      },
    });
  }

  // ─── Outcome ───────────────────────────────────────────────────────
  saveOutcome(): void {
    this.saving = true;
    this.otService.upsertOutcome(this.scheduleId, {
      unplannedReturn: this.outcome.unplannedReturn,
      linkedScheduleId: this.outcome.linkedScheduleId?.trim() || undefined,
      surgicalSiteInfection: this.outcome.surgicalSiteInfection,
      ssiOrganism: this.outcome.ssiOrganism?.trim() || undefined,
      ssiClassification: this.outcome.ssiClassification || undefined,
      mortality: this.outcome.mortality,
      mortalityCause: this.outcome.mortalityCause?.trim() || undefined,
      lengthOfStayDays: this.outcome.lengthOfStayDays ?? undefined,
      followUpNotes: this.outcome.followUpNotes?.trim() || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Outcome saved.';
        this.refresh();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.error || 'Failed to save outcome';
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/surgery-ot']);
  }

  // ─── Section completion guards (unlock next sections) ──────────────
  get hasPreOp(): boolean { return !!this.schedule?.preOpChecklist?.signatureId; }
  get hasSignIn(): boolean { return !!this.schedule?.safetyChecklist?.signInSignatureId; }
  get hasTimeOut(): boolean { return !!this.schedule?.safetyChecklist?.timeOutSignatureId; }
  get hasIntraOp(): boolean { return !!this.schedule?.intraOpNotes?.find((n) => n.noteNumber === 1)?.signatureId; }
  /** Phase 9.2 — primary operative note (noteNumber=1) for the locked footer. */
  get primaryIntraOpNote() { return this.schedule?.intraOpNotes?.find((n) => n.noteNumber === 1) ?? null; }
  get hasSignOut(): boolean { return !!this.schedule?.safetyChecklist?.signOutSignatureId; }
  get hasPacuArrival(): boolean { return !!this.schedule?.pacuRecord?.arrivalAt; }
  get hasPacuDischarge(): boolean { return !!this.schedule?.pacuRecord?.dischargedAt; }
  get hasOutcome(): boolean { return !!this.schedule?.outcome; }

  /** Sign-in form is valid (we use this to gate the e-sign render). */
  get signInReady(): boolean {
    return !!this.signIn.signInBy?.trim();
  }
  get timeOutReady(): boolean {
    return !!this.timeOut.timeOutBy?.trim();
  }
  get signOutReady(): boolean {
    return !!this.signOut.signOutBy?.trim() &&
           !!this.signOut.procedureRecordedName?.trim() &&
           this.signOut.swabCount && this.signOut.instrumentCount;
  }
  get intraOpReady(): boolean {
    return !!this.intraOp.startAt;
  }

  // Phase 9.4b — multi-role signing helpers.
  /** Submit a non-surgeon role signature for a safety phase. */
  onRoleSigned(
    phase: 'signIn' | 'timeOut' | 'signOut',
    role: 'anaesthetist' | 'nurse' | 'technician',
    sig: SignatureCreateResponse,
  ): void {
    const name = this.roleSignerName[phase][role]?.trim();
    if (!name) {
      this.errorMessage = `${role} name is required to sign`;
      return;
    }
    this.saving = true;
    this.otService.signSafetyRole(this.scheduleId, phase, role, {
      signatureId: sig.id,
      signerName: name,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = `${role} signed ${phase}.`;
        this.refresh();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.error || `Failed to record ${role} signature`;
      },
    });
  }

  /** Has the given (phase, role) already been signed? */
  isRoleSigned(phase: 'signIn' | 'timeOut' | 'signOut', role: 'anaesthetist' | 'nurse' | 'technician'): boolean {
    const s = this.schedule?.safetyChecklist;
    if (!s) return false;
    const roleCap = role.charAt(0).toUpperCase() + role.slice(1);
    const key = `${phase}${roleCap}SignatureId` as keyof typeof s;
    return !!s[key];
  }

  roleSignedAt(phase: 'signIn' | 'timeOut' | 'signOut', role: 'anaesthetist' | 'nurse' | 'technician'): string | null | undefined {
    const s = this.schedule?.safetyChecklist;
    if (!s) return null;
    const roleCap = role.charAt(0).toUpperCase() + role.slice(1);
    const key = `${phase}${roleCap}At` as keyof typeof s;
    return s[key] as string | null | undefined;
  }

  roleSignedBy(phase: 'signIn' | 'timeOut' | 'signOut', role: 'anaesthetist' | 'nurse' | 'technician'): string | null | undefined {
    const s = this.schedule?.safetyChecklist;
    if (!s) return null;
    const roleCap = role.charAt(0).toUpperCase() + role.slice(1);
    const key = `${phase}${roleCap}By` as keyof typeof s;
    return s[key] as string | null | undefined;
  }
}
