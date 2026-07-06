import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ESignComponent } from '../../shared/ui/e-sign/e-sign.component';
import {
  IpdHandoverService,
  IpdHandover,
  HandoverPull,
  HandoverUpsertPayload,
  Shift,
} from '../../services/ipd-handover.service';
import { SignatureCreateResponse } from '../../services/signature.service';

/**
 * IPD per-admission Hand-off — `/ipd/admission/:admissionId/handover`.
 *
 * Layout:
 *   • Top: date + shift picker, status badge.
 *   • Live context panel — auto-pulled from source tables (drugs given this
 *     shift, drugs due, vitals today, I/O totals, allergies, co-morbidities,
 *     problems at admission). Refreshes on every load — receiving nurse
 *     always sees fresh data.
 *   • SBAR form — outgoing nurse fills the writable narrative fields.
 *   • Sign chain — outgoing nurse signs (handed-over), incoming nurse
 *     acknowledges (taken-over). Once acknowledged the row is read-only.
 */
@Component({
  selector: 'app-ipd-handover',
  standalone: true,
  imports: [CommonModule, FormsModule, ESignComponent],
  templateUrl: './ipd-handover.component.html',
  styleUrls: ['./ipd-handover.component.css'],
})
export class IpdHandoverComponent implements OnInit, OnDestroy {
  admissionId = '';
  chartDate = new Date().toISOString().slice(0, 10);
  shift: Shift = this.detectShift();

  pull: HandoverPull | null = null;
  current: IpdHandover | null = null;
  form: HandoverUpsertPayload = this.blankForm();
  saving = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private svc: IpdHandoverService,
  ) {}

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    this.load();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  /** Pick the shift the user most likely wants based on local time. */
  private detectShift(): Shift {
    const h = new Date().getHours();
    if (h >= 6 && h < 14) return 'M';
    if (h >= 14 && h < 22) return 'E';
    return 'N';
  }

  load(): void {
    if (!this.admissionId) return;
    this.loading = true;
    this.errorMessage = '';
    // Two fetches in parallel — live pull + the existing handover row (if any).
    this.svc.pull(this.admissionId, this.chartDate, this.shift)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (p) => { this.pull = p; },
        error: (e) => { this.errorMessage = e?.error?.error || 'Failed to pull context'; },
      });
    this.svc.list(this.admissionId, this.chartDate, this.chartDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          const match = rows.find((r) => r.shift === this.shift) ?? null;
          this.current = match;
          this.form = match ? this.hydrate(match) : this.blankForm();
          this.loading = false;
        },
        error: () => { this.loading = false; },
      });
  }

  get readOnly(): boolean {
    return this.current?.status === 'ACKNOWLEDGED';
  }
  get canHandOver(): boolean {
    return !!this.current && this.current.status === 'DRAFT' && !this.current.handedOverAt;
  }
  get canTakeOver(): boolean {
    return !!this.current && this.current.status === 'HANDED_OVER' && !this.current.takenOverAt;
  }

  saveDraft(): void {
    if (this.readOnly) return;
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.svc.upsert(this.admissionId, {
      ...this.form,
      chartDate: this.chartDate,
      shift: this.shift,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (row) => {
        this.current = row;
        this.saving = false;
        this.successMessage = 'Saved.';
      },
      error: (e) => {
        this.errorMessage = e?.error?.error || e?.error?.detail || 'Save failed';
        this.saving = false;
      },
    });
  }

  onHandedOverSigned(sig: SignatureCreateResponse): void {
    if (!this.current) return;
    this.svc.signHandedOver(this.admissionId, this.current.id, { signatureId: sig.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.successMessage = 'Outgoing nurse signed.'; this.load(); },
        error: (e) => { this.errorMessage = e?.error?.error || 'Sign failed'; },
      });
  }
  onTakenOverSigned(sig: SignatureCreateResponse): void {
    if (!this.current) return;
    this.svc.signTakenOver(this.admissionId, this.current.id, { signatureId: sig.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.successMessage = 'Incoming nurse acknowledged.'; this.load(); },
        error: (e) => { this.errorMessage = e?.error?.error || 'Acknowledge failed'; },
      });
  }

  setShift(s: Shift): void {
    this.shift = s;
    this.load();
  }

  // ─── Helpers ────────────────────────────────────────────────────────
  private hydrate(row: IpdHandover): HandoverUpsertPayload {
    return {
      chartDate: this.chartDate, shift: this.shift,
      postOpDay: row.postOpDay,
      diet: row.diet,
      ventilation: row.ventilation,
      invasiveLines: row.invasiveLines,
      infusionsTransfusions: row.infusionsTransfusions,
      puProphylaxis: row.puProphylaxis,
      dvtProphylaxis: row.dvtProphylaxis,
      painScale: row.painScale,
      gcsLoc: row.gcsLoc,
      skinIntegrity: row.skinIntegrity,
      restraints: row.restraints,
      fallRisk: row.fallRisk,
      adl: row.adl,
      ambulation: row.ambulation,
      criticalLabValues: row.criticalLabValues,
      currentProblems: row.currentProblems,
      investigationsOrdered: row.investigationsOrdered,
      reportsPending: row.reportsPending,
      referrals: row.referrals,
      nextShiftPriorities: row.nextShiftPriorities,
    };
  }

  private blankForm(): HandoverUpsertPayload {
    return { chartDate: this.chartDate, shift: this.shift };
  }
}
