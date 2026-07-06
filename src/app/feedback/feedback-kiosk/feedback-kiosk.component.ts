import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FeedbackService, FeedbackSurvey } from '../../services/feedback.service';

/**
 * Phase 9.25 / Phase 4 — Public feedback kiosk.
 *
 * Route: /feedback/k/:token  (no authGuard — patient opens link on phone /
 * tablet). Score 0..10 NPS + optional comments. Submitted scores ≤ 6
 * auto-raise a Complaint server-side.
 */
@Component({
  selector: 'app-feedback-kiosk',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback-kiosk.component.html',
  styleUrls: ['./feedback-kiosk.component.css'],
})
export class FeedbackKioskComponent implements OnInit {
  token = '';
  loading = false;
  errorMessage = '';
  done = false;
  survey: FeedbackSurvey | null = null;

  npsScore: number | null = null;
  comments = '';
  saving = false;

  readonly NPS_BUTTONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  constructor(private route: ActivatedRoute, private svc: FeedbackService) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) { this.errorMessage = 'Invalid link.'; return; }
    this.loading = true;
    this.svc.getByToken(this.token).subscribe({
      next: (r) => {
        this.survey = r.data;
        if (r.data.status === 'completed') this.done = true;
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.errorMessage = e?.error?.message || 'This survey link is no longer valid.';
      },
    });
  }

  pickScore(n: number): void { this.npsScore = n; }

  submit(): void {
    if (this.npsScore == null) { this.errorMessage = 'Please pick a score from 0 to 10.'; return; }
    this.saving = true;
    this.errorMessage = '';
    this.svc.submitByToken(this.token, {
      npsScore: this.npsScore,
      comments: this.comments.trim() || undefined,
      channel: 'kiosk',
    }).subscribe({
      next: () => { this.saving = false; this.done = true; },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Could not submit — please try again.'; },
    });
  }

  scoreLabel(n: number): string {
    if (n <= 6) return 'Detractor';
    if (n <= 8) return 'Passive';
    return 'Promoter';
  }
}
