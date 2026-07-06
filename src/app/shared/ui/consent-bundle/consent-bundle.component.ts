import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  ConsentForm,
  ConsentLanguage,
  ConsentService,
  ConsentSignature,
  ConsentType,
  SignConsentPayload,
} from '../../../services/consent.service';
import { SignatureCreateResponse } from '../../../services/signature.service';

/**
 * Phase 2 — Consent bundle component.
 *
 * Renders a sequence of consent forms, one at a time. Each form shows its
 * title + body text and an embedded <app-e-sign> capture pad. After the
 * patient (or attender) signs, the system POSTs to `/api/consent/sign` and
 * advances to the next form. When all forms in the bundle are signed, the
 * `(completed)` event fires with the array of ConsentSignature rows.
 *
 * Usage (admission flow):
 *   <app-consent-bundle
 *     [consentTypes]="['admission','treatment','financial']"
 *     [language]="'en'"
 *     [contextType]="'admission'"
 *     [contextId]="admissionId"
 *     [patientPrn]="patient.prn"
 *     [patientName]="patient.name"
 *     [signerMode]="'attender'"
 *     [attenderName]="attenderName"
 *     [attenderRelation]="'son'"
 *     (completed)="onAllConsentsSigned($event)"
 *     (cancelled)="onCancel()">
 *   </app-consent-bundle>
 *
 * Defer / refuse paths can also be triggered per-form so the receptionist
 * can record an attender's refusal of (say) photography while still signing
 * admission + treatment.
 */
@Component({
  selector: 'app-consent-bundle',
  templateUrl: './consent-bundle.component.html',
  styleUrls: ['./consent-bundle.component.css'],
})
export class ConsentBundleComponent implements OnInit {
  /** The ordered list of consent types to walk through. */
  @Input() consentTypes: ConsentType[] = [];

  /** Display language for the body text. Falls back to English on the server. */
  @Input() language: ConsentLanguage = 'en';

  /** Reverse-link target — recorded on every signature so audit can find them. */
  @Input() contextType?: string;
  @Input() contextId?: string | number;

  /** Patient identity (snapshot stored on each signature). */
  @Input() patientPrn?: number;
  @Input() patientName = '';

  /** Who is signing — 'patient' or 'attender'. */
  @Input() signerMode: 'patient' | 'attender' = 'patient';

  /** Required when signerMode === 'attender'. */
  @Input() attenderName = '';
  @Input() attenderRelation = '';

  /** Optional witness — used only when ConsentForm.requiresWitness is true. */
  @Input() witnessName = '';

  @Output() completed = new EventEmitter<ConsentSignature[]>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() error = new EventEmitter<string>();

  loading = true;
  errorMessage = '';
  forms: ConsentForm[] = [];
  signatures: ConsentSignature[] = [];
  currentIndex = 0;
  saving = false;

  // Track captured signature blob ids per slot so we don't post until both
  // (e.g. attender + witness) are present when required.
  pendingPatientSigId: string | null = null;
  pendingAttenderSigId: string | null = null;
  pendingWitnessSigId: string | null = null;

  constructor(private consentService: ConsentService) {}

  ngOnInit(): void {
    if (!this.consentTypes || this.consentTypes.length === 0) {
      this.errorMessage = 'No consent types provided to the bundle';
      this.loading = false;
      this.error.emit(this.errorMessage);
      return;
    }
    if (this.signerMode === 'attender' && (!this.attenderName || !this.attenderRelation)) {
      this.errorMessage = 'Attender name + relation required when signerMode = attender';
      this.loading = false;
      this.error.emit(this.errorMessage);
      return;
    }

    // Pre-fetch every form in parallel — avoids a flash of loading between steps.
    forkJoin(this.consentTypes.map((t) => this.consentService.getForm(t, this.language))).subscribe({
      next: (forms) => {
        this.forms = forms;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.error || 'Failed to load consent forms';
        this.error.emit(this.errorMessage);
      },
    });
  }

  get currentForm(): ConsentForm | null {
    return this.forms[this.currentIndex] ?? null;
  }

  get progressLabel(): string {
    return `Form ${this.currentIndex + 1} of ${this.forms.length}`;
  }

  get isLastForm(): boolean {
    return this.currentIndex >= this.forms.length - 1;
  }

  /** Caller is the patient — capture their signature blob id. */
  onPatientSigned(resp: SignatureCreateResponse): void {
    this.pendingPatientSigId = resp.id;
    this.maybeSubmit();
  }

  onAttenderSigned(resp: SignatureCreateResponse): void {
    this.pendingAttenderSigId = resp.id;
    this.maybeSubmit();
  }

  onWitnessSigned(resp: SignatureCreateResponse): void {
    this.pendingWitnessSigId = resp.id;
    this.maybeSubmit();
  }

  /**
   * Submit if we have all required signatures for the current form.
   * For attender mode: attender + (witness if required).
   * For patient mode: patient + (witness if required).
   */
  private maybeSubmit(): void {
    const form = this.currentForm;
    if (!form || this.saving) return;

    const haveSigner = this.signerMode === 'patient'
      ? Boolean(this.pendingPatientSigId)
      : Boolean(this.pendingAttenderSigId);
    const haveWitness = !form.requiresWitness || Boolean(this.pendingWitnessSigId);

    if (!haveSigner || !haveWitness) {
      // Still waiting for another required signature.
      return;
    }

    this.submitCurrent('SIGNED');
  }

  /** Public — receptionist records refusal of the current form and skips ahead. */
  refuseCurrent(reason: string): void {
    if (!reason || reason.trim().length === 0) {
      this.errorMessage = 'Reason for refusal is required';
      return;
    }
    this.submitCurrent('REFUSED', undefined, reason.trim());
  }

  /** Public — defer (e.g. patient unconscious + attender unreachable, emergency exception). */
  deferCurrent(reason: string): void {
    if (!reason || reason.trim().length === 0) {
      this.errorMessage = 'Reason for deferral is required';
      return;
    }
    this.submitCurrent('DEFERRED', reason.trim());
  }

  private submitCurrent(
    status: 'SIGNED' | 'DEFERRED' | 'REFUSED',
    deferredReason?: string,
    refusedReason?: string
  ): void {
    const form = this.currentForm;
    if (!form) return;

    this.saving = true;
    this.errorMessage = '';

    const payload: SignConsentPayload = {
      formId: form.id,
      contextType: this.contextType,
      contextId: this.contextId,
      patientPrn: this.patientPrn,
      patientName: this.patientName,
      status,
      deferredReason,
      refusedReason,
    };

    if (status === 'SIGNED') {
      if (this.signerMode === 'patient' && this.pendingPatientSigId) {
        payload.patientSignatureId = this.pendingPatientSigId;
      }
      if (this.signerMode === 'attender' && this.pendingAttenderSigId) {
        payload.attenderSignatureId = this.pendingAttenderSigId;
        payload.attenderName = this.attenderName;
        payload.attenderRelation = this.attenderRelation;
      }
      if (form.requiresWitness && this.pendingWitnessSigId) {
        payload.witnessSignatureId = this.pendingWitnessSigId;
        payload.witnessName = this.witnessName;
      }
    }

    this.consentService.sign(payload).subscribe({
      next: (sig) => {
        this.signatures.push(sig);
        this.saving = false;
        this.advanceOrFinish();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.error || 'Failed to record consent';
        this.error.emit(this.errorMessage);
      },
    });
  }

  private advanceOrFinish(): void {
    // Reset per-form pending signature buffer.
    this.pendingPatientSigId = null;
    this.pendingAttenderSigId = null;
    this.pendingWitnessSigId = null;

    if (this.isLastForm) {
      this.completed.emit(this.signatures);
      return;
    }
    this.currentIndex += 1;
  }

  cancelBundle(): void {
    this.cancelled.emit();
  }
}
