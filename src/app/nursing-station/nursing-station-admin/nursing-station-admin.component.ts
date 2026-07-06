import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  NursingStationService, NursingStationRow, StationCreateBody,
} from '../../services/nursing-station.service';
import { WardManagementService, Ward } from '../../services/ward-management.service';
import { NurseStaffService, NurseRow } from '../../services/nurse-staff.service';
import { AlertService } from '../../services/alert.service';

/**
 * Phase NS-4 — Nursing Station admin (/nursing-stations).
 *
 * Owned by the Nursing Superintendent (+ super_admin). Lets them:
 *   • create / edit / delete nursing stations
 *   • attach wards to a station (drives nurse ward-scoping)
 *   • assign / unassign nurses to a station
 *
 * Server gates the write routes; this page is reached only by the superintendent
 * or super_admin (sidebar gate + route role guard).
 */
@Component({
  selector: 'app-nursing-station-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nursing-station-admin.component.html',
  styleUrls: ['./nursing-station-admin.component.css'],
})
export class NursingStationAdminComponent implements OnInit, OnDestroy {
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  stations: NursingStationRow[] = [];
  wards: Ward[] = [];
  nurses: NurseRow[] = [];

  // Editor state. `selected` is the station being edited; null when creating.
  selected: NursingStationRow | null = null;
  showEditor = false;
  form: StationCreateBody = this.blankForm();
  /** wardId → checked, for the ward picker. */
  wardChecked: Record<string, boolean> = {};
  /** userId → checked, for the nurse picker. */
  nurseChecked: Record<number, boolean> = {};

  private destroy$ = new Subject<void>();

  constructor(
    private stationSvc: NursingStationService,
    private wardSvc: WardManagementService,
    private nurseSvc: NurseStaffService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private blankForm(): StationCreateBody {
    return { name: '', code: '', description: '', type: 'IPD', isActive: true, wardIds: [] };
  }

  loadAll(): void {
    this.loading = true;
    this.stationSvc.list(true).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { this.stations = res.data ?? []; this.loading = false; },
      error: () => { this.errorMessage = 'Failed to load nursing stations'; this.loading = false; },
    });
    this.wardSvc.getAllWards().pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => { this.wards = rows ?? []; },
      error: () => { /* non-fatal */ },
    });
    this.nurseSvc.list({}).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { this.nurses = res.data ?? []; },
      error: () => { /* non-fatal */ },
    });
  }

  // ─── Create ────────────────────────────────────────────────────────────

  startCreate(): void {
    this.selected = null;
    this.form = this.blankForm();
    this.wardChecked = {};
    this.nurseChecked = {};
    this.showEditor = true;
    this.clearMessages();
  }

  // ─── Edit ──────────────────────────────────────────────────────────────

  startEdit(station: NursingStationRow): void {
    this.selected = station;
    this.form = {
      name: station.name,
      code: station.code,
      description: station.description ?? '',
      type: station.type ?? 'IPD',
      isActive: station.isActive,
    };
    this.wardChecked = {};
    for (const w of station.wards) this.wardChecked[w.id] = true;
    this.nurseChecked = {};
    for (const n of station.nurses) this.nurseChecked[n.id] = true;
    this.showEditor = true;
    this.clearMessages();
  }

  cancelEditor(): void {
    this.showEditor = false;
    this.selected = null;
  }

  private selectedWardIds(): string[] {
    return Object.keys(this.wardChecked).filter((k) => this.wardChecked[k]);
  }

  private selectedNurseIds(): number[] {
    return Object.keys(this.nurseChecked)
      .filter((k) => this.nurseChecked[Number(k)])
      .map((k) => Number(k));
  }

  // ─── Save (create or update + sync wards/nurses) ─────────────────────────

  async save(): Promise<void> {
    this.clearMessages();
    if (!this.form.name?.trim()) { this.errorMessage = 'Name is required'; return; }
    if (!this.form.code?.trim()) { this.errorMessage = 'Code is required'; return; }
    this.saving = true;

    const wardIds = this.selectedWardIds();
    const nurseIds = this.selectedNurseIds();

    try {
      if (!this.selected) {
        // Create — wards can go in the create body; nurses assigned after.
        const created = await this.stationSvc
          .create({ ...this.form, wardIds })
          .toPromise();
        const id = created!.data.id;
        if (nurseIds.length > 0) {
          await this.stationSvc.assignNurses(id, nurseIds).toPromise();
        }
        this.successMessage = `Station "${this.form.name}" created.`;
      } else {
        const id = this.selected.id;
        await this.stationSvc
          .update(id, { name: this.form.name, description: this.form.description, type: this.form.type, isActive: this.form.isActive })
          .toPromise();
        // Replace ward set (OPD stations carry no wards).
        await this.stationSvc.setWards(id, this.form.type === 'OPD' ? [] : wardIds).toPromise();
        // Sync nurse assignments — assign new, unassign removed.
        const prev = new Set(this.selected.nurses.map((n) => n.id));
        const now = new Set(nurseIds);
        const toAdd = nurseIds.filter((i) => !prev.has(i));
        const toRemove = [...prev].filter((i) => !now.has(i));
        if (toAdd.length > 0) await this.stationSvc.assignNurses(id, toAdd).toPromise();
        for (const uid of toRemove) await this.stationSvc.unassignNurse(id, uid).toPromise();
        this.successMessage = `Station "${this.form.name}" updated.`;
      }
      this.showEditor = false;
      this.selected = null;
      this.loadAll();
    } catch (e: any) {
      this.errorMessage = e?.error?.message || 'Failed to save station';
    } finally {
      this.saving = false;
    }
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  async remove(station: NursingStationRow): Promise<void> {
    const ok = await this.alertSvc.confirm(
      `Delete station "${station.name}"? Nurses mapped only to this station will lose their ward scope until reassigned.`,
      { severity: 'warning', confirmLabel: 'Delete' },
    );
    if (!ok) return;
    this.stationSvc.remove(station.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = `Station "${station.name}" deleted.`; this.loadAll(); },
      error: () => { this.errorMessage = 'Failed to delete station'; },
    });
  }

  nurseLabel(n: NurseRow): string {
    return n.fullName || n.username + (n.employeeId ? ` (${n.employeeId})` : '');
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
