import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ESignComponent } from '../../shared/ui/e-sign/e-sign.component';
import { SignatureCreateResponse } from '../../services/signature.service';
import {
  WardTransferService, WardTransferChecklist, ScheduleForTransfer,
} from '../../services/ward-transfer.service';

interface Item { key: string; label: string; }

/**
 * Phase 9.12 — UHJ "Pre-Operative Surgical Safety Checklist (Ward → OT)".
 *
 * Two route entry points, one component:
 *   /ipd/admission/:admissionId/ward-transfer  — ward nurse, IPD side
 *   /surgery-ot/:scheduleId/ward-transfer       — OT side
 *
 * When entered by admissionId, the component lists that admission's OT
 * schedules and lets the nurse pick one (auto-selects when there's only
 * one). Either way it resolves to a scheduleId, then loads/saves the
 * checklist for that schedule.
 */
@Component({
  selector: 'app-ot-ward-transfer-checklist',
  standalone: true,
  imports: [CommonModule, FormsModule, ESignComponent],
  templateUrl: './ot-ward-transfer-checklist.component.html',
  styleUrls: ['./ot-ward-transfer-checklist.component.css'],
})
export class OtWardTransferChecklistComponent implements OnInit, OnDestroy {
  // Resolved context
  scheduleId = '';
  admissionId = '';

  // When entered by admission, the picker list
  schedules: ScheduleForTransfer[] = [];
  showPicker = false;

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  checklist: WardTransferChecklist | null = null;

  // Local editable form — 45 booleans keyed by column name + 3 remark strings.
  form: Record<string, boolean> = {};
  wardRemarks = '';
  transferRemarks = '';
  otReceivingRemarks = '';
  wardNurseName = '';
  otReceivingNurseName = '';

  // ─── Checklist item metadata (label ↔ schema column) ─────────────────
  readonly wardItems: Item[] = [
    { key: 'identityBandChecked', label: 'Patient identity band checked' },
    { key: 'surgeryConsentSigned', label: 'Consent for surgery signed' },
    { key: 'anaesthesiaConsentSigned', label: 'Anaesthesia consent signed' },
    { key: 'surgicalSiteMarked', label: 'Surgical site marked by surgeon' },
    { key: 'preOpAssessmentCompleted', label: 'Pre-op assessment completed' },
    { key: 'allergyStatusChecked', label: 'Allergy status checked / documented' },
    { key: 'investigationsAvailable', label: 'Relevant investigations available' },
    { key: 'bloodGroupCrossMatchDone', label: 'Blood group & cross match done' },
    { key: 'bloodProductsArranged', label: 'Blood products arranged if required' },
    { key: 'vitalSignsRecorded', label: 'Vital signs recorded' },
    { key: 'ivLineSecured', label: 'IV line secured and patent' },
    { key: 'preOpMedicationsGiven', label: 'Pre-op medications given' },
    { key: 'antibioticAdministered', label: 'Antibiotic administered as ordered' },
    { key: 'fastingConfirmed', label: 'Fasting / NBM status confirmed' },
    { key: 'dentureRemoved', label: 'Denture removed' },
    { key: 'jewelleryRemoved', label: 'Jewellery removed' },
    { key: 'nailPolishMakeupRemoved', label: 'Nail polish / makeup removed' },
    { key: 'contactLensRemoved', label: 'Contact lens removed' },
    { key: 'prosthesisHearingAidRemoved', label: 'Prosthesis / hearing aid removed' },
    { key: 'urinaryCatheterSecured', label: 'Urinary catheter secured if present' },
    { key: 'skinPreparationCompleted', label: 'Skin preparation completed' },
    { key: 'operativeSiteCleanedShaved', label: 'Operative site cleaned / shaved if ordered' },
    { key: 'personalBelongingsHandedOver', label: 'Personal belongings handed over' },
    { key: 'caseSheetReportsSent', label: 'Case sheet & investigation reports sent' },
    { key: 'patientShiftedOnTrolleySafely', label: 'Patient shifted on trolley safely' },
  ];
  readonly transferItems: Item[] = [
    { key: 'sideRailsSecured', label: 'Side rails secured during transport' },
    { key: 'oxygenSupportProvided', label: 'Oxygen support provided if needed' },
    { key: 'emergencyDrugsEquipmentAccompanied', label: 'Emergency drugs / equipment accompanied if required' },
    { key: 'patientMonitoredDuringTransfer', label: 'Patient monitored during transfer' },
    { key: 'handoverGivenToOtNurse', label: 'Handover given to OT nurse' },
  ];
  readonly otReceivingItems: Item[] = [
    { key: 'otrIdentityReconfirmed', label: 'Patient identity reconfirmed' },
    { key: 'otrSurgerySiteConfirmed', label: 'Surgery and site confirmed' },
    { key: 'otrConsentVerified', label: 'Consent forms verified' },
    { key: 'otrAllergyChecked', label: 'Allergy checked' },
    { key: 'otrNbmReconfirmed', label: 'NBM status reconfirmed' },
    { key: 'otrInvestigationsAvailable', label: 'Investigations available' },
    { key: 'otrImplantsBloodConfirmed', label: 'Implants / blood availability confirmed' },
    { key: 'otrVitalSignsChecked', label: 'Vital signs checked' },
    { key: 'otrIvAccessPatent', label: 'IV access patent' },
    { key: 'otrPreOpMedicationsCompleted', label: 'Pre-op medications completed' },
    { key: 'otrSurgicalSiteMarkingVisible', label: 'Surgical site marking visible' },
    { key: 'otrJewelleryDentureRemoved', label: 'Jewellery / denture removed' },
    { key: 'otrFoleyCatheterDrainsChecked', label: 'Foley catheter / drains checked' },
    { key: 'otrSkinPreparationAdequate', label: 'Skin preparation adequate' },
    { key: 'otrPatientShiftedToOtTableSafely', label: 'Patient shifted safely to OT table' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private svc: WardTransferService,
    private location: Location,
  ) {}

  ngOnInit(): void {
    const pm = this.route.snapshot.paramMap;
    this.scheduleId = pm.get('scheduleId') ?? '';
    this.admissionId = pm.get('admissionId') ?? '';

    if (this.scheduleId) {
      this.loadChecklist();
    } else if (this.admissionId) {
      this.loadSchedulesForAdmission();
    } else {
      this.errorMessage = 'No schedule or admission specified.';
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  goBack(): void { this.location.back(); }

  // ─── Admission → schedule picker ─────────────────────────────────────

  private loadSchedulesForAdmission(): void {
    this.loading = true;
    this.svc.listByAdmission(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.schedules = r.data ?? [];
        this.loading = false;
        if (this.schedules.length === 1) {
          this.scheduleId = this.schedules[0].id;
          this.loadChecklist();
        } else if (this.schedules.length === 0) {
          this.errorMessage = 'No OT schedule found for this admission. Book the surgery first.';
        } else {
          this.showPicker = true;
        }
      },
      error: (e) => {
        this.loading = false;
        this.errorMessage = e?.error?.message ?? 'Failed to load OT schedules';
      },
    });
  }

  pickSchedule(id: string): void {
    this.scheduleId = id;
    this.showPicker = false;
    this.loadChecklist();
  }

  // ─── Load + hydrate ──────────────────────────────────────────────────

  private loadChecklist(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.get(this.scheduleId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.checklist = r.data;
        this.hydrate(r.data);
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.errorMessage = e?.error?.message ?? 'Failed to load checklist';
      },
    });
  }

  private allItems(): Item[] {
    return [...this.wardItems, ...this.transferItems, ...this.otReceivingItems];
  }

  private hydrate(c: WardTransferChecklist | null): void {
    this.form = {};
    for (const it of this.allItems()) {
      this.form[it.key] = c ? !!(c as unknown as Record<string, boolean>)[it.key] : false;
    }
    this.wardRemarks = c?.wardRemarks ?? '';
    this.transferRemarks = c?.transferRemarks ?? '';
    this.otReceivingRemarks = c?.otReceivingRemarks ?? '';
    this.wardNurseName = c?.wardNurseName ?? '';
    this.otReceivingNurseName = c?.otReceivingNurseName ?? '';
  }

  // ─── Save ────────────────────────────────────────────────────────────

  save(): void {
    if (this.saving || !this.scheduleId) return;
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const body: Record<string, boolean | string> = { ...this.form };
    body['wardRemarks'] = this.wardRemarks;
    body['transferRemarks'] = this.transferRemarks;
    body['otReceivingRemarks'] = this.otReceivingRemarks;
    this.svc.upsert(this.scheduleId, body as Partial<WardTransferChecklist>)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => {
          this.saving = false;
          this.checklist = r.data;
          this.successMessage = 'Checklist saved.';
        },
        error: (e) => {
          this.saving = false;
          this.errorMessage = e?.error?.message ?? 'Failed to save checklist';
        },
      });
  }

  // ─── Signatures ──────────────────────────────────────────────────────

  onWardNurseSigned(resp: SignatureCreateResponse): void {
    if (!this.wardNurseName.trim()) {
      this.errorMessage = 'Enter the ward nurse name before signing.';
      return;
    }
    // Persist current edits first so the signature locks a saved state.
    this.saving = true;
    const body: Record<string, boolean | string> = { ...this.form };
    body['wardRemarks'] = this.wardRemarks;
    body['transferRemarks'] = this.transferRemarks;
    body['otReceivingRemarks'] = this.otReceivingRemarks;
    this.svc.upsert(this.scheduleId, body as Partial<WardTransferChecklist>)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.svc.sign(this.scheduleId, 'ward', { signatureId: resp.id, signerName: this.wardNurseName.trim() })
            .pipe(takeUntil(this.destroy$)).subscribe({
              next: (r) => {
                this.saving = false;
                this.checklist = r.data;
                this.successMessage = 'Ward nurse signature recorded.';
              },
              error: (e) => {
                this.saving = false;
                this.errorMessage = e?.error?.message ?? 'Failed to record signature';
              },
            });
        },
        error: (e) => {
          this.saving = false;
          this.errorMessage = e?.error?.message ?? 'Failed to save before signing';
        },
      });
  }

  onOtNurseSigned(resp: SignatureCreateResponse): void {
    if (!this.otReceivingNurseName.trim()) {
      this.errorMessage = 'Enter the OT receiving nurse name before signing.';
      return;
    }
    this.saving = true;
    const body: Record<string, boolean | string> = { ...this.form };
    body['wardRemarks'] = this.wardRemarks;
    body['transferRemarks'] = this.transferRemarks;
    body['otReceivingRemarks'] = this.otReceivingRemarks;
    this.svc.upsert(this.scheduleId, body as Partial<WardTransferChecklist>)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.svc.sign(this.scheduleId, 'ot-receiving', { signatureId: resp.id, signerName: this.otReceivingNurseName.trim() })
            .pipe(takeUntil(this.destroy$)).subscribe({
              next: (r) => {
                this.saving = false;
                this.checklist = r.data;
                this.successMessage = 'OT receiving nurse signature recorded.';
              },
              error: (e) => {
                this.saving = false;
                this.errorMessage = e?.error?.message ?? 'Failed to record signature';
              },
            });
        },
        error: (e) => {
          this.saving = false;
          this.errorMessage = e?.error?.message ?? 'Failed to save before signing';
        },
      });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  get wardSigned(): boolean { return !!this.checklist?.wardNurseSignedAt; }
  get otSigned(): boolean { return !!this.checklist?.otReceivingNurseSignedAt; }

  sectionDone(items: Item[]): number {
    return items.filter((it) => this.form[it.key]).length;
  }
}
