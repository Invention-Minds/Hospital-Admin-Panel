import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IncidentService, CreateIncidentPayload, IncidentSeverity, IncidentCategory } from '../../services/incident.service';

/**
 * Phase 9.24 / Phase 1 — Reusable "raise incident" modal.
 *
 * Drop in anywhere; pass patient/encounter context via @Inputs and we'll
 * pre-fill the form. The host listens for `(raised)` to refresh, and
 * `(closed)` for cancel.
 */
@Component({
  selector: 'app-incident-raise',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './incident-raise.component.html',
  styleUrls: ['./incident-raise.component.css'],
})
export class IncidentRaiseComponent {
  @Input() patientPrn: string | null = null;
  @Input() patientName: string | null = null;
  @Input() admissionId: string | null = null;
  @Input() emergencyId: number | null = null;
  @Input() appointmentId: number | null = null;
  @Input() ward: string | null = null;
  @Input() department: string | null = null;

  @Output() raised = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  draft: CreateIncidentPayload = {
    category: 'clinical',
    severity: 'minor',
    title: '',
    description: '',
    nabhClause: null,
    qiCode: null,
    occurredAt: null,
  };
  saving = false;
  errorMessage = '';

  readonly CATEGORIES: IncidentCategory[] = ['clinical', 'medication', 'documentation', 'fall', 'infection', 'equipment', 'behavioural', 'security', 'other'];
  readonly SEVERITIES: IncidentSeverity[] = ['near_miss', 'minor', 'moderate', 'major', 'sentinel'];
  // Phase 5c — QI indicator codes that explicitly need tagged incidents.
  readonly QI_CODES: string[] = [
    'PSQ-016', 'PSQ-017', 'PSQ-018', 'PSQ-019', 'PSQ-020', 'PSQ-021', 'PSQ-022',
    'PSQ-023', 'PSQ-026', 'PSQ-027', 'PRE-010',
    'OT-002', 'OT-005', 'OT-006', 'OT-007',
    // Phase 5e — billing errors + application downtime (Incident-bridged).
    'OPS-001', 'OPS-009',
    // Phase 5h — wrong site / procedure / person surgery (denominator from OT).
    'PSQ-030',
  ];

  constructor(private svc: IncidentService) {}

  save(): void {
    if (this.saving) return;
    this.errorMessage = '';
    if (!this.draft.title.trim() || this.draft.title.trim().length < 3) { this.errorMessage = 'Title is required (min 3 chars).'; return; }
    if (!this.draft.description.trim()) { this.errorMessage = 'Description is required.'; return; }
    this.saving = true;
    const payload: CreateIncidentPayload = {
      ...this.draft,
      title: this.draft.title.trim(),
      description: this.draft.description.trim(),
      patientPrn: this.patientPrn,
      patientName: this.patientName,
      admissionId: this.admissionId,
      emergencyId: this.emergencyId,
      appointmentId: this.appointmentId,
      ward: this.ward,
      department: this.department,
      occurredAt: this.draft.occurredAt ? new Date(this.draft.occurredAt).toISOString() : null,
    };
    this.svc.create(payload).subscribe({
      next: () => { this.saving = false; this.raised.emit(); },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to raise incident'; },
    });
  }

  cancel(): void { this.closed.emit(); }
}
