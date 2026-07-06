import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { OtIssuedDrugsService, IssuedDrugsResponse } from '../../services/ot-issued-drugs.service';

/**
 * Phase 9.5d — View Issued Drugs (read-only).
 *
 * Two tabs: Summary (net per item) and Ledger (every row).
 * Route: /surgery-ot/:id/issued-drugs
 */
@Component({
  selector: 'app-ot-issued-drugs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ot-issued-drugs.component.html',
  styleUrls: ['./ot-issued-drugs.component.css'],
})
export class OtIssuedDrugsComponent implements OnInit, OnDestroy {
  scheduleId = '';
  tab: 'summary' | 'ledger' = 'summary';
  payload: IssuedDrugsResponse | null = null;
  loading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: OtIssuedDrugsService,
  ) {}

  ngOnInit(): void {
    this.scheduleId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.scheduleId) this.load();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.forSchedule(this.scheduleId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.payload = r; this.loading = false; },
      error: () => { this.errorMessage = 'Failed to load issued drugs'; this.loading = false; },
    });
  }

  print(): void { window.print(); }
  close(): void { this.router.navigate(['/surgery-ot', this.scheduleId]); }
}
