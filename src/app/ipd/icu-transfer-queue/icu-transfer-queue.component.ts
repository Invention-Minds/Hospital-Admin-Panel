import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import {
  IcuTransferRequest,
  IcuTransferService,
} from '../../services/icu-transfer.service';
import {
  Bed,
  Ward,
  WardManagementService,
} from '../../services/ward-management.service';
import { SignatureCreateResponse } from '../../services/signature.service';
import { IpdService, IpdAdmission } from '../../services/ipd.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';

/**
 * Phase 5 (WF-4) — ICU Transfer queue.
 *
 * Drives the second and third signatures of the WF-4 chain:
 *   Tab 1 — "Awaiting acknowledgement" (PROPOSED) → intensivist signs.
 *   Tab 2 — "Ready for ICU" (ACKNOWLEDGED) → ICU charge nurse picks bed + signs.
 *   Tab 3 — "In-flight" (ACCEPTED / IN_TRANSIT) → ICU nurse marks transit + completes.
 *
 * Polls every 20s. All field names mirror the backend payload shapes one-for-one.
 */
@Component({
  selector: 'app-icu-transfer-queue',
  templateUrl: './icu-transfer-queue.component.html',
  styleUrls: ['./icu-transfer-queue.component.css'],
})
export class IcuTransferQueueComponent implements OnInit, OnDestroy {
  loading = true;
  errorMessage = '';

  awaitingAck: IcuTransferRequest[] = [];
  readyForIcu: IcuTransferRequest[] = [];
  inFlight: IcuTransferRequest[] = [];
  // Phase 9.6 — admissions currently in ICU (post-completion of the transfer)
  inIcu: IpdAdmission[] = [];

  activeTab: 'awaiting' | 'ready' | 'inflight' | 'in-icu' = 'awaiting';

  // Per-row inline panel state (only one row open at a time per tab).
  expandedId: string | null = null;

  // Acknowledge panel
  ackOutcome: 'ACKNOWLEDGED' | 'DECLINED' = 'ACKNOWLEDGED';
  intensivistName = '';
  declineReason = '';
  ackSubmitting = false;

  // Accept panel — ICU charge nurse picks the destination bed.
  icuWards: Ward[] = [];
  icuBeds: Bed[] = [];
  selectedWardId = '';
  selectedBedId = '';
  receiverNote = '';
  acceptSubmitting = false;
  // ICU charge nurse name — used as signerName for the accept e-sign and the
  // in-flight complete e-sign. Not persisted server-side (the backend stamps
  // acceptedBy/closedBy from req.user) but required by <app-e-sign> for the
  // signature blob's signerName field.
  chargeNurseName = '';

  // Complete panel
  completeSubmitting = false;

  private destroy$ = new Subject<void>();
  private pollHandle: ReturnType<typeof setInterval> | null = null;

  // Doctor scope — when a doctor views this, the queue is limited to their own
  // patients (matched by the admission's admittingDoctor name).
  private isDoctor = false;
  private doctorName = '';
  private rawAwaiting: IcuTransferRequest[] = [];
  private rawReady: IcuTransferRequest[] = [];
  private rawInFlight: IcuTransferRequest[] = [];
  private rawInIcu: IpdAdmission[] = [];

  constructor(
    private icuService: IcuTransferService,
    private wardService: WardManagementService,
    private ipdService: IpdService,
    private doctorService: DoctorServiceService,
  ) {}

  ngOnInit(): void {
    this.resolveDoctorScope();
    this.refresh();
    this.loadIcuWards();
    this.loadInIcu();
    this.pollHandle = setInterval(() => { this.refresh(true); this.loadInIcu(); }, 20_000);
  }

  /** Resolve the viewing doctor's name so the queue can be scoped to them. */
  private resolveDoctorScope(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    this.isDoctor = (localStorage.getItem('role') || '') === 'doctor';
    if (!this.isDoctor) return;
    const userId = Number(localStorage.getItem('userid') || '0');
    if (!userId) return;
    this.doctorService.getDoctorByUserId(userId)
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe((doc: any) => { this.doctorName = doc?.name ?? ''; this.applyScope(); });
  }

  /** Re-derive the visible lists from the raw lists + doctor scope. */
  private applyScope(): void {
    if (this.isDoctor && this.doctorName) {
      const n = this.doctorName.trim().toLowerCase();
      const reqMine = (r: IcuTransferRequest) =>
        (r.admission?.admittingDoctor || '').trim().toLowerCase() === n;
      this.awaitingAck = this.rawAwaiting.filter(reqMine);
      this.readyForIcu = this.rawReady.filter(reqMine);
      this.inFlight = this.rawInFlight.filter(reqMine);
      this.inIcu = this.rawInIcu.filter((a) => (a.admittingDoctor || '').trim().toLowerCase() === n);
    } else {
      this.awaitingAck = this.rawAwaiting;
      this.readyForIcu = this.rawReady;
      this.inFlight = this.rawInFlight;
      this.inIcu = this.rawInIcu;
    }
  }

  /** Phase 9.6 — fetch admissions currently in ICU (post-completion). */
  private loadInIcu(): void {
    this.ipdService.getInIcuAdmissions()
      .pipe(takeUntil(this.destroy$), catchError(() => of([] as IpdAdmission[])))
      .subscribe((rows) => { this.rawInIcu = rows; this.applyScope(); });
  }

  ngOnDestroy(): void {
    if (this.pollHandle) clearInterval(this.pollHandle);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private refresh(quiet = false): void {
    if (!quiet) this.loading = true;

    // We fetch all relevant statuses in parallel and bin them.
    const statuses: Array<IcuTransferRequest['status']> = [
      'PROPOSED', 'ACKNOWLEDGED', 'ACCEPTED', 'IN_TRANSIT',
    ];
    const buckets: Record<string, IcuTransferRequest[]> = {};
    let pending = statuses.length;
    statuses.forEach((status) => {
      this.icuService
        .list({ status })
        .pipe(
          takeUntil(this.destroy$),
          catchError(() => of([] as IcuTransferRequest[])),
        )
        .subscribe((rows) => {
          buckets[status] = rows;
          pending -= 1;
          if (pending === 0) {
            this.rawAwaiting = buckets['PROPOSED'] ?? [];
            this.rawReady = buckets['ACKNOWLEDGED'] ?? [];
            this.rawInFlight = [
              ...(buckets['ACCEPTED'] ?? []),
              ...(buckets['IN_TRANSIT'] ?? []),
            ];
            this.applyScope();
            this.loading = false;
          }
        });
    });
  }

  private loadIcuWards(): void {
    this.wardService
      .getAllWards()
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of([] as Ward[])),
      )
      .subscribe((wards) => {
        // ICU wards — heuristic: department or wardName contains "ICU".
        this.icuWards = (wards ?? []).filter((w) => {
          const blob = `${w.department || ''} ${w.wardName || ''}`.toLowerCase();
          return blob.includes('icu') || blob.includes('intensive');
        });
        // Fallback: if none flagged, expose all wards so the user isn't blocked.
        if (this.icuWards.length === 0) this.icuWards = wards ?? [];
      });
  }

  selectTab(tab: 'awaiting' | 'ready' | 'inflight' | 'in-icu'): void {
    this.activeTab = tab;
    this.expandedId = null;
  }

  /** Phase 9.6 — compute ICU day from icuAdmittedAt for display. */
  icuDayOf(a: IpdAdmission): number | null {
    if (!a.icuAdmittedAt) return null;
    const ms = Date.now() - new Date(a.icuAdmittedAt).getTime();
    return Math.max(1, Math.floor(ms / (24 * 60 * 60 * 1000)) + 1);
  }

  // ─── Per-row expand/collapse ─────────────────────────────────────────
  toggleRow(row: IcuTransferRequest): void {
    if (this.expandedId === row.id) {
      this.expandedId = null;
      return;
    }
    this.expandedId = row.id;
    this.ackOutcome = 'ACKNOWLEDGED';
    this.intensivistName = '';
    this.declineReason = '';
    this.chargeNurseName = '';
    this.selectedWardId = row.toWardId ?? '';
    this.selectedBedId = '';
    this.icuBeds = [];
    if (this.selectedWardId) this.loadBeds(this.selectedWardId);
  }

  // ─── Intensivist acknowledge / decline ──────────────────────────────
  onAckSigned(row: IcuTransferRequest, resp: SignatureCreateResponse): void {
    this.ackSubmitting = true;
    this.icuService
      .acknowledge(row.id, {
        outcome: 'ACKNOWLEDGED',
        intensivistName: this.intensivistName?.trim() || undefined,
        intensivistSignatureId: resp.id,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.ackSubmitting = false;
          this.expandedId = null;
          this.refresh();
        },
        error: (err) => {
          this.ackSubmitting = false;
          this.errorMessage = err?.error?.error || 'Failed to acknowledge';
        },
      });
  }

  submitDecline(row: IcuTransferRequest): void {
    if (!this.declineReason || this.declineReason.trim().length < 5) {
      this.errorMessage = 'Decline reason (min 5 chars) is required.';
      return;
    }
    this.ackSubmitting = true;
    this.icuService
      .acknowledge(row.id, {
        outcome: 'DECLINED',
        declineReason: this.declineReason.trim(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.ackSubmitting = false;
          this.expandedId = null;
          this.refresh();
        },
        error: (err) => {
          this.ackSubmitting = false;
          this.errorMessage = err?.error?.error || 'Failed to decline';
        },
      });
  }

  // ─── ICU charge nurse — pick bed, accept ────────────────────────────
  loadBeds(wardId: string): void {
    this.icuBeds = [];
    if (!wardId) return;
    this.wardService
      .getBedsByWard(wardId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of([] as Bed[])),
      )
      .subscribe((beds) => {
        this.icuBeds = (beds ?? []).filter((b) => b.status === 'available');
      });
  }

  onWardChange(): void {
    this.selectedBedId = '';
    this.loadBeds(this.selectedWardId);
  }

  onAcceptSigned(row: IcuTransferRequest, resp: SignatureCreateResponse): void {
    if (!this.selectedBedId) {
      this.errorMessage = 'Pick an ICU bed before signing.';
      return;
    }
    this.acceptSubmitting = true;
    this.icuService
      .accept(row.id, {
        toBedId: this.selectedBedId,
        toWardId: this.selectedWardId || undefined,
        receiverSignatureId: resp.id,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.acceptSubmitting = false;
          this.expandedId = null;
          this.refresh();
        },
        error: (err) => {
          this.acceptSubmitting = false;
          this.errorMessage = err?.error?.error || 'Failed to accept';
        },
      });
  }

  // ─── ICU nurse — in-transit / complete ──────────────────────────────
  markInTransit(row: IcuTransferRequest): void {
    this.icuService
      .markInTransit(row.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.refresh(),
        error: (err) => {
          this.errorMessage = err?.error?.error || 'Failed to mark in-transit';
        },
      });
  }

  onCompleteSigned(row: IcuTransferRequest, resp: SignatureCreateResponse): void {
    this.completeSubmitting = true;
    this.icuService
      .complete(row.id, { handoverSignatureId: resp.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.completeSubmitting = false;
          this.expandedId = null;
          this.refresh();
        },
        error: (err) => {
          this.completeSubmitting = false;
          this.errorMessage = err?.error?.error || 'Failed to complete';
        },
      });
  }

  // ─── View helpers ───────────────────────────────────────────────────
  isExpanded(row: IcuTransferRequest): boolean {
    return this.expandedId === row.id;
  }

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
