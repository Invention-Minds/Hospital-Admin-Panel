import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  IcuTransferRequest,
  IcuTransferService,
} from '../../services/icu-transfer.service';
import { SignatureCreateResponse } from '../../services/signature.service';

/**
 * Phase 5 (WF-4) — Per-admission ICU Transfer screen.
 *
 * Reachable from the admission tab strip at
 *   /ipd/admission/:admissionId/icu-transfer
 *
 * Behaviour:
 *   • If there is no open transfer for this admission → show the propose form
 *     (proposing doctor signs as originator).
 *   • If a request exists → render its current state and timeline (read-only
 *     here; intensivist + ICU charge nurse act on it from the queue screen).
 */
@Component({
  selector: 'app-icu-transfer',
  templateUrl: './icu-transfer.component.html',
  styleUrls: ['./icu-transfer.component.css'],
})
export class IcuTransferComponent implements OnInit, OnDestroy {
  admissionId = '';

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  /** Phase 9.6 — drives the "Open ICU Workbench" banner. */
  latestStatus: string | null = null;

  transfers: IcuTransferRequest[] = [];
  activeTransfer: IcuTransferRequest | null = null;

  // Propose-form state. Field names mirror ProposeIcuTransferPayload.
  proposeForm = {
    rationale: '',
    vitalsSnapshot: '',
    linesAndDrains: '',
    codeStatus: '' as '' | 'full-code' | 'DNR' | 'DNI' | 'comfort-care',
    sedationPlan: '',
    proposerName: '',
  };

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private icuService: IcuTransferService,
  ) {}

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    if (!this.admissionId) {
      this.errorMessage = 'admissionId is required';
      this.loading = false;
      return;
    }
    this.refresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private refresh(): void {
    this.loading = true;
    this.icuService
      .list({ admissionId: this.admissionId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          this.transfers = rows;
          // Active = first row that isn't COMPLETED or DECLINED.
          this.activeTransfer = rows.find(
            (r) => r.status !== 'COMPLETED' && r.status !== 'DECLINED',
          ) ?? null;
          // Phase 9.6 — surface the most recent status so the template can
          // show the "Open ICU Workbench" banner once a transfer is COMPLETED.
          this.latestStatus = rows[0]?.status ?? null;
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err?.error?.error || 'Failed to load ICU transfers';
          this.loading = false;
        },
      });
  }

  /** True when the form has the minimum fields the backend will accept. */
  get canProposeSign(): boolean {
    return (
      !this.activeTransfer &&
      this.proposeForm.rationale.trim().length >= 10 &&
      !!this.proposeForm.proposerName.trim()
    );
  }

  // The proposing doctor signs at the bottom of the form. <app-e-sign> posts
  // the SignatureBlob and emits its id; we use that id to create the transfer.
  onProposerSigned(resp: SignatureCreateResponse): void {
    if (this.saving) return;
    this.saving = true;
    this.errorMessage = '';
    this.icuService
      .propose({
        admissionId: this.admissionId,
        rationale: this.proposeForm.rationale.trim(),
        vitalsSnapshot: this.proposeForm.vitalsSnapshot?.trim() || undefined,
        linesAndDrains: this.proposeForm.linesAndDrains?.trim() || undefined,
        codeStatus: this.proposeForm.codeStatus || undefined,
        sedationPlan: this.proposeForm.sedationPlan?.trim() || undefined,
        proposerName: this.proposeForm.proposerName.trim(),
        proposerSignatureId: resp.id,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.saving = false;
          this.activeTransfer = row;
          this.transfers = [row, ...this.transfers];
          this.successMessage =
            'Transfer request raised. Intensivist will be notified to acknowledge.';
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.error || 'Failed to raise ICU transfer';
        },
      });
  }

  // ─── View helpers ────────────────────────────────────────────────────
  pillClass(status: string): string {
    switch (status) {
      case 'PROPOSED': return 'pill pill-proposed';
      case 'ACKNOWLEDGED': return 'pill pill-acknowledged';
      case 'DECLINED': return 'pill pill-declined';
      case 'ACCEPTED': return 'pill pill-accepted';
      case 'IN_TRANSIT': return 'pill pill-transit';
      case 'COMPLETED': return 'pill pill-completed';
      default: return 'pill';
    }
  }
}
