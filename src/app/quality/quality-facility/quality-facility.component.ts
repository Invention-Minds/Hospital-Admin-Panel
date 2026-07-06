import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  QualityService,
  FacilityEquipment, EquipmentCreateBody,
  FacilityEquipmentEvent, EquipmentEventCreateBody, EquipmentEventType,
  FacilityUtilityFailure, UtilityFailureCreateBody, UtilityType,
  FacilityAmbulanceCall, AmbulanceCallCreateBody,
  FacilityMaintenanceComplaint, MaintenanceCreateBody, MaintenanceStatus, MaintenanceType,
} from '../../services/quality.service';

type Tab = 'equipment' | 'utility' | 'ambulance' | 'maintenance';

/**
 * Phase 9.26 / Phase 5f — Facility / equipment / ambulance / maintenance capture.
 * Route: /quality/facility
 *
 * Four tabs sharing one shell. Powers FMS-001/002/003/004/008/009 auto-source.
 * (FMS-007 security uses Phase 5c denominator pattern on /quality/denominators.)
 */
@Component({
  selector: 'app-quality-facility',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quality-facility.component.html',
  styleUrls: ['./quality-facility.component.css'],
})
export class QualityFacilityComponent implements OnInit, OnDestroy {
  tab: Tab = 'equipment';

  loading = false; saving = false;
  errorMessage = ''; successMessage = '';

  // Equipment state.
  equipment: FacilityEquipment[] = [];
  equipmentEvents: FacilityEquipmentEvent[] = [];
  equipDraft: EquipmentCreateBody = {
    code: '', name: '', type: '', isCritical: false, location: '', department: '',
  };
  eventDraft: EquipmentEventCreateBody = {
    equipmentId: '', eventType: 'pm', dueAt: '', occurredAt: this.todayIso(), notes: '',
  };
  readonly EVENT_TYPES: EquipmentEventType[] = ['pm', 'calibration', 'breakdown'];

  // Utility state.
  utilities: FacilityUtilityFailure[] = [];
  utilityDraft: UtilityFailureCreateBody = {
    utilityType: 'power', occurredAt: this.todayIso(), durationMinutes: null, affectedAreas: '', notes: '',
  };
  readonly UTILITY_TYPES: UtilityType[] = ['power', 'water', 'gas', 'oxygen', 'medical_gas', 'hvac', 'other'];

  // Ambulance state.
  ambulanceCalls: FacilityAmbulanceCall[] = [];
  ambulanceTarget = 8;
  ambDraft: AmbulanceCallCreateBody = {
    calledAt: this.todayIso(), dispatchedAt: null, arrivedAt: null, notes: '',
  };

  // Maintenance state.
  maintenance: FacilityMaintenanceComplaint[] = [];
  maintDraft: MaintenanceCreateBody = {
    type: 'electrical', location: '', notes: '', slaDueAt: this.todayPlusHoursIso(24),
  };
  readonly MAINT_TYPES: MaintenanceType[] = ['electrical', 'plumbing', 'biomedical', 'civil', 'other'];

  private destroy$ = new Subject<void>();

  constructor(private svc: QualityService, private router: Router) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  switchTab(t: Tab): void { this.tab = t; this.errorMessage = ''; this.successMessage = ''; this.load(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    const { start, end } = this.monthBounds();

    if (this.tab === 'equipment') {
      this.svc.listEquipment().pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => {
          this.equipment = r.data;
          if (!this.eventDraft.equipmentId && r.data.length > 0) this.eventDraft.equipmentId = r.data[0].id;
          // Load this month's events too so the table below shows them.
          this.svc.listEquipmentEvents({ from: start, to: end }).pipe(takeUntil(this.destroy$)).subscribe({
            next: (re) => { this.equipmentEvents = re.data; this.loading = false; },
            error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load events'; this.loading = false; },
          });
        },
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load equipment'; this.loading = false; },
      });
    } else if (this.tab === 'utility') {
      this.svc.listUtilityFailures({ from: start, to: end }).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.utilities = r.data; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load'; this.loading = false; },
      });
    } else if (this.tab === 'ambulance') {
      this.svc.listAmbulanceCalls({ from: start, to: end }).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => {
          this.ambulanceCalls = r.data; this.ambulanceTarget = r.target; this.loading = false;
        },
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load'; this.loading = false; },
      });
    } else {
      this.svc.listMaintenanceComplaints({ from: start, to: end }).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.maintenance = r.data; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load'; this.loading = false; },
      });
    }
  }

  // ── Equipment handlers ───────────────────────────────────────────────
  submitEquipment(): void {
    if (!this.equipDraft.code.trim() || !this.equipDraft.name.trim()) {
      this.errorMessage = 'Code and name are required'; return;
    }
    this.saving = true; this.errorMessage = ''; this.successMessage = '';
    this.svc.createEquipment({
      code: this.equipDraft.code.trim(), name: this.equipDraft.name.trim(),
      type: this.equipDraft.type || undefined,
      isCritical: !!this.equipDraft.isCritical,
      location: this.equipDraft.location || undefined,
      department: this.equipDraft.department || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.successMessage = 'Equipment added';
        setTimeout(() => (this.successMessage = ''), 2500);
        this.equipDraft = { code: '', name: '', type: '', isCritical: false, location: '', department: '' };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to add'; },
    });
  }

  toggleCritical(eq: FacilityEquipment): void {
    this.svc.updateEquipment(eq.id, { isCritical: !eq.isCritical }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: (e) => (this.errorMessage = e?.error?.message || 'Failed to update'),
    });
  }

  submitEvent(): void {
    if (!this.eventDraft.equipmentId) { this.errorMessage = 'Pick an equipment row'; return; }
    this.saving = true; this.errorMessage = ''; this.successMessage = '';
    this.svc.createEquipmentEvent({
      equipmentId: this.eventDraft.equipmentId,
      eventType: this.eventDraft.eventType,
      dueAt: this.eventDraft.dueAt || undefined,
      occurredAt: this.eventDraft.occurredAt || undefined,
      resolvedAt: this.eventDraft.resolvedAt || undefined,
      notes: this.eventDraft.notes || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.successMessage = 'Event logged';
        setTimeout(() => (this.successMessage = ''), 2500);
        this.eventDraft = { ...this.eventDraft, dueAt: '', occurredAt: this.todayIso(), notes: '' };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to log'; },
    });
  }

  // ── Utility handlers ─────────────────────────────────────────────────
  submitUtility(): void {
    this.saving = true; this.errorMessage = ''; this.successMessage = '';
    this.svc.createUtilityFailure({
      utilityType: this.utilityDraft.utilityType,
      occurredAt: this.utilityDraft.occurredAt || undefined,
      durationMinutes: this.utilityDraft.durationMinutes ?? null,
      affectedAreas: this.utilityDraft.affectedAreas || undefined,
      notes: this.utilityDraft.notes || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.successMessage = 'Recorded';
        setTimeout(() => (this.successMessage = ''), 2500);
        this.utilityDraft = { utilityType: this.utilityDraft.utilityType, occurredAt: this.todayIso(),
          durationMinutes: null, affectedAreas: '', notes: '' };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to record'; },
    });
  }

  // ── Ambulance handlers ───────────────────────────────────────────────
  submitAmbulance(): void {
    if (!this.ambDraft.calledAt) { this.errorMessage = 'Called-at time is required'; return; }
    this.saving = true; this.errorMessage = ''; this.successMessage = '';
    this.svc.createAmbulanceCall({
      calledAt: this.ambDraft.calledAt,
      dispatchedAt: this.ambDraft.dispatchedAt || undefined,
      arrivedAt: this.ambDraft.arrivedAt || undefined,
      notes: this.ambDraft.notes || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.saving = false; this.ambulanceTarget = r.target;
        this.successMessage = r.data.withinTarget ? 'Recorded — within target ✓' : 'Recorded — outside target';
        setTimeout(() => (this.successMessage = ''), 2500);
        this.ambDraft = { calledAt: this.todayIso(), dispatchedAt: null, arrivedAt: null, notes: '' };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to record'; },
    });
  }

  // ── Maintenance handlers ─────────────────────────────────────────────
  submitMaintenance(): void {
    if (!this.maintDraft.slaDueAt) { this.errorMessage = 'SLA due-by is required'; return; }
    this.saving = true; this.errorMessage = ''; this.successMessage = '';
    this.svc.createMaintenanceComplaint({
      type: this.maintDraft.type,
      location: this.maintDraft.location || undefined,
      notes: this.maintDraft.notes || undefined,
      slaDueAt: this.maintDraft.slaDueAt,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.successMessage = 'Ticket raised';
        setTimeout(() => (this.successMessage = ''), 2500);
        this.maintDraft = { type: this.maintDraft.type, location: '', notes: '', slaDueAt: this.todayPlusHoursIso(24) };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to raise'; },
    });
  }

  changeMaintenanceStatus(c: FacilityMaintenanceComplaint, status: MaintenanceStatus): void {
    this.svc.updateMaintenanceStatus(c.id, status).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: (e) => (this.errorMessage = e?.error?.message || 'Failed to update'),
    });
  }
  maintenanceSlaPill(c: FacilityMaintenanceComplaint): string {
    if (c.status === 'closed') {
      return c.closedAt && c.closedAt <= c.slaDueAt ? 'q-good' : 'q-bad';
    }
    return new Date(c.slaDueAt) < new Date() ? 'q-bad' : 'q-warn';
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  private todayPlusHoursIso(hours: number): string {
    const d = new Date(Date.now() + hours * 60 * 60 * 1000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  private monthBounds(): { start: string; end: string } {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    return { start, end };
  }

  goBack(): void { this.router.navigate(['/quality/indicators']); }
}
