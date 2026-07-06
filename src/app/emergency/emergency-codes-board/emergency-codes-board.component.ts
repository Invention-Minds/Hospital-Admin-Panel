import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  EmergencyCodeService, EmergencyCodeDef, CodeActivation, CodeSuggestion, ActivateResponse,
} from '../../services/emergency-code.service';
import { AlertService } from '../../services/alert.service';

/**
 * Phase 9.20 — Hospital Emergency Codes board.
 *
 * Manual activation buttons for the 7 codes (fixed from the poster), a live
 * strip of active codes, and auto-suggestions (Code Blue from critical NEWS2,
 * Code Yellow from an ER red-triage surge). Activating a code shows a "Call
 * 3111" tel: button + the announcement script.
 *
 * Route: /emergency/codes
 */
@Component({
  selector: 'app-emergency-codes-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './emergency-codes-board.component.html',
  styleUrls: ['./emergency-codes-board.component.css'],
})
export class EmergencyCodesBoardComponent implements OnInit, OnDestroy {
  codes: EmergencyCodeDef[] = [];
  active: CodeActivation[] = [];
  suggestions: CodeSuggestion[] = [];
  loading = false;
  errorMessage = '';

  // Activation modal
  modalCode: EmergencyCodeDef | null = null;
  draft: { location: string; note: string; admissionId: string | null; patientName: string | null; autoSuggested: boolean } =
    this.blankDraft();
  saving = false;

  // Dial banner shown after a successful activation
  lastDial: { label: string; number: string; script: string; extra: string | null } | null = null;

  private destroy$ = new Subject<void>();

  constructor(private svc: EmergencyCodeService, private alertSvc: AlertService) {}

  ngOnInit(): void {
    this.svc.getCodes().pipe(takeUntil(this.destroy$)).subscribe({ next: (r) => (this.codes = r.data ?? []) });
    this.loadActive();
    this.loadSuggestions();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private blankDraft() {
    return { location: '', note: '', admissionId: null as string | null, patientName: null as string | null, autoSuggested: false };
  }

  loadActive(): void {
    this.svc.listActivations(false).pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => (this.active = r.data ?? []) });
  }
  loadSuggestions(): void {
    this.svc.getSuggestions().pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => (this.suggestions = r.data ?? []) });
  }

  // ── Activation ──
  openActivate(code: EmergencyCodeDef): void {
    this.modalCode = code;
    this.draft = this.blankDraft();
    this.errorMessage = '';
  }
  activateFromSuggestion(s: CodeSuggestion): void {
    const def = this.codes.find((c) => c.code === s.code);
    if (!def) return;
    this.modalCode = def;
    this.draft = {
      location: s.location, note: s.reason,
      admissionId: s.admissionId ?? null, patientName: s.patientName ?? null,
      autoSuggested: true,
    };
    this.errorMessage = '';
  }
  closeModal(): void { this.modalCode = null; }

  confirmActivate(): void {
    if (!this.modalCode) return;
    if (!this.draft.location.trim()) { this.errorMessage = 'Location is required.'; return; }
    this.saving = true;
    this.svc.activate({
      code: this.modalCode.code,
      location: this.draft.location.trim(),
      note: this.draft.note.trim() || null,
      admissionId: this.draft.admissionId,
      patientName: this.draft.patientName,
      autoSuggested: this.draft.autoSuggested,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r: ActivateResponse) => {
        this.saving = false;
        this.lastDial = { label: r.data.situation, number: r.dial.number, script: r.dial.script, extra: r.dial.extra };
        this.modalCode = null;
        this.loadActive();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to activate code'; },
    });
  }

  async resolve(a: CodeActivation): Promise<void> {
    if (!await this.alertSvc.confirm(`Stand down ${a.code.toUpperCase()} at ${a.location}?`, { severity: 'warning', confirmLabel: 'Stand down' })) return;
    this.svc.resolve(a.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.active = this.active.filter((x) => x.id !== a.id); },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to resolve'; },
    });
  }

  // Phase 5i — mark team arrival on a Code Blue (powers PSQ-014 numerator).
  markAttended(a: CodeActivation): void {
    if (a.attendedAt) return;
    this.svc.markAttended(a.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        const idx = this.active.findIndex((x) => x.id === a.id);
        if (idx >= 0) this.active[idx] = r.data;
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to mark attended'; },
    });
  }

  dismissDial(): void { this.lastDial = null; }
}
