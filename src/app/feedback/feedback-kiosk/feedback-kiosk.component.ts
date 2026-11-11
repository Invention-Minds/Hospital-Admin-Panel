import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FeedbackService, FeedbackSurvey } from '../../services/feedback.service';
import {
  FEEDBACK_LANGS, FEEDBACK_STRINGS, CHOICE_REASON_KEYS, FeedbackLang, FeedbackStrings,
  isFeedbackLang, browserFeedbackLang,
} from '../feedback-i18n';

/**
 * Phase 9.25 / Phase 4 — Public feedback kiosk.
 *
 * Route: /feedback/k/:token  (no authGuard — patient opens link on phone /
 * tablet). Score 0..10 NPS + optional ratings, "why did you choose us" and
 * comments, in English / Kannada / Malayalam / Hindi. Low scores auto-raise a
 * Complaint server-side.
 *
 * Language: ?lang= (from the walk-up page) → the patient's preferred language
 * on record → the browser language → English. The picker can change it.
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
  loadError = '';
  done = false;
  survey: FeedbackSurvey | null = null;

  npsScore: number | null = null;
  comments = '';
  saving = false;
  // Optional 1..5 category ratings — keys must match the backend's SATISFACTION_KEYS.
  ratings: Record<string, number> = {};
  reasons = new Set<string>();
  // Only set when the link says where it was opened (e.g. ?ch=kiosk on a desk
  // tablet); otherwise the backend infers it from how the survey was sent.
  private channel: string | undefined;

  readonly LANGS = FEEDBACK_LANGS;
  lang: FeedbackLang = 'en';
  private langFromLink = false;
  get t(): FeedbackStrings { return FEEDBACK_STRINGS[this.lang]; }

  readonly NPS_BUTTONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  readonly RATING_BUTTONS = [1, 2, 3, 4, 5];
  readonly REASON_KEYS = CHOICE_REASON_KEYS;
  readonly MAX_COMMENT = 2000;
  private static readonly CHANNELS = ['kiosk', 'sms', 'whatsapp', 'web', 'qr'];
  private static readonly CATEGORIES_BY_TEMPLATE: Record<string, string[]> = {
    'opd-post-visit': ['doctor', 'staff', 'waitingTime', 'cleanliness', 'billing'],
    'ipd-discharge': ['doctor', 'nursing', 'food', 'cleanliness', 'billing'],
    'er-discharge': ['doctor', 'nursing', 'waitingTime', 'cleanliness'],
    'day-care': ['doctor', 'nursing', 'waitingTime', 'billing'],
    general: ['doctor', 'staff', 'cleanliness', 'facilities'],
  };

  constructor(private route: ActivatedRoute, private svc: FeedbackService) {}

  get categories(): Array<{ key: string; label: string }> {
    const keys = FeedbackKioskComponent.CATEGORIES_BY_TEMPLATE[this.survey?.template ?? 'general']
      ?? FeedbackKioskComponent.CATEGORIES_BY_TEMPLATE['general'];
    const labels = this.t.cat as Record<string, string>;
    return keys.map((key) => ({ key, label: labels[key] ?? key }));
  }

  reasonLabel(key: string): string { return (this.t.reason as Record<string, string>)[key] ?? key; }

  setLang(l: FeedbackLang): void { this.lang = l; }

  rate(key: string, n: number): void {
    // Tapping the current value again clears it (ratings are optional).
    if (this.ratings[key] === n) delete this.ratings[key];
    else this.ratings[key] = n;
  }

  toggleReason(key: string): void {
    if (this.reasons.has(key)) this.reasons.delete(key);
    else this.reasons.add(key);
  }

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const ch = q.get('ch');
    if (ch && FeedbackKioskComponent.CHANNELS.includes(ch)) this.channel = ch;
    const l = q.get('lang');
    if (isFeedbackLang(l)) { this.lang = l; this.langFromLink = true; } else { this.lang = browserFeedbackLang(); }
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) { this.loadError = this.t.invalidLink; return; }
    this.loading = true;
    this.svc.getByToken(this.token).subscribe({
      next: (r) => {
        this.survey = r.data;
        if (!this.langFromLink && isFeedbackLang(r.data.preferredLanguage)) this.lang = r.data.preferredLanguage;
        if (r.data.status === 'completed') this.done = true;
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.loadError = e?.status === 410 ? this.t.expiredLink : this.t.invalidLink;
      },
    });
  }

  pickScore(n: number): void { this.npsScore = n; }

  /** Google review page — offered to every respondent after submitting (set by Quality). */
  reviewUrl: string | null = null;
  openReview(): void {
    if (!this.reviewUrl) return;
    this.svc.reviewClick(this.token).subscribe({ error: () => {} });
    window.open(this.reviewUrl, '_blank', 'noopener');
  }

  submit(): void {
    if (this.npsScore == null) { this.errorMessage = this.t.pickScore; return; }
    this.saving = true;
    this.errorMessage = '';
    this.svc.submitByToken(this.token, {
      npsScore: this.npsScore,
      comments: this.comments.trim() || undefined,
      language: this.lang,
      ...(Object.keys(this.ratings).length > 0 && { satisfactionScores: { ...this.ratings } }),
      ...(this.reasons.size > 0 && { choiceReasons: [...this.reasons] }),
      ...(this.channel && { channel: this.channel }),
    }).subscribe({
      next: (r) => { this.saving = false; this.done = true; this.reviewUrl = r.data.reviewUrl ?? null; },
      error: (e) => {
        this.saving = false;
        if (e?.status === 409) { this.done = true; return; }
        this.errorMessage = e?.status === 400 && e?.error?.message ? e.error.message : this.t.submitError;
      },
    });
  }

  scoreLabel(n: number): string {
    if (n <= 6) return this.t.scoreLow;
    if (n <= 8) return this.t.scoreMid;
    return this.t.scoreHigh;
  }
}
