import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { InvestigationResultService, InvestigationResult } from '../../services/investigation-result.service';
import { ReportViewerComponent } from '../report-viewer/report-viewer.component';

/**
 * Phase 9.11 — Critical-result banner.
 *
 * Embed at the top of patient profile / IPD admission detail. Polls the
 * unacknowledged critical results for the PRN; renders a red banner if
 * any exist. Click → opens the viewer modal which exposes the ack action.
 */
@Component({
  selector: 'app-critical-result-banner',
  standalone: true,
  imports: [CommonModule, ReportViewerComponent],
  templateUrl: './critical-result-banner.component.html',
  styleUrls: ['./critical-result-banner.component.css'],
})
export class CriticalResultBannerComponent implements OnChanges, OnDestroy {
  @Input() prn = '';

  rows: InvestigationResult[] = [];
  expanded = false;

  viewerOpen = false;
  viewerResult: InvestigationResult | null = null;

  private destroy$ = new Subject<void>();

  constructor(private svc: InvestigationResultService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prn']) this.load();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    if (!this.prn) return;
    this.svc.unackCritical(this.prn, 7).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data ?? []; },
      error: () => { /* swallow — banner is best-effort, not blocking */ },
    });
  }

  toggle(): void { this.expanded = !this.expanded; }

  open(r: InvestigationResult): void {
    this.viewerResult = r;
    this.viewerOpen = true;
  }

  onViewerClosed(): void {
    this.viewerOpen = false;
    this.viewerResult = null;
  }

  onAcknowledged(updated: InvestigationResult): void {
    // Drop the acknowledged row from the banner list immediately.
    this.rows = this.rows.filter((r) => r.id !== updated.id);
    if (!this.rows.length) this.expanded = false;
  }
}
