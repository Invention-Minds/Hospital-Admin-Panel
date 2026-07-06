import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

import {
  DischargeClearanceService, DischargeClearance, DischargeGate,
  DischargeDepartment, DISCHARGE_DEPARTMENTS,
} from '../../services/discharge-clearance.service';

/**
 * Phase D — Discharge clearance board for a single admission.
 *
 * One row per department with current status + cleared/rejected metadata,
 * a "Finalize discharge" button that lights up only when the gate is fully
 * green, and quick clear / reject actions for the logged-in user's role.
 * Routed from the IPD admission detail page.
 */
@Component({
  selector: 'app-discharge-clearance-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './discharge-clearance-board.component.html',
  styleUrls: ['./discharge-clearance-board.component.css'],
})
export class DischargeClearanceBoardComponent implements OnInit, OnChanges {
  @Input() admissionId = '';
  @Input() admissionNo = '';

  rows: DischargeClearance[] = [];
  gate: DischargeGate | null = null;
  loading = false;

  // Per-row inline editors.
  readonly DEPARTMENTS = DISCHARGE_DEPARTMENTS;
  rejectDraft: Record<string, string> = {};
  clearDraft: Record<string, string> = {};
  abandonReason = '';
  abandonOpen = false;

  constructor(private svc: DischargeClearanceService, private messages: MessageService) {}

  /** Floating toast (global <p-toast>) — stays visible when scrolled. */
  private toast(severity: 'success' | 'error' | 'warn', detail: string): void {
    const summary = severity === 'success' ? 'Success' : severity === 'error' ? 'Error' : 'Discharge';
    this.messages.add({ severity, summary, detail });
  }

  ngOnInit(): void { if (this.admissionId) this.load(); }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['admissionId'] && this.admissionId) this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.list(this.admissionId).subscribe({
      next: (r) => { this.rows = r.data.rows; this.gate = r.data.gate; this.loading = false; },
      error: (e) => { this.toast('error', e?.error?.error || 'Failed to load clearances'); this.loading = false; },
    });
  }

  clear(dept: DischargeDepartment): void {
    const notes = this.clearDraft[dept]?.trim();
    this.svc.clear(this.admissionId, dept, { notes: notes || undefined }).subscribe({
      next: (r) => {
        this.gate = r.gate;
        this.toast('success', `${dept} cleared.`);
        this.clearDraft[dept] = '';
        this.load();
      },
      error: (e) => { this.toast('error', e?.error?.error || `Failed to clear ${dept}`); },
    });
  }

  reject(dept: DischargeDepartment): void {
    const reason = this.rejectDraft[dept]?.trim();
    if (!reason || reason.length < 3) { this.toast('warn', 'Reason is required.'); return; }
    this.svc.reject(this.admissionId, dept, reason).subscribe({
      next: () => {
        this.toast('success', `${dept} rejected.`);
        this.rejectDraft[dept] = '';
        this.load();
      },
      error: (e) => { this.toast('error', e?.error?.error || `Failed to reject ${dept}`); },
    });
  }

  finalize(): void {
    if (!this.gate?.eligible) return;
    this.svc.finalize(this.admissionId).subscribe({
      next: () => {
        this.toast('success', 'Patient discharged. Bed freed.');
        this.load();
      },
      error: (e) => {
        // 409 → server-side gate failed (race or stale UI).
        this.toast('error', e?.error?.error || 'Discharge gate failed. Refresh and try again.');
      },
    });
  }

  abandon(): void {
    const reason = this.abandonReason.trim();
    if (reason.length < 3) { this.toast('warn', 'Reason is required.'); return; }
    this.svc.abandon(this.admissionId, reason).subscribe({
      next: () => {
        this.toast('success', 'Discharge chain abandoned.');
        this.abandonOpen = false; this.abandonReason = '';
        this.load();
      },
      error: (e) => { this.toast('error', e?.error?.error || 'Failed to abandon'); },
    });
  }

  rowFor(dept: DischargeDepartment): DischargeClearance | null {
    return this.rows.find((r) => r.department === dept) ?? null;
  }
}
