import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  InvestigationResultService,
  InvestigationResult,
  ResultDepartment,
  ResultStatus,
  UploadResultBody,
} from '../../services/investigation-result.service';

/**
 * Phase 9.11 — Upload modal for an InvestigationResult.
 *
 * Triggered from:
 *   • Reports admin page (per pending-order row)
 *   • Investigation order rows on the OPD/IPD prescription views (future)
 *
 * Inputs:
 *   - open                  : modal visibility (parent-controlled)
 *   - orderId               : the InvestigationOrder this result attaches to
 *   - prnLabel              : displayed for context (read-only)
 *   - testName, department  : pre-filled when the trigger knows them
 *
 * Outputs:
 *   - closed : modal dismissed
 *   - saved  : InvestigationResult created — parent should refresh
 */
@Component({
  selector: 'app-report-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-upload.component.html',
  styleUrls: ['./report-upload.component.css'],
})
export class ReportUploadComponent implements OnChanges {
  @Input() open = false;
  @Input() orderId: number | null = null;
  @Input() prnLabel = '';
  @Input() testName = '';
  @Input() department: ResultDepartment = 'lab';

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<InvestigationResult>();

  // Form state
  draft: UploadResultBody = this.emptyDraft();
  file: File | null = null;
  fileName = '';
  fileError = '';
  saving = false;
  errorMessage = '';

  readonly statusOptions: ResultStatus[] = ['pending', 'partial', 'final'];

  constructor(private svc: InvestigationResultService) {}

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.open) {
      // Re-seed the form whenever the modal is (re)opened so the parent's
      // latest orderId / testName / department lands in the draft.
      this.draft = {
        ...this.emptyDraft(),
        orderId: this.orderId ?? 0,
        testName: this.testName ?? '',
        department: this.department ?? 'lab',
      };
      this.file = null;
      this.fileName = '';
      this.fileError = '';
      this.errorMessage = '';
    }
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    this.fileError = '';
    if (!f) { this.file = null; this.fileName = ''; return; }
    if (f.size > 25 * 1024 * 1024) {
      this.fileError = 'File exceeds 25 MB limit';
      this.file = null;
      this.fileName = '';
      input.value = '';
      return;
    }
    // We accept PDF + common image types since some smaller diagnostic
    // labs share JPEG/PNG scans rather than PDFs. Browser embeds both
    // natively in <iframe>.
    const ok = /\.(pdf|jpg|jpeg|png)$/i.test(f.name);
    if (!ok) {
      this.fileError = 'Only PDF or image files (PDF/JPG/PNG) are accepted';
      this.file = null;
      this.fileName = '';
      input.value = '';
      return;
    }
    this.file = f;
    this.fileName = f.name;
  }

  save(): void {
    if (this.saving) return;
    this.errorMessage = '';

    if (!this.draft.orderId) { this.errorMessage = 'Order ID is required'; return; }
    if (!this.draft.testName?.trim()) { this.errorMessage = 'Test name is required'; return; }
    if (!this.draft.department) { this.errorMessage = 'Department is required'; return; }
    if (!this.draft.status) { this.errorMessage = 'Status is required'; return; }

    // For "final" status we strongly encourage a file, but don't enforce —
    // some hospitals enter results manually and attach the PDF later.

    this.saving = true;
    this.svc.upload(this.draft, this.file).subscribe({
      next: (r) => {
        this.saving = false;
        this.saved.emit(r.data);
      },
      error: (e) => {
        this.saving = false;
        this.errorMessage = e?.error?.message ?? 'Upload failed';
      },
    });
  }

  close(): void {
    if (this.saving) return;
    this.closed.emit();
  }

  private emptyDraft(): UploadResultBody {
    return {
      orderId: this.orderId ?? 0,
      testName: this.testName ?? '',
      department: this.department ?? 'lab',
      status: 'final',
      result: '',
      unit: '',
      referenceRange: '',
      findings: '',
      impression: '',
      criticalFlag: false,
      reportedAt: new Date().toISOString().slice(0, 16),
    };
  }
}
