import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { FeedbackService } from '../../services/feedback.service';

/**
 * Walk-up kiosk start page.
 *
 * Route: /feedback/new (public). Patient scans a permanent poster QR, enters
 * their PRN, and we SMS an OTP to the phone on record. Once verified the
 * server mints a one-shot survey and we navigate to /feedback/k/:token.
 */
@Component({
  selector: 'app-feedback-start',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback-start.component.html',
  styleUrls: ['./feedback-start.component.css'],
})
export class FeedbackStartComponent implements OnDestroy {
  step: 'prn' | 'otp' = 'prn';
  patientPrn = '';
  visitType: 'opd' | 'ipd' | 'er' | 'day-care' | 'general' = 'general';
  otp = '';

  challengeId = '';
  phoneLast4 = '';
  infoMessage = '';
  errorMessage = '';
  submitting = false;

  resendIn = 0;
  private resendTimer: ReturnType<typeof setInterval> | null = null;

  readonly RESEND_SECONDS = 60;
  readonly VISIT_TYPES: Array<{ value: string; label: string }> = [
    { value: 'opd', label: 'OPD consultation' },
    { value: 'ipd', label: 'Inpatient stay' },
    { value: 'er', label: 'Emergency visit' },
    { value: 'day-care', label: 'Day-care procedure' },
    { value: 'general', label: 'Something else' },
  ];

  constructor(private svc: FeedbackService, private router: Router) {}

  ngOnDestroy(): void { this.stopTimer(); }

  requestOtp(): void {
    const prn = this.patientPrn.trim();
    if (!/^\d{1,10}$/.test(prn)) { this.errorMessage = 'Please enter your PRN (numbers only).'; return; }
    this.submitting = true; this.errorMessage = ''; this.infoMessage = '';
    this.svc.requestWalkUpOtp(prn).subscribe({
      next: (r) => {
        this.submitting = false;
        if (!r.data.challengeId) {
          // Unknown PRN or no phone on file — the server doesn't say which.
          this.errorMessage = `${r.data.message} If you don't receive it, please check your PRN or ask a staff member.`;
          return;
        }
        this.challengeId = r.data.challengeId;
        this.phoneLast4 = r.data.phoneLast4 || '';
        this.otp = '';
        this.step = 'otp';
        this.infoMessage = this.phoneLast4 ? `OTP sent to ••••${this.phoneLast4}` : 'OTP sent to the phone on record';
        this.startTimer();
      },
      error: (e) => {
        this.submitting = false;
        this.errorMessage = this.errText(e, 'Could not send the OTP — please ask a staff member for help.');
      },
    });
  }

  verify(): void {
    const otp = this.otp.trim();
    if (!/^\d{6}$/.test(otp)) { this.errorMessage = 'Please enter the 6-digit OTP.'; return; }
    this.submitting = true; this.errorMessage = '';
    this.svc.verifyWalkUpOtp({ challengeId: this.challengeId, otp, visitType: this.visitType }).subscribe({
      next: (r) => { this.stopTimer(); this.router.navigateByUrl(`/feedback/k/${r.data.token}`); },
      error: (e) => {
        this.submitting = false;
        this.errorMessage = this.errText(e, 'Could not verify the OTP — please try again.');
        // Expired / used / locked — the code can't be retried; prompt for a new one.
        if (e?.status === 410 || e?.status === 429) { this.otp = ''; this.resendIn = 0; this.stopTimer(); }
      },
    });
  }

  resend(): void {
    if (this.resendIn > 0 || this.submitting) return;
    this.requestOtp();
  }

  changePrn(): void {
    this.stopTimer();
    this.step = 'prn';
    this.challengeId = ''; this.otp = ''; this.infoMessage = ''; this.errorMessage = '';
  }

  private errText(e: any, fallback: string): string {
    return e?.error?.message || e?.error?.error || fallback;
  }

  private startTimer(): void {
    this.stopTimer();
    this.resendIn = this.RESEND_SECONDS;
    this.resendTimer = setInterval(() => {
      this.resendIn -= 1;
      if (this.resendIn <= 0) this.stopTimer();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.resendTimer) { clearInterval(this.resendTimer); this.resendTimer = null; }
    if (this.resendIn < 0) this.resendIn = 0;
  }
}
