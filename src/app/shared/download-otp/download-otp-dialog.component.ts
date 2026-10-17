import { Component, Inject, OnInit, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DownloadOtpService, PictureCaptcha } from './download-otp.service';

@Component({
  selector: 'app-download-otp-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  template: `
    <div class="dotp">
      <h2 class="dotp__title"><i class="pi pi-shield"></i> Verify to download</h2>
      <p class="dotp__line">You are downloading <b>{{ data.label }}</b>. Every download is recorded with your name and reason.</p>

      @if (phase === 'otp') {
        <p class="dotp__step">Step 1 of 2 · Email code <span class="dotp__muted">(unlocks downloads for 60 minutes)</span></p>
        @if (sending) {
          <p class="dotp__muted"><i class="pi pi-spin pi-spinner"></i> Sending code…</p>
        } @else if (sentTo) {
          <p class="dotp__muted">Code sent to <b>{{ sentTo }}</b></p>
        }
        @if (error) { <p class="dotp__error">{{ error }}</p> }
        <form (ngSubmit)="submitOtp()" #f="ngForm">
          <input class="dotp__input dotp__input--code" name="otp" [(ngModel)]="otp" inputmode="numeric" minlength="6" maxlength="6"
                 autocomplete="one-time-code" placeholder="6-digit code" required [disabled]="!sentTo" />
          <div class="dotp__actions">
            <button type="button" class="dotp__link" [disabled]="sending" (click)="sendOtp()">Resend code</button>
            <span class="dotp__spacer"></span>
            <button type="button" class="dotp__btn dotp__btn--ghost" (click)="ref.close(false)">Cancel</button>
            <button type="submit" class="dotp__btn" [disabled]="!f.valid || busy || !sentTo">{{ busy ? 'Verifying…' : 'Next' }}</button>
          </div>
        </form>
      } @else {
        <p class="dotp__step">{{ needsOtp ? 'Step 2 of 2 · ' : '' }}Picture check and reason</p>
        <div class="dotp__prompt">
          <span>{{ captcha?.prompt || 'Loading picture…' }}</span>
          <button type="button" class="dotp__icon" title="New picture" aria-label="Load a new picture" (click)="loadCaptcha()">
            <i class="pi pi-refresh"></i>
          </button>
        </div>
        <div class="dotp__grid">
          @if (captcha) {
            <img [src]="captcha.image" alt="" width="304" height="304" draggable="false" />
            <div class="dotp__tiles" [style.grid-template-columns]="'repeat(' + captcha.grid + ', 1fr)'">
              @for (t of tiles; track t) {
                <button type="button" class="dotp__tile" [class.dotp__tile--on]="selected.has(t)" (click)="toggleTile(t)"
                        [attr.aria-pressed]="selected.has(t)" [attr.aria-label]="'Tile ' + (t + 1)">
                  @if (selected.has(t)) { <i class="pi pi-check"></i> }
                </button>
              }
            </div>
          } @else {
            <div class="dotp__grid-ph"><i class="pi pi-spin pi-spinner"></i></div>
          }
        </div>
        @if (error) { <p class="dotp__error">{{ error }}</p> }
        <form (ngSubmit)="submitAuthorize()" #g="ngForm">
          <label class="dotp__label" for="dotp-reason">Reason for this download *</label>
          <textarea id="dotp-reason" class="dotp__input dotp__textarea" name="reason" [(ngModel)]="reason" required minlength="5" maxlength="500"
                    placeholder="e.g. Monthly census report for NABH audit"></textarea>
          <div class="dotp__actions">
            <span class="dotp__spacer"></span>
            <button type="button" class="dotp__btn dotp__btn--ghost" (click)="ref.close(false)">Cancel</button>
            <button type="submit" class="dotp__btn" [disabled]="!g.valid || busy || !captcha || selected.size === 0">{{ busy ? 'Checking…' : 'Download' }}</button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .dotp { padding: 20px 22px 16px; font-family: inherit; }
    .dotp__title { margin: 0 0 6px; font-size: 1.1rem; font-weight: 600; color: #1e3a6b; display: flex; gap: 8px; align-items: center; }
    .dotp__line { margin: 0 0 10px; font-size: 13px; line-height: 1.5; color: #475569; }
    .dotp__step { margin: 0 0 8px; font-size: 12.5px; font-weight: 600; color: #1e3a6b; }
    .dotp__muted { margin: 0 0 8px; font-size: 12.5px; font-weight: 400; color: #64748b; }
    .dotp__error { margin: 0 0 8px; font-size: 12.5px; color: #c2410c; }
    .dotp__label { display: block; margin: 10px 0 4px; font-size: 12.5px; color: #1e3a6b; }
    .dotp__input { width: 100%; box-sizing: border-box; height: 40px; padding: 0 12px; border: 1px solid #d5deec; border-radius: 9px;
                   font-family: inherit; font-size: 14px; outline: none; user-select: text; }
    .dotp__input--code { font-size: 18px; letter-spacing: 6px; text-align: center; }
    .dotp__textarea { height: 70px; padding: 8px 12px; resize: vertical; }
    .dotp__input:focus { border-color: #5882c1; box-shadow: 0 0 0 3px rgba(88,130,193,.16); }
    .dotp__prompt { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13.5px; font-weight: 600; color: #1e3a6b; }
    .dotp__prompt span { flex: 1; }
    .dotp__grid { position: relative; width: 304px; height: 304px; margin: 0 auto 8px; border-radius: 8px; overflow: hidden; }
    .dotp__grid img { display: block; width: 304px; height: 304px; pointer-events: none; }
    .dotp__grid-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #eef3fc; color: #94a3b8; }
    /* Tile hit areas sit over the image: 4px gaps, 96px tiles (matches the server grid). */
    .dotp__tiles { position: absolute; inset: 0; display: grid; gap: 4px; padding: 4px; }
    .dotp__tile { position: relative; border: 2px solid transparent; border-radius: 6px; background: transparent; cursor: pointer; padding: 0; }
    .dotp__tile:hover { border-color: rgba(88,130,193,.6); }
    .dotp__tile:focus-visible { outline: 2px solid #5882c1; outline-offset: -2px; }
    .dotp__tile--on { border-color: #1d4ed8; background: rgba(29,78,216,.18); }
    .dotp__tile i { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; line-height: 20px; font-size: 11px;
                    border-radius: 50%; background: #1d4ed8; color: #fff; }
    .dotp__icon { width: 34px; height: 34px; flex: none; border: 1px solid #d5deec; border-radius: 8px; background: #eef3fc; color: #1e3a6b; cursor: pointer; }
    .dotp__actions { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
    .dotp__spacer { flex: 1; }
    .dotp__link { border: none; background: none; padding: 0; color: #5882c1; font-size: 12.5px; cursor: pointer; }
    .dotp__link:disabled { color: #a8b4c8; cursor: not-allowed; }
    .dotp__btn { height: 36px; padding: 0 16px; border: none; border-radius: 8px; background: #5882c1; color: #fff; font-size: 13px; cursor: pointer; }
    .dotp__btn:disabled { opacity: .55; cursor: not-allowed; }
    .dotp__btn--ghost { background: #eef3fc; color: #1e3a6b; }
  `],
})
export class DownloadOtpDialogComponent implements OnInit {
  phase: 'otp' | 'authorize' = 'otp';
  needsOtp = false;
  otp = '';
  sentTo = '';
  sending = false;
  captcha: PictureCaptcha | null = null;
  tiles: number[] = [];
  selected = new Set<number>();
  reason = '';
  busy = false;
  error = '';

  constructor(
    public ref: MatDialogRef<DownloadOtpDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: { label: string },
    @Inject(forwardRef(() => DownloadOtpService)) private svc: DownloadOtpService,
  ) {}

  ngOnInit(): void {
    this.needsOtp = !this.svc.currentGrant();
    if (this.needsOtp) {
      this.phase = 'otp';
      this.sendOtp();
    } else {
      this.toAuthorize();
    }
  }

  sendOtp(): void {
    this.sending = true;
    this.error = '';
    this.otp = ''; // a new code replaces the old one — clear what was typed
    this.sentTo = '';
    this.svc.requestOtp().subscribe({
      next: (r) => { this.sending = false; this.sentTo = r.sentTo; },
      error: (e) => { this.sending = false; this.error = e.error?.error || 'Could not send the code. Please try again.'; },
    });
  }

  submitOtp(): void {
    this.busy = true;
    this.error = '';
    this.svc.confirmOtp(this.otp.trim()).subscribe({
      next: (g) => { this.svc.storeGrant(g); this.busy = false; this.toAuthorize(); },
      error: (e) => { this.busy = false; this.error = e.error?.error || 'Verification failed. Please try again.'; },
    });
  }

  private toAuthorize(): void {
    this.phase = 'authorize';
    this.error = '';
    this.loadCaptcha();
  }

  loadCaptcha(): void {
    this.captcha = null;
    this.selected.clear();
    this.svc.getCaptcha().subscribe({
      next: (c) => {
        this.captcha = c;
        this.tiles = Array.from({ length: c.grid * c.grid }, (_, i) => i);
      },
      error: (e) => { this.error = e.error?.error || 'Could not load the picture. Please try again.'; },
    });
  }

  toggleTile(t: number): void {
    if (this.selected.has(t)) this.selected.delete(t);
    else this.selected.add(t);
  }

  async submitAuthorize(): Promise<void> {
    this.busy = true;
    this.error = '';
    try {
      await this.svc.authorize({
        captchaId: this.captcha!.captchaId,
        captchaAnswer: [...this.selected],
        reason: this.reason.trim(),
        label: this.data.label,
      });
      this.ref.close(true);
    } catch (e: any) {
      this.busy = false;
      this.error = e?.error?.error || 'Could not verify. Please try again.';
      if (e?.status === 428) {
        // Grant expired while the dialog was open — start over with the OTP.
        this.needsOtp = true;
        this.phase = 'otp';
        this.sendOtp();
        return;
      }
      this.loadCaptcha(); // captchas are single use
    }
  }
}
