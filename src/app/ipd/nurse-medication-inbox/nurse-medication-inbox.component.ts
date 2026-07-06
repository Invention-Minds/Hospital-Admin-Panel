import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, startWith } from 'rxjs/operators';

import { PharmacyHandshakeService, HandshakeRx } from '../../services/pharmacy-handshake.service';

/**
 * Phase P — Nurse medication inbox.
 *
 * Route: /nurse/medication-inbox
 * Lists scripts pharmacy has dispensed and the ward hasn't collected yet.
 * Per-row actions: Confirm received (partial qty allowed) + Return-to-pharmacy.
 * Until the row leaves this inbox the MAR refuses to record administration.
 */
@Component({
  selector: 'app-nurse-medication-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nurse-medication-inbox.component.html',
  styleUrls: ['./nurse-medication-inbox.component.css'],
})
export class NurseMedicationInboxComponent implements OnInit, OnDestroy {
  rows: HandshakeRx[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  collectDraft: Record<string, string> = {};
  returnDraft: Record<string, string> = {};

  private destroy$ = new Subject<void>();
  constructor(private svc: PharmacyHandshakeService) {}

  ngOnInit(): void {
    interval(30000)
      .pipe(startWith(0), takeUntil(this.destroy$), switchMap(() => this.svc.nurseInbox()))
      .subscribe({
        next: (r) => { this.rows = r.data ?? []; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load inbox'; this.loading = false; },
      });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  collect(rx: HandshakeRx): void {
    const raw = this.collectDraft[rx.id]?.trim();
    const qty = raw ? Number(raw) : undefined;
    if (qty != null && (Number.isNaN(qty) || qty <= 0)) { this.errorMessage = 'Qty must be a positive number.'; return; }
    this.svc.collect(rx.id, qty).subscribe({
      next: (r) => {
        this.successMessage = r.fullyCollected
          ? `Collected ${rx.genericName}.`
          : `Partial collection recorded.`;
        this.collectDraft[rx.id] = '';
        setTimeout(() => this.successMessage = '', 2500);
        this.refresh();
      },
      error: (e) => this.errorMessage = e?.error?.error || 'Collect failed',
    });
  }
  returnRx(rx: HandshakeRx): void {
    const reason = (this.returnDraft[rx.id] || '').trim();
    if (reason.length < 3) { this.errorMessage = 'Reason is required.'; return; }
    this.svc.returnRx(rx.id, reason).subscribe({
      next: () => {
        this.successMessage = `Returned ${rx.genericName} to pharmacy.`;
        this.returnDraft[rx.id] = '';
        setTimeout(() => this.successMessage = '', 2500);
        this.refresh();
      },
      error: (e) => this.errorMessage = e?.error?.error || 'Return failed',
    });
  }
  private refresh(): void {
    this.svc.nurseInbox().subscribe({ next: (r) => (this.rows = r.data ?? []) });
  }
}
