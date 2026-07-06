import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DoorstepRequest, DoorstepService, DoorstepStatus } from '../services/doorstep.service';

/**
 * Doorstep service requests inbox (ops). Route: /doorstep-requests
 * Lists lab-pickup / pharmacy-delivery requests from the WhatsApp bot and lets
 * staff move them through scheduled → completed (or cancel).
 */
@Component({
  selector: 'app-doorstep-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doorstep-requests.component.html',
  styleUrls: ['./doorstep-requests.component.css'],
})
export class DoorstepRequestsComponent implements OnInit, OnDestroy {
  rows: DoorstepRequest[] = [];
  statusFilter = 'pending';
  loading = false;
  errorMessage = '';
  savingId: number | null = null;

  private destroy$ = new Subject<void>();
  constructor(private svc: DoorstepService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true; this.errorMessage = '';
    this.svc.inbox(this.statusFilter || undefined).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data ?? []; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load requests'; this.loading = false; },
    });
  }

  setStatus(r: DoorstepRequest, status: DoorstepStatus): void {
    this.savingId = r.id;
    this.svc.updateStatus(r.id, status).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.savingId = null; this.load(); },
      error: (e) => { this.savingId = null; this.errorMessage = e?.error?.message || 'Update failed'; },
    });
  }

  serviceLabel(r: DoorstepRequest): string {
    return r.serviceType === 'PHARMACY_DELIVERY' ? 'Pharmacy delivery' : 'Lab sample pickup';
  }
  mapLink(r: DoorstepRequest): string | null {
    return r.lat != null && r.lng != null ? `https://www.google.com/maps?q=${r.lat},${r.lng}` : null;
  }
}
