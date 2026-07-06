import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  OtSetupService, OtEquipmentMaster, FixedSurgicalNote,
  OtStaffMaster, OtStaffRole, SurgeryProcedureMaster,
} from '../../services/ot-setup.service';
import { OtScheduleExtrasService, OtConsumableSet } from '../../services/ot-schedule-extras.service';
import { MastersService, MasterDepartment } from '../../services/masters.service';
import { AlertService } from '../../services/alert.service';

type SetupTab = 'equipments' | 'consumable-sets' | 'fixed-notes' | 'staff' | 'surgeries';

/**
 * Phase 9.5e — OT Setup admin (Equipments / Consumable Sets / Fixed Surgical Notes).
 *
 * One screen with three tabs — mirrors the reference HMIS sidebar Setup
 * section. Templates already live at /surgery-ot/templates; this page
 * covers the remaining masters.
 *
 * Route: /surgery-ot/setup
 */
@Component({
  selector: 'app-ot-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ot-setup.component.html',
  styleUrls: ['./ot-setup.component.css'],
})
export class OtSetupComponent implements OnInit, OnDestroy {
  tab: SetupTab = 'equipments';

  // Equipment
  equipments: OtEquipmentMaster[] = [];
  showInactive = false;
  eqEditing: OtEquipmentMaster | null = null;
  eqDraft = { name: '', code: '', category: '', description: '', isActive: true };

  // Consumable sets
  sets: OtConsumableSet[] = [];
  setEditing: OtConsumableSet | null = null;
  setDraft = { name: '', departmentId: null as number | null, description: '', isActive: true };

  // Fixed surgical notes
  notes: FixedSurgicalNote[] = [];
  noteEditing: FixedSurgicalNote | null = null;
  noteDraft = { code: '', name: '', departmentId: null as number | null, body: '', isActive: true };

  // Phase 9.5j — Staff master
  staff: OtStaffMaster[] = [];
  staffEditing: OtStaffMaster | null = null;
  staffDraft = {
    name: '',
    employeeCode: '',
    role: 'scrub-nurse' as OtStaffRole,
    designation: '',
    departmentId: null as number | null,
    isActive: true,
  };

  // Phase 9.5j — Surgery / procedure master
  surgeries: SurgeryProcedureMaster[] = [];
  surgeryEditing: SurgeryProcedureMaster | null = null;
  surgeryDraft = {
    name: '',
    code: '',
    departmentId: null as number | null,
    categoryCode: '',
    surgeryType: 'Invasive',
    description: '',
    isActive: true,
  };

  readonly staffRoles: ReadonlyArray<{ value: OtStaffRole; label: string }> = [
    { value: 'scrub-nurse', label: 'Scrub Nurse' },
    { value: 'floor-nurse', label: 'Floor Nurse' },
    { value: 'runner', label: 'Runner' },
    { value: 'ot-technician', label: 'OT Technician' },
    { value: 'anaesthesia-technician', label: 'Anaesthesia Technician' },
    { value: 'cssd', label: 'CSSD Technician' },
    { value: 'biomedical', label: 'Biomedical Technician' },
    { value: 'other', label: 'Other' },
  ];

  readonly surgeryTypes = ['Invasive', 'Minimally Invasive', 'Non-Invasive', 'Diagnostic'];

  // Shared department lookup — loaded once, drives all editors' department dropdowns
  departments: MasterDepartment[] = [];

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private setup: OtSetupService,
    private extras: OtScheduleExtrasService,
    private masters: MastersService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.load();
    this.masters.listDepartments().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.departments = r; },
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  setTab(t: SetupTab): void {
    this.tab = t;
    this.cancelAll();
    this.load();
  }

  cancelAll(): void {
    this.eqEditing = null; this.eqDraft = { name: '', code: '', category: '', description: '', isActive: true };
    this.setEditing = null; this.setDraft = { name: '', departmentId: null, description: '', isActive: true };
    this.noteEditing = null; this.noteDraft = { code: '', name: '', departmentId: null, body: '', isActive: true };
    this.staffEditing = null;
    this.staffDraft = { name: '', employeeCode: '', role: 'scrub-nurse', designation: '', departmentId: null, isActive: true };
    this.surgeryEditing = null;
    this.surgeryDraft = { name: '', code: '', departmentId: null, categoryCode: '', surgeryType: 'Invasive', description: '', isActive: true };
    this.errorMessage = '';
  }

  load(): void {
    this.loading = true;
    if (this.tab === 'equipments') {
      this.setup.listEquipment(this.showInactive).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.equipments = r.data; this.loading = false; },
        error: () => { this.errorMessage = 'Failed to load equipments'; this.loading = false; },
      });
    } else if (this.tab === 'consumable-sets') {
      this.extras.listConsumableSets(true).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.sets = r.data; this.loading = false; },
        error: () => { this.errorMessage = 'Failed to load consumable sets'; this.loading = false; },
      });
    } else if (this.tab === 'fixed-notes') {
      this.setup.listFixedNotes(this.showInactive).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.notes = r.data; this.loading = false; },
        error: () => { this.errorMessage = 'Failed to load fixed surgical notes'; this.loading = false; },
      });
    } else if (this.tab === 'staff') {
      this.setup.listStaffMaster(this.showInactive).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.staff = r.data; this.loading = false; },
        error: () => { this.errorMessage = 'Failed to load staff master'; this.loading = false; },
      });
    } else {
      this.setup.listSurgeryMaster(this.showInactive).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.surgeries = r.data; this.loading = false; },
        error: () => { this.errorMessage = 'Failed to load surgery master'; this.loading = false; },
      });
    }
  }

  toggleInactive(): void { this.showInactive = !this.showInactive; this.load(); }

  // ── Equipment ────────────────────────────────────────────────────
  editEq(e: OtEquipmentMaster): void {
    this.eqEditing = e;
    this.eqDraft = { name: e.name, code: e.code ?? '', category: e.category ?? '', description: e.description ?? '', isActive: e.isActive };
  }
  saveEq(): void {
    if (!this.eqDraft.name.trim()) { this.errorMessage = 'Name is required'; return; }
    this.saving = true;
    const body = {
      name: this.eqDraft.name.trim(),
      code: this.eqDraft.code.trim() || null,
      category: this.eqDraft.category.trim() || null,
      description: this.eqDraft.description.trim() || null,
      isActive: this.eqDraft.isActive,
    };
    const op = this.eqEditing
      ? this.setup.updateEquipment(this.eqEditing.id, body)
      : this.setup.createEquipment(body);
    op.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.cancelAll(); this.load(); this.successMessage = 'Saved.'; setTimeout(() => (this.successMessage = ''), 2000); },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Save failed'; },
    });
  }
  async removeEq(e: OtEquipmentMaster): Promise<void> {
    if (!await this.alertSvc.confirm(`Deactivate ${e.name}?`, { severity: 'warning', confirmLabel: 'Deactivate' })) return;
    this.setup.removeEquipment(e.id).pipe(takeUntil(this.destroy$)).subscribe({ next: () => this.load() });
  }

  // ── Consumable Sets ──────────────────────────────────────────────
  editSet(s: OtConsumableSet): void {
    this.setEditing = s;
    this.setDraft = { name: s.name, departmentId: s.departmentId, description: s.description ?? '', isActive: s.isActive };
  }
  saveSet(): void {
    if (!this.setDraft.name.trim()) { this.errorMessage = 'Name is required'; return; }
    this.saving = true;
    const body = {
      name: this.setDraft.name.trim(),
      departmentId: this.setDraft.departmentId,
      description: this.setDraft.description.trim() || null,
      isActive: this.setDraft.isActive,
    };
    const op = this.setEditing
      ? this.extras.updateConsumableSet(this.setEditing.id, body)
      : this.extras.createConsumableSet(body);
    op.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.cancelAll(); this.load(); this.successMessage = 'Saved.'; setTimeout(() => (this.successMessage = ''), 2000); },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Save failed'; },
    });
  }

  // ── Fixed Notes ──────────────────────────────────────────────────
  editNote(n: FixedSurgicalNote): void {
    this.noteEditing = n;
    this.noteDraft = { code: n.code, name: n.name, departmentId: n.departmentId, body: n.body, isActive: n.isActive };
  }
  saveNote(): void {
    if (!this.noteDraft.code.trim() || !this.noteDraft.name.trim() || !this.noteDraft.body.trim()) {
      this.errorMessage = 'Code, name and body are required';
      return;
    }
    this.saving = true;
    const body = {
      code: this.noteDraft.code.trim(),
      name: this.noteDraft.name.trim(),
      departmentId: this.noteDraft.departmentId,
      body: this.noteDraft.body,
      isActive: this.noteDraft.isActive,
    };
    const op = this.noteEditing
      ? this.setup.updateFixedNote(this.noteEditing.id, body)
      : this.setup.createFixedNote(body);
    op.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.cancelAll(); this.load(); this.successMessage = 'Saved.'; setTimeout(() => (this.successMessage = ''), 2000); },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Save failed'; },
    });
  }
  async removeNote(n: FixedSurgicalNote): Promise<void> {
    if (!await this.alertSvc.confirm(`Deactivate ${n.name}?`, { severity: 'warning', confirmLabel: 'Deactivate' })) return;
    this.setup.removeFixedNote(n.id).pipe(takeUntil(this.destroy$)).subscribe({ next: () => this.load() });
  }

  // ── Staff Master (Phase 9.5j) ────────────────────────────────────
  editStaff(s: OtStaffMaster): void {
    this.staffEditing = s;
    this.staffDraft = {
      name: s.name,
      employeeCode: s.employeeCode ?? '',
      role: s.role,
      designation: s.designation ?? '',
      departmentId: s.departmentId,
      isActive: s.isActive,
    };
  }
  saveStaff(): void {
    if (!this.staffDraft.name.trim()) { this.errorMessage = 'Name is required'; return; }
    this.saving = true;
    const body = {
      name: this.staffDraft.name.trim(),
      employeeCode: this.staffDraft.employeeCode.trim() || null,
      role: this.staffDraft.role,
      designation: this.staffDraft.designation.trim() || null,
      departmentId: this.staffDraft.departmentId,
      isActive: this.staffDraft.isActive,
    };
    const op = this.staffEditing
      ? this.setup.updateStaffMaster(this.staffEditing.id, body)
      : this.setup.createStaffMaster(body);
    op.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.cancelAll(); this.load(); this.successMessage = 'Saved.'; setTimeout(() => (this.successMessage = ''), 2000); },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Save failed'; },
    });
  }
  async removeStaff(s: OtStaffMaster): Promise<void> {
    if (!await this.alertSvc.confirm(`Deactivate ${s.name}?`, { severity: 'warning', confirmLabel: 'Deactivate' })) return;
    this.setup.removeStaffMaster(s.id).pipe(takeUntil(this.destroy$)).subscribe({ next: () => this.load() });
  }

  // ── Surgery / Procedure Master (Phase 9.5j) ──────────────────────
  editSurgery(s: SurgeryProcedureMaster): void {
    this.surgeryEditing = s;
    this.surgeryDraft = {
      name: s.name,
      code: s.code ?? '',
      departmentId: s.departmentId,
      categoryCode: s.categoryCode ?? '',
      surgeryType: s.surgeryType ?? 'Invasive',
      description: s.description ?? '',
      isActive: s.isActive,
    };
  }
  saveSurgery(): void {
    if (!this.surgeryDraft.name.trim()) { this.errorMessage = 'Name is required'; return; }
    this.saving = true;
    const body = {
      name: this.surgeryDraft.name.trim(),
      code: this.surgeryDraft.code.trim() || null,
      departmentId: this.surgeryDraft.departmentId,
      categoryCode: this.surgeryDraft.categoryCode.trim() || null,
      surgeryType: this.surgeryDraft.surgeryType || null,
      description: this.surgeryDraft.description.trim() || null,
      isActive: this.surgeryDraft.isActive,
    };
    const op = this.surgeryEditing
      ? this.setup.updateSurgeryMaster(this.surgeryEditing.id, body)
      : this.setup.createSurgeryMaster(body);
    op.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.cancelAll(); this.load(); this.successMessage = 'Saved.'; setTimeout(() => (this.successMessage = ''), 2000); },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Save failed'; },
    });
  }
  async removeSurgery(s: SurgeryProcedureMaster): Promise<void> {
    if (!await this.alertSvc.confirm(`Deactivate ${s.name}?`, { severity: 'warning', confirmLabel: 'Deactivate' })) return;
    this.setup.removeSurgeryMaster(s.id).pipe(takeUntil(this.destroy$)).subscribe({ next: () => this.load() });
  }
}
