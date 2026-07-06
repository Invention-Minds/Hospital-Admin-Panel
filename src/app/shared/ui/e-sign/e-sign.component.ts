import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  SignatureService,
  SignerType,
  SignatureCreateResponse,
} from '../../../services/signature.service';

/**
 * Phase 0 — Reusable e-signature capture.
 *
 * Renders a canvas the user can sign on (touch or mouse), with Clear and
 * Save buttons. On Save, posts to `/api/signature` and emits `(signed)`
 * with the new SignatureBlob id, which callers store on their own row.
 *
 * Tokens consumed: --color-brand-primary, --color-surface-card, --radius-md.
 *
 * Usage:
 *   <app-e-sign
 *     [signerType]="'attender'"
 *     [signerName]="attenderName"
 *     [signerRelation]="'son'"
 *     [contextType]="'consent'"
 *     [contextId]="admissionId"
 *     (signed)="onSigned($event)"
 *     (cancelled)="onCancelled()">
 *   </app-e-sign>
 */
@Component({
  selector: 'app-e-sign',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './e-sign.component.html',
  styleUrls: ['./e-sign.component.css'],
})
export class ESignComponent implements AfterViewInit, OnDestroy {
  /** Who is signing. Drives validation on the backend. */
  @Input() signerType: SignerType = 'attender';

  /** Display name of the signer — required (snapshot is stored). */
  @Input() signerName = '';

  /** Optional staff role snapshot ('doctor', 'nurse', 'supervisor'). */
  @Input() signerRole?: string;

  /** Required when signerType === 'attender' — relationship to patient. */
  @Input() signerRelation?: string;

  /** Reverse-link target — what is this signature for? */
  @Input() contextType?: string;

  /** Id of the consuming row (admissionId, consentId, etc.). */
  @Input() contextId?: string;

  /** Optional caption shown above the pad. */
  @Input() prompt = 'Sign in the box below';

  /** Disable the entire pad (e.g. while parent is saving). */
  @Input() disabled = false;

  @Output() signed = new EventEmitter<SignatureCreateResponse>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() error = new EventEmitter<string>();

  @ViewChild('pad', { static: false }) padRef!: ElementRef<HTMLCanvasElement>;

  hasInk = false;
  saving = false;
  errorMessage = '';

  private ctx: CanvasRenderingContext2D | null = null;
  private drawing = false;
  private lastX = 0;
  private lastY = 0;

  // Stable references so we can remove listeners on destroy.
  private boundDown = (e: PointerEvent): void => this.onPointerDown(e);
  private boundMove = (e: PointerEvent): void => this.onPointerMove(e);
  private boundUp = (e: PointerEvent): void => this.onPointerUp(e);

  constructor(private signatureService: SignatureService) {}

  ngAfterViewInit(): void {
    const canvas = this.padRef.nativeElement;
    // Match canvas internal pixel size to its CSS size so strokes don't blur.
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.errorMessage = 'Canvas not supported in this browser';
      this.error.emit(this.errorMessage);
      return;
    }
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1a1a';
    this.ctx = ctx;

    canvas.addEventListener('pointerdown', this.boundDown);
    canvas.addEventListener('pointermove', this.boundMove);
    canvas.addEventListener('pointerup', this.boundUp);
    canvas.addEventListener('pointerleave', this.boundUp);
  }

  ngOnDestroy(): void {
    const canvas = this.padRef?.nativeElement;
    if (!canvas) return;
    canvas.removeEventListener('pointerdown', this.boundDown);
    canvas.removeEventListener('pointermove', this.boundMove);
    canvas.removeEventListener('pointerup', this.boundUp);
    canvas.removeEventListener('pointerleave', this.boundUp);
  }

  clear(): void {
    if (!this.ctx) return;
    const canvas = this.padRef.nativeElement;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.restore();
    this.hasInk = false;
    this.errorMessage = '';
  }

  save(): void {
    if (this.disabled) return;
    if (!this.hasInk) {
      this.errorMessage = 'Please sign before saving';
      return;
    }
    if (!this.signerName || this.signerName.trim().length === 0) {
      this.errorMessage = 'Signer name is required';
      this.error.emit(this.errorMessage);
      return;
    }
    if (this.signerType === 'attender' && !this.signerRelation) {
      this.errorMessage = 'Relationship to patient is required for attender signature';
      this.error.emit(this.errorMessage);
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    const dataUrl = this.padRef.nativeElement.toDataURL('image/png');

    this.signatureService
      .createFromDataUrl({
        signerType: this.signerType,
        signerName: this.signerName.trim(),
        signerRole: this.signerRole,
        signerRelation: this.signerRelation,
        contextType: this.contextType,
        contextId: this.contextId,
        dataUrl,
        deviceFingerprint: navigator.userAgent.slice(0, 200),
      })
      .subscribe({
        next: (resp) => {
          this.saving = false;
          this.signed.emit(resp);
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.error || 'Failed to save signature';
          this.error.emit(this.errorMessage);
        },
      });
  }

  cancel(): void {
    this.clear();
    this.cancelled.emit();
  }

  private onPointerDown(e: PointerEvent): void {
    if (this.disabled || !this.ctx) return;
    e.preventDefault();
    this.drawing = true;
    const { x, y } = this.coords(e);
    this.lastX = x;
    this.lastY = y;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    // Capture pointer so movement outside the canvas during a drag still tracks.
    this.padRef.nativeElement.setPointerCapture?.(e.pointerId);
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.drawing || !this.ctx) return;
    e.preventDefault();
    const { x, y } = this.coords(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.lastX = x;
    this.lastY = y;
    this.hasInk = true;
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.padRef.nativeElement.releasePointerCapture?.(e.pointerId);
  }

  private coords(e: PointerEvent): { x: number; y: number } {
    const rect = this.padRef.nativeElement.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }
}
