import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { OtArchivesService, OtArchivesResponse } from '../../services/ot-archives.service';

type ArchivesSection =
  | 'dashboard'
  | 'op-visits'
  | 'ip-visits'
  | 'laboratory'
  | 'radiology'
  | 'surgical'
  | 'discharges';

/**
 * Phase 9.5c — OT Archives (patient profile view).
 *
 * Left sidebar with sections (Dashboard, OP Visits, IP Visits, Laboratory,
 * Radiology, Surgical History, Discharges); right panel renders the
 * selected section. Mirrors the reference HMIS Archives modal.
 *
 * Route: /surgery-ot/archives/:prn
 */
@Component({
  selector: 'app-ot-archives',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ot-archives.component.html',
  styleUrls: ['./ot-archives.component.css'],
})
export class OtArchivesComponent implements OnInit, OnDestroy {
  prn = '';
  fromDate = '';
  toDate = '';
  section: ArchivesSection = 'dashboard';

  payload: OtArchivesResponse['data'] | null = null;
  loading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: OtArchivesService,
  ) {}

  ngOnInit(): void {
    this.prn = this.route.snapshot.paramMap.get('prn') ?? '';
    const now = new Date();
    const back = new Date(now);
    back.setDate(back.getDate() - 180);
    this.fromDate = back.toISOString().slice(0, 10);
    this.toDate = now.toISOString().slice(0, 10);
    if (this.prn) this.load();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    if (!this.prn) return;
    this.loading = true;
    this.errorMessage = '';
    this.svc.get(this.prn, { fromDate: this.fromDate, toDate: this.toDate, reportLimit: 25 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { this.payload = r.data; this.loading = false; },
        error: () => { this.errorMessage = 'Failed to load archives'; this.loading = false; },
      });
  }

  setSection(s: ArchivesSection): void { this.section = s; }
  close(): void { this.router.navigate(['/surgery-ot']); }
}
