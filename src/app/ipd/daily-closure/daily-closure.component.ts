import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  DailyClosure,
  DailyClosureService,
} from '../../services/daily-closure.service';
import { SignatureCreateResponse } from '../../services/signature.service';

/**
 * Phase 4 (WF-3) — Daily Closure form.
 *
 * Walks the attender through the day's care: doctor visit time, nursing
 * summary, satisfaction score, concerns, and a signature that locks the
 * row. Negative-flag detection (score ≤ 2 OR concerns present) is done
 * server-side; the UI just surfaces it after submit.
 *
 * Inputs:
 *   admissionId — the IpdAdmission id this closure belongs to
 *   closureDate — optional override (defaults to today)
 *
 * Workflow:
 *   1. On init we either fetch an existing OPEN row (admissionId+date) or open a new one
 *   2. Care fields are editable inline (auto-saved when the user signs)
 *   3. The attender picks a satisfaction score 1..5
 *   4. <app-e-sign> captures the attender signature, which submits the row
 */
@Component({
  selector: 'app-daily-closure',
  templateUrl: './daily-closure.component.html',
  styleUrls: ['./daily-closure.component.css'],
})
export class DailyClosureComponent implements OnInit {
  @Input() admissionId = '';
  @Input() closureDate?: string;

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  closure: DailyClosure | null = null;

  // Editable fields backed by ngModel.
  doctorVisitedAt = '';
  doctorVisitedBy = '';
  nursingSummary = '';
  vitalsSummary = '';
  satisfactionScore: number | null = null;
  concerns = '';
  attenderName = '';
  attenderRelation = '';

  readonly scaleOptions: ReadonlyArray<{ value: number; label: string; tone: string }> = [
    { value: 5, label: 'Very satisfied', tone: 'tone-good' },
    { value: 4, label: 'Satisfied', tone: 'tone-good' },
    { value: 3, label: 'Neutral', tone: 'tone-mid' },
    { value: 2, label: 'Dissatisfied', tone: 'tone-bad' },
    { value: 1, label: 'Very dissatisfied', tone: 'tone-bad' },
  ];

  readonly relationOptions = [
    'father', 'mother', 'spouse', 'son', 'daughter', 'sibling', 'guardian', 'friend', 'other',
  ];

  constructor(
    private closureService: DailyClosureService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Component is reachable both as a route (`/ipd/admission/:admissionId/daily-closure`)
    // and as an inline child via @Input. Route param takes precedence.
    const routeId = this.route.snapshot.paramMap.get('admissionId');
    if (routeId) this.admissionId = routeId;
    if (!this.admissionId) {
      this.errorMessage = 'admissionId is required';
      this.loading = false;
      return;
    }
    this.bootstrap();
  }

  private bootstrap(): void {
    const dateForList = this.closureDate || new Date().toISOString().split('T')[0];
    this.closureService.list({ admissionId: this.admissionId, date: dateForList }).subscribe({
      next: (rows) => {
        const existing = rows[0];
        if (existing) {
          this.adopt(existing);
          this.loading = false;
        } else {
          this.openNew();
        }
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Failed to load daily closure';
        this.loading = false;
      },
    });
  }

  private openNew(): void {
    this.closureService.open({ admissionId: this.admissionId, closureDate: this.closureDate }).subscribe({
      next: (row) => {
        this.adopt(row);
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Failed to open daily closure';
        this.loading = false;
      },
    });
  }

  private adopt(row: DailyClosure): void {
    this.closure = row;
    this.doctorVisitedAt = row.doctorVisitedAt
      ? new Date(row.doctorVisitedAt).toISOString().slice(0, 16)
      : '';
    this.doctorVisitedBy = row.doctorVisitedBy ?? '';
    this.nursingSummary = row.nursingSummary ?? '';
    this.vitalsSummary = row.vitalsSummary ?? '';
    this.satisfactionScore = row.satisfactionScore ?? null;
    this.concerns = row.concerns ?? '';
    this.attenderName = row.attenderName ?? '';
    this.attenderRelation = row.attenderRelation ?? '';
  }

  get isLocked(): boolean {
    return this.closure?.status === 'CLOSED';
  }

  get canSign(): boolean {
    return (
      !!this.closure &&
      this.closure.status === 'OPEN' &&
      this.satisfactionScore != null &&
      !!this.attenderName?.trim() &&
      !!this.attenderRelation
    );
  }

  pickScore(score: number): void {
    if (this.isLocked) return;
    this.satisfactionScore = score;
  }

  // The <app-e-sign> sub-component captures the signature and posts it as a
  // SignatureBlob, then emits the resulting id. We use that id to submit the
  // row in a single round-trip.
  onAttenderSigned(resp: SignatureCreateResponse): void {
    if (!this.closure || this.satisfactionScore == null) return;
    this.saving = true;
    this.errorMessage = '';
    this.closureService
      .submit(this.closure.id, {
        satisfactionScore: this.satisfactionScore,
        concerns: this.concerns?.trim() || undefined,
        doctorVisitedAt: this.doctorVisitedAt
          ? new Date(this.doctorVisitedAt).toISOString()
          : undefined,
        doctorVisitedBy: this.doctorVisitedBy?.trim() || undefined,
        nursingSummary: this.nursingSummary?.trim() || undefined,
        vitalsSummary: this.vitalsSummary?.trim() || undefined,
        attenderName: this.attenderName.trim(),
        attenderRelation: this.attenderRelation,
        attenderSignatureId: resp.id,
      })
      .subscribe({
        next: (row) => {
          this.saving = false;
          this.adopt(row);
          this.successMessage = row.negativeFlag
            ? 'Closed with concerns flagged. PSQ team has been notified.'
            : 'Day closed. Thank the attender.';
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.error || 'Failed to submit closure';
        },
      });
  }
}
