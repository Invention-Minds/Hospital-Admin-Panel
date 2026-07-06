import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DayCareService, DayCareSession, DayCareStatus } from '../../services/day-care.service';

/**
 * Day-care session list — `/daycare`.
 *
 * Today's sessions by default; filterable by status. Each row is a link to
 * the monitoring page. The "New session" button routes to /daycare/new.
 */
@Component({
  selector: 'app-day-care-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './day-care-list.component.html',
  styleUrls: ['./day-care-list.component.css'],
})
export class DayCareListComponent implements OnInit, OnDestroy {
  date = new Date().toISOString().slice(0, 10);
  statusFilter: DayCareStatus | '' = '';
  sessions: DayCareSession[] = [];
  loading = false;
  errorMessage = '';

  readonly statuses: DayCareStatus[] = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'DISCHARGED', 'CANCELLED'];

  private destroy$ = new Subject<void>();

  constructor(private svc: DayCareService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.listSessions({
      date: this.date || undefined,
      status: this.statusFilter || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => { this.sessions = rows; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load sessions'; this.loading = false; },
    });
  }
}
