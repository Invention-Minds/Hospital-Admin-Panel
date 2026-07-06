import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, startWith } from 'rxjs/operators';

import { PharmacyHandshakeService, HandshakeRx } from '../../services/pharmacy-handshake.service';

/**
 * Phase P — Pharmacy coordinator queue.
 *
 * Route: /pharmacy/queue
 * Lists IpdPrescriptions sent to pharmacy and not yet fully dispensed. STAT
 * scripts pin to the top. Per-row actions: Acknowledge, Reject (with reason),
 * Dispense (supports partial qty + brand substitution).
 */
@Component({
  selector: 'app-pharmacy-queue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pharmacy-queue.component.html',
  styleUrls: ['./pharmacy-queue.component.css'],
})
export class PharmacyQueueComponent implements OnInit, OnDestroy {
  rows: HandshakeRx[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Per-row inline editors keyed by rxId.
  rejectDraft: Record<string, string> = {};
  dispenseDraft: Record<string, { qty: string; brand: string; reason: string }> = {};

  private destroy$ = new Subject<void>();
  constructor(private svc: PharmacyHandshakeService) {}

  ngOnInit(): void {
    interval(30000)
      .pipe(startWith(0), takeUntil(this.destroy$), switchMap(() => this.svc.pharmacyQueue()))
      .subscribe({
        next: (r) => { this.rows = r.data ?? []; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load queue'; this.loading = false; },
      });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  ack(rx: HandshakeRx): void {
    this.svc.ack(rx.id).subscribe({
      next: () => { this.successMessage = `Acknowledged ${rx.genericName}.`; this.timed(); this.refresh(); },
      error: (e) => this.errorMessage = e?.error?.error || 'Ack failed',
    });
  }
  reject(rx: HandshakeRx): void {
    const reason = (this.rejectDraft[rx.id] || '').trim();
    if (reason.length < 3) { this.errorMessage = 'Reason is required.'; return; }
    this.svc.reject(rx.id, reason).subscribe({
      next: () => { this.successMessage = `Rejected ${rx.genericName}.`; this.rejectDraft[rx.id] = ''; this.timed(); this.refresh(); },
      error: (e) => this.errorMessage = e?.error?.error || 'Reject failed',
    });
  }
  draftFor(rx: HandshakeRx): { qty: string; brand: string; reason: string } {
    if (!this.dispenseDraft[rx.id]) this.dispenseDraft[rx.id] = { qty: '', brand: '', reason: '' };
    return this.dispenseDraft[rx.id];
  }
  dispense(rx: HandshakeRx): void {
    const d = this.draftFor(rx);
    const qty = d.qty.trim() ? Number(d.qty) : undefined;
    if (qty != null && (Number.isNaN(qty) || qty <= 0)) { this.errorMessage = 'Quantity must be a positive number.'; return; }
    this.svc.dispense(rx.id, {
      dispensedQty: qty,
      substitutedBrand: d.brand.trim() || undefined,
      substitutedReason: d.reason.trim() || undefined,
    }).subscribe({
      next: (r) => {
        this.successMessage = r.fullyDispensed
          ? `Fully dispensed ${rx.genericName}.`
          : `Partial dispense recorded for ${rx.genericName}.`;
        this.dispenseDraft[rx.id] = { qty: '', brand: '', reason: '' };
        this.timed(); this.refresh();
      },
      error: (e) => this.errorMessage = e?.error?.error || 'Dispense failed',
    });
  }

  private refresh(): void {
    this.svc.pharmacyQueue().subscribe({ next: (r) => (this.rows = r.data ?? []) });
  }
  private timed(): void { setTimeout(() => this.successMessage = '', 2500); }

  stockWarning(rx: HandshakeRx): string | null {
    if (!rx.stockProbeJson) return null;
    try {
      const probe = JSON.parse(rx.stockProbeJson);
      return probe?.warning ?? null;
    } catch { return null; }
  }
}
