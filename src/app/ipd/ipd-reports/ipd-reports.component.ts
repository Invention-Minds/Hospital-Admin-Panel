import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { IpdService } from '../../services/ipd.service';

/**
 * Phase 9.11 — IPD admission "Reports" sub-page.
 *
 * Route: /ipd/admission/:admissionId/reports
 *
 * Renders the standard page header + admission tabs + critical banner +
 * reports timeline for the admission's PRN, date-bounded to the
 * admission's stay window. Declared in AppModule alongside the other
 * IPD admission sub-pages so PageHeader / AdmissionTabs and the new
 * standalone reports widgets all resolve through that module.
 */
@Component({
  selector: 'app-ipd-reports',
  templateUrl: './ipd-reports.component.html',
  styleUrls: ['./ipd-reports.component.css'],
})
export class IpdReportsComponent implements OnInit, OnDestroy {
  admissionId = '';
  prn = '';
  loading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private ipd: IpdService,
  ) {}

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    if (this.admissionId) this.loadAdmission();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAdmission(): void {
    this.loading = true;
    this.ipd.getAdmission(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: unknown) => {
        // GET /admission/:id returns a { message, data } envelope.
        const a = ((res as { data?: unknown })?.data ?? res) as { prn?: string } | null;
        this.prn = a?.prn ?? '';
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }
}
