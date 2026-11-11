import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { firstValueFrom } from 'rxjs';
import {
  IncidentService, CreateIncidentPayload, IncidentSeverity, IncidentCategory,
  HarmLevel, HARM_OPTIONS, HARM_TO_SEVERITY, IncidentTaxonomyCategory,
} from '../../services/incident.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { isIncidentManager } from '../../quality/quality-access';
import { QualityUnitService, HospitalUnit } from '../../services/quality-unit.service';

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
export class IncidentRaiseComponent implements OnInit {
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
    title: '',
    description: '',
    nabhClause: null,
    qiCode: null,
    occurredAt: null,
  };
  saving = false;
  errorMessage = '';
  // QI tag + NABH clause drive indicator numerators — managers classify; the
  // backend ignores them from anyone else.
  readonly isManager = isIncidentManager();

  // Editable context — pre-filled from @Inputs when raised from a patient
  // screen; department/ward decide which managers can see the incident.
  ctx = { patientPrn: '', patientName: '', ward: '', department: '' };
  departments: string[] = [];
  // Hospital unit that owns the incident (its HOD investigates). Blank = the
  // backend works it out from the ward / department.
  units: HospitalUnit[] = [];
  unitId: number | null = null;

  readonly CATEGORIES: IncidentCategory[] = ['clinical', 'medication', 'documentation', 'fall', 'infection', 'equipment', 'behavioural', 'security', 'other'];
  // Harm-based severity — two plain questions; the severity is derived (same
  // mapping as the backend) and only shown back to the reporter.
  readonly HARM_OPTIONS = HARM_OPTIONS;
  reached: boolean | null = null;
  harm: HarmLevel | null = null;

  get harmLevel(): HarmLevel | null {
    if (this.reached === false) return 'not_reached';
    return this.reached === true ? this.harm : null;
  }
  get derivedSeverity(): IncidentSeverity | null {
    const h = this.harmLevel;
    return h ? HARM_TO_SEVERITY[h] : null;
  }

  // Sub-types (served by the API so staff form, QR form and server share one list).
  taxonomy: IncidentTaxonomyCategory[] = [];
  subCategory: string | null = null;
  get subtypes(): Array<{ key: string; label: string }> {
    return this.taxonomy.find((c) => c.category === this.draft.category)?.subtypes ?? [];
  }
  onCategoryChange(): void { this.subCategory = null; }

  // Report anonymously — the reporter's name is never stored. They can't
  // attach files or follow it up afterwards, so attachments are disabled.
  anonymous = false;
  files: File[] = [];
  fileError = '';
  readonly MAX_FILE = 10 * 1024 * 1024;
  onFiles(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []);
    const big = picked.filter((f) => f.size > this.MAX_FILE);
    this.fileError = big.length ? `${big.map((f) => f.name).join(', ')} is over 10 MB and was left out.` : '';
    this.files = [...this.files, ...picked.filter((f) => f.size <= this.MAX_FILE)].slice(0, 5);
    input.value = '';
  }
  removeFile(f: File): void { this.files = this.files.filter((x) => x !== f); }
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

  constructor(
    private svc: IncidentService, private doctorService: DoctorServiceService, private unitSvc: QualityUnitService,
  ) {}

  ngOnInit(): void {
    this.ctx = {
      patientPrn: this.patientPrn ?? '',
      patientName: this.patientName ?? '',
      ward: this.ward ?? '',
      department: this.department ?? '',
    };
    this.doctorService.getDepartments().subscribe({
      next: (rows: Array<{ name?: string }>) => {
        this.departments = (rows ?? []).map((d) => d.name ?? '').filter(Boolean).sort();
      },
      error: () => { /* picker is best-effort */ },
    });
    this.unitSvc.list(true).subscribe({
      next: (r) => { this.units = r.data ?? []; },
      error: () => { /* picker is best-effort — routing still resolves server-side */ },
    });
    this.svc.taxonomy().subscribe({ next: (r) => { this.taxonomy = r.data ?? []; }, error: () => { /* sub-type is optional */ } });
  }

  save(): void {
    if (this.saving) return;
    this.errorMessage = '';
    if (!this.draft.title.trim() || this.draft.title.trim().length < 3) { this.errorMessage = 'Title is required (min 3 chars).'; return; }
    if (!this.draft.description.trim()) { this.errorMessage = 'Description is required.'; return; }
    const harmLevel = this.harmLevel;
    if (!harmLevel) {
      this.errorMessage = this.reached === true ? 'Choose what harm was caused.' : 'Say whether it reached the patient.';
      return;
    }
    this.saving = true;
    const payload: CreateIncidentPayload = {
      ...this.draft,
      harmLevel,
      subCategory: this.subCategory,
      anonymous: this.anonymous,
      title: this.draft.title.trim(),
      description: this.draft.description.trim(),
      patientPrn: this.ctx.patientPrn.trim() || null,
      patientName: this.ctx.patientName.trim() || null,
      admissionId: this.admissionId,
      emergencyId: this.emergencyId,
      appointmentId: this.appointmentId,
      ward: this.ctx.ward.trim() || null,
      department: this.ctx.department || null,
      unitId: this.unitId,
      occurredAt: this.draft.occurredAt ? new Date(this.draft.occurredAt).toISOString() : null,
    };
    this.svc.create(payload).subscribe({
      next: (r) => { void this.uploadThenClose(r.data.id); },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to raise incident'; },
    });
  }

  /** Attach the chosen files to the new incident, then close. A failed upload doesn't undo the report. */
  private async uploadThenClose(incidentId: string): Promise<void> {
    const failed: string[] = [];
    if (!this.anonymous) {
      for (const f of this.files) {
        try { await firstValueFrom(this.svc.uploadEvidence(incidentId, f)); } catch { failed.push(f.name); }
      }
    }
    this.saving = false;
    if (failed.length) {
      alert(`The incident was raised, but these files could not be attached: ${failed.join(', ')}. Attach them from the incident page.`);
    }
    this.raised.emit();
  }

  cancel(): void { this.closed.emit(); }
}
