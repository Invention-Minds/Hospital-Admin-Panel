import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  OtConsumableIssue,
  OtConsumableSet,
  OtConsumableSetItem,
  OtEquipmentUsage,
  OtScheduleExtrasService,
  OtScheduleStaff,
  OtScheduleSurgery,
  OtStaffRole,
} from '../../services/ot-schedule-extras.service';
import { MastersService, MasterDepartment } from '../../services/masters.service';
import {
  OtSetupService, OtEquipmentMaster,
  OtStaffMaster, SurgeryProcedureMaster,
} from '../../services/ot-setup.service';
import { AlertService } from '../../services/alert.service';

/**
 * Phase 9.2 — Embedded "extras" card for the OT schedule detail page.
 *
 * One container with four collapsible sections (mirrors the reference
 * HMIS OT Workbench right-rail Surgery / Surgeon / Equipments /
 * Drugs & Consumables buttons):
 *
 *   1. Surgeries        — primary + additional
 *   2. Staff            — multi-role roster with isPrimary
 *   3. Equipment        — usage + usedMinutes (drives utilization KPI)
 *   4. Consumables      — set-picker → bulk-issue + return ledger
 */
@Component({
  selector: 'app-ot-schedule-extras',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ot-schedule-extras.component.html',
  styleUrls: ['./ot-schedule-extras.component.css'],
})
export class OtScheduleExtrasComponent implements OnChanges, OnDestroy {
  @Input() scheduleId = '';

  activeTab: 'surgeries' | 'staff' | 'equipment' | 'consumables' = 'surgeries';

  surgeries: OtScheduleSurgery[] = [];
  staff: OtScheduleStaff[] = [];
  equipment: OtEquipmentUsage[] = [];
  consumableSets: OtConsumableSet[] = [];
  consumableIssues: OtConsumableIssue[] = [];

  errorMessage = '';
  loading = { surgeries: false, staff: false, equipment: false, consumables: false };

  /** Union of all known consumable item names across every set — populates
   *  the datalist on consumable issue rows so users can pick OR type. */
  get allConsumableItemNames(): string[] {
    const names = new Set<string>();
    for (const s of this.consumableSets) {
      for (const it of s.items ?? []) names.add(it.itemName);
    }
    return Array.from(names).sort();
  }

  // Drafts for inline-add rows
  draftSurgery = { departmentName: '', categoryCode: '', surgeryName: '', surgeryType: 'Invasive', isPrimary: false };
  draftStaff = { staffName: '', role: 'surgeon' as OtStaffRole, isPrimary: false };
  draftEquipment = { equipmentName: '', usedMinutes: 0, notes: '' };
  pickerSetId: number | null = null;
  issueDraft: { itemName: string; quantity: number; uom: string }[] = [];

  // Phase 9.5i — master lookups for dropdowns
  departments: MasterDepartment[] = [];
  equipmentMaster: OtEquipmentMaster[] = [];
  // Phase 9.5j — staff + surgery master lookups
  staffMaster: OtStaffMaster[] = [];
  surgeryMaster: SurgeryProcedureMaster[] = [];
  // Items of the currently picked consumable set (for the inline issue rows)
  pickerSetItems: OtConsumableSetItem[] = [];

  readonly roles: ReadonlyArray<{ value: OtStaffRole; label: string }> = [
    { value: 'surgeon', label: 'Surgeon' },
    { value: 'co-surgeon', label: 'Co-Surgeon' },
    { value: 'assistant-surgeon', label: 'Assistant Surgeon' },
    { value: 'anaesthetist', label: 'Anaesthetist' },
    { value: 'scrub-nurse', label: 'Scrub Nurse' },
    { value: 'floor-nurse', label: 'Floor Nurse' },
    { value: 'runner', label: 'Runner' },
    { value: 'technician', label: 'Technician' },
  ];

  readonly surgeryTypes = ['Invasive', 'Minimally Invasive', 'Non-Invasive', 'Diagnostic'];

  readonly equipmentSuggestions = [
    'C Arm Machine', 'Electric Tourniquet', 'Laparoscopic Tower', 'Ultrasound Machine',
    'Doppler Hand', 'Fibreoptic Bronchoscope', 'Video Laryngoscope', 'Cautery Machine',
    'Harmonic Machine', 'Microscope', 'Drill and Saw', 'Defibrillator',
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private svc: OtScheduleExtrasService,
    private masters: MastersService,
    private setup: OtSetupService,
    private alertSvc: AlertService,
  ) {}

  ngOnChanges(c: SimpleChanges): void {
    if (c['scheduleId'] && this.scheduleId) this.loadAll();
    // Master lookups are static for the lifetime of the page — load once.
    if (!this.departments.length) {
      this.masters.listDepartments().pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.departments = r; },
      });
    }
    if (!this.equipmentMaster.length) {
      this.setup.listEquipment().pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.equipmentMaster = r.data; },
      });
    }
    if (!this.staffMaster.length) {
      this.setup.listStaffMaster().pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.staffMaster = r.data; },
      });
    }
    if (!this.surgeryMaster.length) {
      this.setup.listSurgeryMaster().pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.surgeryMaster = r.data; },
      });
    }
  }

  /** Map the schedule's clinical OtStaffRole to the master's role values.
   *  The schedule supports doctor roles too (surgeon/co-surgeon/...) which
   *  the staff master doesn't cover — those fall through to the full list. */
  staffMasterFor(role: string): OtStaffMaster[] {
    const map: Record<string, string> = {
      'scrub-nurse': 'scrub-nurse',
      'floor-nurse': 'floor-nurse',
      'runner': 'runner',
      'technician': 'ot-technician',
    };
    const masterRole = map[role];
    if (!masterRole) return this.staffMaster; // doctor roles — no master filter
    return this.staffMaster.filter((s) => s.role === masterRole);
  }

  /** Auto-fill department + category when user picks a surgery from the master. */
  onSurgeryMasterPick(name: string): void {
    const m = this.surgeryMaster.find((s) => s.name === name);
    if (!m) return;
    if (!this.draftSurgery.categoryCode && m.categoryCode) this.draftSurgery.categoryCode = m.categoryCode;
    if (m.surgeryType) this.draftSurgery.surgeryType = m.surgeryType;
    if (!this.draftSurgery.departmentName && m.departmentId != null) {
      const d = this.departments.find((dep) => dep.id === m.departmentId);
      if (d) this.draftSurgery.departmentName = d.name;
    }
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  loadAll(): void {
    this.loadSurgeries();
    this.loadStaff();
    this.loadEquipment();
    this.loadConsumableSets();
    this.loadConsumableIssues();
  }

  // ─── Surgeries ─────────────────────────────────────────────────────
  private loadSurgeries(): void {
    this.loading.surgeries = true;
    this.svc.listSurgeries(this.scheduleId).pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => { this.surgeries = r.data; this.loading.surgeries = false; } });
  }
  addSurgery(): void {
    if (!this.draftSurgery.surgeryName.trim()) return;
    this.svc.addSurgery(this.scheduleId, {
      surgeryName: this.draftSurgery.surgeryName.trim(),
      departmentName: this.draftSurgery.departmentName || null,
      categoryCode: this.draftSurgery.categoryCode || null,
      surgeryType: this.draftSurgery.surgeryType || null,
      isPrimary: this.draftSurgery.isPrimary,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.draftSurgery = { departmentName: '', categoryCode: '', surgeryName: '', surgeryType: 'Invasive', isPrimary: false };
        this.loadSurgeries();
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to add surgery'; },
    });
  }
  setSurgeryPrimary(row: OtScheduleSurgery): void {
    this.svc.updateSurgery(this.scheduleId, row.id, { isPrimary: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => this.loadSurgeries() });
  }
  async removeSurgery(row: OtScheduleSurgery): Promise<void> {
    if (!await this.alertSvc.confirm(`Remove "${row.surgeryName}"?`, { severity: 'warning', confirmLabel: 'Remove' })) return;
    this.svc.removeSurgery(this.scheduleId, row.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => this.loadSurgeries() });
  }

  // ─── Staff ─────────────────────────────────────────────────────────
  private loadStaff(): void {
    this.loading.staff = true;
    this.svc.listStaff(this.scheduleId).pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => { this.staff = r.data; this.loading.staff = false; } });
  }
  addStaff(): void {
    if (!this.draftStaff.staffName.trim()) return;
    this.svc.addStaff(this.scheduleId, {
      staffName: this.draftStaff.staffName.trim(),
      role: this.draftStaff.role,
      isPrimary: this.draftStaff.isPrimary,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.draftStaff = { staffName: '', role: 'surgeon', isPrimary: false };
        this.loadStaff();
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to add staff'; },
    });
  }
  setStaffPrimary(row: OtScheduleStaff): void {
    this.svc.updateStaff(this.scheduleId, row.id, { isPrimary: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => this.loadStaff() });
  }
  async removeStaff(row: OtScheduleStaff): Promise<void> {
    if (!await this.alertSvc.confirm(`Remove ${row.staffName}?`, { severity: 'warning', confirmLabel: 'Remove' })) return;
    this.svc.removeStaff(this.scheduleId, row.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => this.loadStaff() });
  }
  staffByRole(role: OtStaffRole): OtScheduleStaff[] {
    return this.staff.filter((s) => s.role === role);
  }

  // ─── Equipment ─────────────────────────────────────────────────────
  private loadEquipment(): void {
    this.loading.equipment = true;
    this.svc.listEquipment(this.scheduleId).pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => { this.equipment = r.data; this.loading.equipment = false; } });
  }
  addEquipment(): void {
    if (!this.draftEquipment.equipmentName.trim()) return;
    this.svc.addEquipment(this.scheduleId, {
      equipmentName: this.draftEquipment.equipmentName.trim(),
      usedMinutes: this.draftEquipment.usedMinutes || 0,
      notes: this.draftEquipment.notes || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.draftEquipment = { equipmentName: '', usedMinutes: 0, notes: '' };
        this.loadEquipment();
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to add equipment'; },
    });
  }
  async removeEquipment(row: OtEquipmentUsage): Promise<void> {
    if (!await this.alertSvc.confirm(`Remove "${row.equipmentName}"?`, { severity: 'warning', confirmLabel: 'Remove' })) return;
    this.svc.removeEquipment(this.scheduleId, row.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => this.loadEquipment() });
  }

  // ─── Consumables ───────────────────────────────────────────────────
  private loadConsumableSets(): void {
    this.svc.listConsumableSets(true).pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => { this.consumableSets = r.data; } });
  }
  private loadConsumableIssues(): void {
    this.loading.consumables = true;
    this.svc.listConsumableIssues(this.scheduleId).pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => { this.consumableIssues = r.data; this.loading.consumables = false; } });
  }
  onPickerChange(): void {
    const set = this.consumableSets.find((s) => s.id === this.pickerSetId);
    if (!set?.items?.length) { this.issueDraft = []; return; }
    this.issueDraft = set.items.map((it) => ({
      itemName: it.itemName,
      quantity: it.defaultQuantity,
      uom: it.uom ?? 'Number',
    }));
  }
  addBlankIssueLine(): void {
    this.issueDraft.push({ itemName: '', quantity: 1, uom: 'Number' });
  }
  removeIssueLine(idx: number): void {
    this.issueDraft.splice(idx, 1);
  }
  submitIssue(): void {
    const items = this.issueDraft
      .filter((it) => it.itemName.trim() && it.quantity > 0)
      .map((it) => ({
        setId: this.pickerSetId ?? null,
        itemName: it.itemName.trim(),
        quantity: it.quantity,
        uom: it.uom || null,
      }));
    if (!items.length) { this.errorMessage = 'No items to issue'; return; }
    this.svc.issueConsumables(this.scheduleId, items)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.pickerSetId = null;
          this.issueDraft = [];
          this.loadConsumableIssues();
        },
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to issue'; },
      });
  }
  async returnRow(row: OtConsumableIssue): Promise<void> {
    const entered = await this.alertSvc.prompt(`Return how many of ${row.itemName}? (issued ${row.quantity})`, { title: 'Return consumable', inputType: 'number', defaultValue: '1', confirmLabel: 'Return' });
    const qty = parseInt(entered ?? '0', 10);
    if (!qty || qty <= 0) return;
    this.svc.returnConsumables(this.scheduleId, [{
      setId: row.setId,
      tabletMasterId: row.tabletMasterId,
      itemName: row.itemName,
      quantity: qty,
      uom: row.uom,
    }]).pipe(takeUntil(this.destroy$))
      .subscribe({ next: () => this.loadConsumableIssues() });
  }

  /** Aggregate net-issued quantity per item (issued − returned). */
  netQuantity(itemName: string): number {
    return this.consumableIssues
      .filter((i) => i.itemName === itemName)
      .reduce((n, i) => n + (i.direction === 'issued' ? i.quantity : -i.quantity), 0);
  }
}
