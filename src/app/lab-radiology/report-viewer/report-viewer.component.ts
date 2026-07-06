import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { InvestigationResult, InvestigationResultService } from '../../services/investigation-result.service';

/**
 * Phase 9.11 — Reusable PDF result viewer modal.
 *
 * Shows the report PDF (iframe) on the left, metadata + critical-flag
 * acknowledge action on the right. Opens whenever a result row is
 * clicked from the patient/admission reports tab or the lab/radiology
 * coordinator workbench.
 *
 * Inputs:
 *   - result: the InvestigationResult to render
 *   - open : boolean to drive visibility (parent controls it)
 *
 * Outputs:
 *   - closed         : emitted when the user closes the modal
 *   - acknowledged   : emitted after a critical-flag ack succeeds
 *                       (parent should refresh the row)
 */
@Component({
  selector: 'app-report-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report-viewer.component.html',
  styleUrls: ['./report-viewer.component.css'],
})
export class ReportViewerComponent implements OnChanges {
  @Input() result: InvestigationResult | null = null;
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() acknowledged = new EventEmitter<InvestigationResult>();

  // We have to bypass Angular's URL-security check for the iframe — the GCS
  // URL is trusted and bound at runtime, so DomSanitizer wraps it.
  safeReportUrl: SafeResourceUrl | null = null;
  acking = false;
  ackError = '';

  constructor(
    private sanitizer: DomSanitizer,
    private svc: InvestigationResultService,
  ) {}

  ngOnChanges(_changes: SimpleChanges): void {
    this.ackError = '';
    if (this.result?.reportUrl) {
      this.safeReportUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.result.reportUrl);
    } else {
      this.safeReportUrl = null;
    }
  }

  close(): void {
    this.closed.emit();
  }

  acknowledge(): void {
    if (!this.result || this.acking) return;
    this.acking = true;
    this.ackError = '';
    this.svc.acknowledge(this.result.id).subscribe({
      next: (r) => {
        this.acking = false;
        if (this.result) {
          // Mutate the result locally so the UI flips immediately; parent
          // will refresh on `acknowledged` if it wants the canonical row.
          this.result = {
            ...this.result,
            acknowledgedAt: r.data.acknowledgedAt,
            acknowledgedBy: r.data.acknowledgedBy ?? this.result.acknowledgedBy,
          };
          this.acknowledged.emit(this.result);
        }
      },
      error: (e) => {
        this.acking = false;
        this.ackError = e?.error?.message ?? 'Failed to acknowledge';
      },
    });
  }

  download(): void {
    if (this.result?.reportUrl) {
      // GCS URLs serve with Content-Disposition: inline, so a real
      // download requires opening in a new tab; the user can save from there.
      window.open(this.result.reportUrl, '_blank', 'noopener,noreferrer');
    }
  }
}
