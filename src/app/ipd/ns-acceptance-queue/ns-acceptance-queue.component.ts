import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, interval, of, Subscription } from 'rxjs';
import { catchError, startWith, switchMap } from 'rxjs/operators';
import {
  BedRequest,
  BedRequestService,
} from '../../services/bed-request.service';
import {
  Bed,
  Ward,
  WardManagementService,
} from '../../services/ward-management.service';
import { SignatureCreateResponse } from '../../services/signature.service';

/**
 * Phase 3 — NS acceptance queue (WF-2).
 *
 * Lives on the ward-management screen. Polls `/api/bed-request?status=REQUESTED`
 * every 15 seconds and lets the nurse-in-charge accept / hold / reject each
 * incoming bed request. On accept, the nurse signs (via <app-e-sign>) "bed
 * ready, equipment verified" — that signature id flows back to the admission.
 *
 * Usage on ward-management:
 *   <app-ns-acceptance-queue [wardId]="currentWardId"></app-ns-acceptance-queue>
 */
@Component({
  selector: 'app-ns-acceptance-queue',
  templateUrl: './ns-acceptance-queue.component.html',
  styleUrls: ['./ns-acceptance-queue.component.css'],
})
export class NsAcceptanceQueueComponent implements OnInit, OnDestroy {
  /** Optional — restrict to a specific ward. Omit to see all incoming. */
  @Input() wardId?: string;

  /** Polling cadence in ms. */
  @Input() pollMs = 15000;

  /** REQUESTED rows — awaiting NS accept / hold / reject. */
  rows: BedRequest[] = [];

  /**
   * ACCEPTED rows — NS has accepted but the bedside attender flow hasn't run
   * yet. Reception/PRE staff click "Walk attender through" to navigate to
   * /bedside-acceptance/:id and complete the consent bundle + facility-acceptance
   * signature.
   */
  acceptedRows: BedRequest[] = [];

  loading = true;
  errorMessage = '';

  // The row currently being acted on (accept / hold / reject panel open).
  activeRowId: string | null = null;
  activeAction: 'accept' | 'hold' | 'reject' | null = null;
  reasonInput = '';

  // Phase 3 (WF-2) — bed-picker state for the accept panel.
  // NS must pick a specific bed inside a ward before signing acceptance, so the
  // admission row gets `wardId/bedId` stamped (otherwise IPD list shows blank
  // ward/bed).
  wards: Ward[] = [];
  beds: Bed[] = [];
  selectedWardId = '';
  selectedBedId = '';

  // Captured nurse signature pending submit.
  pendingNurseSigId: string | null = null;
  saving = false;

  private sub?: Subscription;

  constructor(
    private bedRequestService: BedRequestService,
    private wardService: WardManagementService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.sub = interval(this.pollMs)
      .pipe(
        startWith(0),
        switchMap(() =>
          forkJoin({
            requested: this.bedRequestService.list({ status: 'REQUESTED', wardId: this.wardId }),
            accepted:  this.bedRequestService.list({ status: 'ACCEPTED',  wardId: this.wardId }),
          }),
        ),
      )
      .subscribe({
        next: ({ requested, accepted }) => {
          this.rows = requested ?? [];
          this.acceptedRows = accepted ?? [];
          this.loading = false;
          this.errorMessage = '';
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.error?.error || 'Failed to load bed requests';
        },
      });

    // Pre-load ward list for the bed picker (one-shot, doesn't poll).
    this.wardService.getAllWards()
      .pipe(catchError(() => of([] as Ward[])))
      .subscribe((wards) => { this.wards = wards ?? []; });
  }

  /** Called when nurse picks a ward — fetch its available beds. */
  onWardChange(wardId: string): void {
    this.selectedWardId = wardId;
    this.selectedBedId = '';
    this.beds = [];
    if (!wardId) return;
    this.wardService.getBedsByWard(wardId)
      .pipe(catchError(() => of([] as Bed[])))
      .subscribe((beds) => {
        this.beds = (beds ?? []).filter((b) => b.status === 'available');
      });
  }

  /** Navigate to the PRE bedside-acceptance flow for a given accepted bed request. */
  openBedsideFlow(row: BedRequest): void {
    this.router.navigate(['/bedside-acceptance', row.id]);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ─── Action panel toggling ─────────────────────────────────────────────
  startAccept(row: BedRequest): void {
    this.activeRowId = row.id;
    this.activeAction = 'accept';
    this.reasonInput = '';
    this.pendingNurseSigId = null;
    // Seed the picker — prefer the ward the request named, otherwise blank.
    this.selectedWardId = row.wardId ?? '';
    this.selectedBedId = '';
    this.beds = [];
    if (this.selectedWardId) this.onWardChange(this.selectedWardId);
  }

  startHold(row: BedRequest): void {
    this.activeRowId = row.id;
    this.activeAction = 'hold';
    this.reasonInput = '';
  }

  startReject(row: BedRequest): void {
    this.activeRowId = row.id;
    this.activeAction = 'reject';
    this.reasonInput = '';
  }

  cancelAction(): void {
    this.activeRowId = null;
    this.activeAction = null;
    this.reasonInput = '';
    this.pendingNurseSigId = null;
  }

  // ─── Submit each action ────────────────────────────────────────────────
  onNurseSigned(resp: SignatureCreateResponse): void {
    this.pendingNurseSigId = resp.id;
    this.confirmAccept();
  }

  /** Gate the e-sign render — only allow signing once a ward + bed are picked. */
  get canSignAccept(): boolean {
    return !!this.selectedWardId && !!this.selectedBedId;
  }

  private confirmAccept(): void {
    if (!this.activeRowId || !this.pendingNurseSigId || this.saving) return;
    if (!this.selectedWardId || !this.selectedBedId) {
      this.errorMessage = 'Pick a ward + bed before signing.';
      return;
    }
    this.saving = true;
    this.bedRequestService
      .accept(this.activeRowId, {
        nsAcceptanceSignatureId: this.pendingNurseSigId,
        wardId: this.selectedWardId,
        bedId: this.selectedBedId,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.cancelAction();
          this.refresh();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.error || 'Accept failed';
        },
      });
  }

  confirmHold(): void {
    if (!this.activeRowId || this.saving) return;
    if (this.reasonInput.trim().length < 5) {
      this.errorMessage = 'Hold reason must be at least 5 characters';
      return;
    }
    this.saving = true;
    this.bedRequestService.hold(this.activeRowId, this.reasonInput.trim()).subscribe({
      next: () => {
        this.saving = false;
        this.cancelAction();
        this.refresh();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.error || 'Hold failed';
      },
    });
  }

  confirmReject(): void {
    if (!this.activeRowId || this.saving) return;
    if (this.reasonInput.trim().length < 5) {
      this.errorMessage = 'Reject reason must be at least 5 characters';
      return;
    }
    this.saving = true;
    this.bedRequestService.reject(this.activeRowId, this.reasonInput.trim()).subscribe({
      next: () => {
        this.saving = false;
        this.cancelAction();
        this.refresh();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.error || 'Reject failed';
      },
    });
  }

  // Manual refresh button.
  refresh(): void {
    forkJoin({
      requested: this.bedRequestService.list({ status: 'REQUESTED', wardId: this.wardId }),
      accepted:  this.bedRequestService.list({ status: 'ACCEPTED',  wardId: this.wardId }),
    }).subscribe({
      next: ({ requested, accepted }) => {
        this.rows = requested ?? [];
        this.acceptedRows = accepted ?? [];
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Refresh failed';
      },
    });
  }

  // Helpers used by the template.
  urgencyClass(u: string): string {
    if (u === 'emergency') return 'cb-urg-em';
    if (u === 'urgent') return 'cb-urg-ur';
    return 'cb-urg-ro';
  }

  ageMinutes(iso: string): number {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return 0;
    return Math.max(0, Math.round((Date.now() - t) / 60000));
  }
}
