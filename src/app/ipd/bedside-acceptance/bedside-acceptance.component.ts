import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  BedRequest,
  BedRequestService,
} from '../../services/bed-request.service';
import { ConsentSignature, ConsentType } from '../../services/consent.service';
import { SignatureCreateResponse } from '../../services/signature.service';
import { AlertService } from '../../services/alert.service';

/**
 * Phase 3 — PRE bedside attender-acceptance screen (WF-2 final step).
 *
 * Lands on this screen with a bed-request id (accepted by NS). Walks the
 * attender through:
 *
 *   1. Admission consent bundle (admission + treatment + financial)
 *   2. Bedside facility-acceptance signature (the "accept the room" sign-off)
 *
 * On the final signature, POSTs to /api/bed-request/:id/attender-accept
 * which closes the handshake and promotes the admission to 'admitted'.
 *
 * Route: /bedside-acceptance/:bedRequestId
 */
@Component({
  selector: 'app-bedside-acceptance',
  templateUrl: './bedside-acceptance.component.html',
  styleUrls: ['./bedside-acceptance.component.css'],
})
export class BedsideAcceptanceComponent implements OnInit {
  bedRequestId = '';
  request: BedRequest | null = null;
  loading = true;
  errorMessage = '';
  successMessage = '';

  // Two-step bedside flow: 1 = consent bundle, 2 = facility-acceptance signature.
  step: 1 | 2 | 3 = 1;
  saving = false;

  /**
   * Drives the *ngIf split between the "Who is the attender?" form and the
   * consent bundle. Was previously inferred from `!!attenderName`, which broke
   * the moment the user typed the first letter (the form re-rendered and
   * stole focus). Now an explicit flag, only flipped by `proceedToConsent()`.
   */
  attenderConfirmed = false;

  // Captured outputs of step 1 + step 2.
  consentSignatureIds: string[] = [];
  facilityAcceptanceSignatureId: string | null = null;

  // Inputs to the consent bundle.
  consentTypes: ConsentType[] = ['admission', 'treatment', 'financial'];
  attenderName = '';
  attenderRelation = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bedRequestService: BedRequestService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.bedRequestId = this.route.snapshot.paramMap.get('bedRequestId') ?? '';
    if (!this.bedRequestId) {
      this.errorMessage = 'No bed-request id in URL';
      this.loading = false;
      return;
    }
    this.bedRequestService.getById(this.bedRequestId).subscribe({
      next: (req) => {
        this.request = req;
        this.loading = false;

        if (req.status === 'CLOSED') {
          this.errorMessage = 'This bed request is already closed (admission active).';
          return;
        }
        if (req.status !== 'ACCEPTED') {
          this.errorMessage = `Bed request is in status=${req.status}; the nursing station must accept it before bedside acceptance.`;
          return;
        }

        // If the admission already carries an attender name (from the patient
        // record's nextOfKin), prefill it so the receptionist doesn't retype.
        const adm = req.admission;
        if (adm) {
          // We don't have nok loaded directly here — the receptionist enters/confirms below.
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.error || 'Failed to load bed request';
      },
    });
  }

  // ─── Step 1: consent bundle complete ────────────────────────────────────
  onConsentsCompleted(signatures: ConsentSignature[]): void {
    this.consentSignatureIds = signatures.map((s) => s.id);
    this.step = 2;
  }

  async onConsentBundleCancelled(): Promise<void> {
    if (await this.alertSvc.confirm('Cancel the entire bedside acceptance flow? The admission will stay in BED_ACCEPTED state until you return.', { severity: 'warning', confirmLabel: 'Cancel flow' })) {
      this.router.navigate(['/ward-census']);
    }
  }

  // ─── Step 2: facility-acceptance signature ──────────────────────────────
  onFacilitySigned(resp: SignatureCreateResponse): void {
    this.facilityAcceptanceSignatureId = resp.id;
    this.submitFinal();
  }

  proceedToConsent(): void {
    if (!this.attenderName || this.attenderName.trim().length < 2) {
      this.errorMessage = 'Attender name is required.';
      return;
    }
    if (!this.attenderRelation) {
      this.errorMessage = 'Attender relation is required.';
      return;
    }
    this.errorMessage = '';
    this.attenderConfirmed = true; // unlocks the consent bundle view
    this.step = 1;
  }

  // ─── Final submit ───────────────────────────────────────────────────────
  private submitFinal(): void {
    if (!this.request || !this.facilityAcceptanceSignatureId || this.saving) return;
    this.saving = true;
    this.errorMessage = '';
    this.bedRequestService
      .attenderAccept(this.request.id, {
        attenderName: this.attenderName.trim(),
        attenderRelation: this.attenderRelation.trim(),
        attenderFacilitySignatureId: this.facilityAcceptanceSignatureId,
        consentSignatureIds: this.consentSignatureIds,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.step = 3;
          this.successMessage = `Patient ${this.request?.admission?.prn || ''} admitted. Bed is now occupied.`;
          // Auto-redirect to ward-management after 3 seconds.
          setTimeout(() => this.router.navigate(['/ward-census']), 3000);
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.error || 'Failed to close the bedside acceptance';
        },
      });
  }
}
