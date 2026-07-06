import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { FeedbackService } from '../../services/feedback.service';

/**
 * Phase 6 — Walk-up kiosk start page.
 *
 * Route: /feedback/k-start (public). Patient scans a permanent poster QR
 * pointing here, enters their name (PRN optional), and the server mints a
 * one-shot survey. We then navigate to /feedback/k/:token so the patient
 * fills the actual NPS form.
 */
@Component({
  selector: 'app-feedback-start',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback-start.component.html',
  styleUrls: ['./feedback-start.component.css'],
})
export class FeedbackStartComponent {
  form = {
    patientName: '',
    patientPrn: '',
    visitType: 'general' as 'opd' | 'ipd' | 'er' | 'day-care' | 'general',
  };
  submitting = false;
  errorMessage = '';

  readonly VISIT_TYPES: Array<{ value: string; label: string }> = [
    { value: 'opd', label: 'OPD consultation' },
    { value: 'ipd', label: 'Inpatient stay' },
    { value: 'er', label: 'Emergency visit' },
    { value: 'day-care', label: 'Day-care procedure' },
    { value: 'general', label: 'Something else' },
  ];

  constructor(private svc: FeedbackService, private router: Router) {}

  submit(): void {
    const name = this.form.patientName.trim();
    if (name.length < 2) { this.errorMessage = 'Please tell us your name.'; return; }
    this.submitting = true; this.errorMessage = '';
    this.svc.startWalkUp({
      patientName: name,
      patientPrn: this.form.patientPrn.trim() || null,
      visitType: this.form.visitType,
    }).subscribe({
      next: (r) => { this.router.navigateByUrl(`/feedback/k/${r.data.token}`); },
      error: (e) => {
        this.submitting = false;
        this.errorMessage = e?.error?.message || 'Could not start — please ask a staff member for help.';
      },
    });
  }
}
