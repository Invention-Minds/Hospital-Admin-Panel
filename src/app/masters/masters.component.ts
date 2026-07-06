import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import {
  MastersService,
  MasterDepartment,
  MasterSurgeon,
  MasterWard,
  MasterBed,
  MasterOtRoom,
  MasterTablet,
  MasterLabTest,
  MasterRadiologyTest,
  MasterPackage,
  MasterRadioService,
} from '../services/masters.service';
import { SchedulingService, Shift } from '../services/scheduling.service';

/**
 * Unified Masters admin page — `/masters` (super_admin only).
 *
 * Tabbed shell covering the five operationally-critical reference catalogues
 * a hospital edits routinely:
 *   • Departments — clinical departments (drives doctor/note-template filters)
 *   • Wards — IPD wards (drives bed planning + admissions)
 *   • Beds — bed-level records under each ward
 *   • OT Rooms — operating theatres + cath labs + endoscopy suites
 *   • Tablets — medication master (drives prescription dropdowns)
 *
 * Pattern mirrors `/dietetics/setup`: a table on the left, an edit form on
 * the right, save → refresh the list. Delete is not exposed for any master
 * because every row has downstream FK references; the safer admin pattern is
 * to deactivate (where supported) or just rename.
 */
type Tab = 'departments' | 'surgeons' | 'wards' | 'beds' | 'ot-rooms' | 'tablets'
         | 'lab-tests' | 'radiology-tests' | 'packages' | 'shifts';

interface NewBedRow { bedNumber: string; bedType: string; }

@Component({
  selector: 'app-masters',
  standalone: true,
  imports: [CommonModule, FormsModule, MultiSelectModule],
  templateUrl: './masters.component.html',
  styleUrls: ['./masters.component.css'],
})
export class MastersComponent implements OnInit, OnDestroy {
  tab: Tab = 'departments';

  // Master collections.
  departments: MasterDepartment[] = [];
  surgeons: MasterSurgeon[] = [];
  wards: MasterWard[] = [];
  beds: MasterBed[] = [];
  otRooms: MasterOtRoom[] = [];
  tablets: MasterTablet[] = [];
  labTests: MasterLabTest[] = [];
  radiologyTests: MasterRadiologyTest[] = [];
  packages: MasterPackage[] = [];
  /** Read-only catalogue for the MHC-package multi-select (RadioService rows
   *  fetched from /api/radiology/packages). */
  radioServices: MasterRadioService[] = [];
  /** Shift master — Morning/Evening/Night etc. Drives the roster page. */
  shifts: Shift[] = [];
  shiftForm: Partial<Shift> = this.blankShift();

  // Editor buffers — one per master.
  deptForm: Partial<MasterDepartment> = this.blankDept();
  surgeonForm: Partial<MasterSurgeon> = this.blankSurgeon();
  wardForm: Partial<MasterWard> = this.blankWard();
  bedFilterWardId = '';
  bedForm: Partial<MasterBed> = this.blankBed();
  bedBulkRows: NewBedRow[] = [];
  otForm: Partial<MasterOtRoom> = this.blankOt();
  tabletForm: Partial<MasterTablet> = this.blankTablet();
  labForm: Partial<MasterLabTest> = this.blankLab();
  radForm: Partial<MasterRadiologyTest> = this.blankRad();
  pkgForm: Partial<MasterPackage> = this.blankPkg();
  /** Live multi-select state — bound directly to the two p-multiSelects. On
   *  edit we parse the comma-string into these arrays; on save we join them
   *  back into pkgForm.deptIds / pkgForm.radioIds. */
  pkgDeptIds: number[] = [];
  pkgRadioIds: number[] = [];

  // UI banners.
  loading = false;
  /** Re-entry guard shared by every save handler to block double-submit. */
  saving = false;
  errorMessage = '';
  successMessage = '';

  readonly otTypes = ['major', 'minor', 'cath-lab', 'endoscopy'];
  readonly bedTypes = ['general', 'ICU', 'HDU', 'isolation'];
  readonly bedStatuses = ['available', 'occupied', 'maintenance', 'reserved'];
  readonly otStatuses = ['available', 'in-use', 'cleaning', 'maintenance'];
  readonly tabletTypes = ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'inhaler', 'drop', 'other'];
  readonly surgeonTypes: Array<{ value: string; label: string }> = [
    { value: 'surgeon', label: 'Surgeon' },
    { value: 'assistant', label: 'Assistant Surgeon' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private svc: MastersService,
    private scheduling: SchedulingService,
  ) {}

  ngOnInit(): void {
    this.refreshAll();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(t: Tab): void {
    this.tab = t;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // ─── Loaders ────────────────────────────────────────────────────────
  refreshAll(): void {
    this.loading = true;
    this.svc.listDepartments().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.departments = r ?? []; },
      error: () => { this.departments = []; },
    });
    this.svc.listSurgeons().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.surgeons = r ?? []; },
      error: () => { this.surgeons = []; },
    });
    this.svc.listWards().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.wards = r ?? []; },
      error: () => { this.wards = []; },
    });
    this.svc.listBeds().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.beds = r ?? []; },
      error: () => { this.beds = []; },
    });
    this.svc.listOtRooms().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.otRooms = r ?? []; },
      error: () => { this.otRooms = []; },
    });
    this.svc.listTablets().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.tablets = r ?? []; },
      error: () => { this.tablets = []; },
    });
    this.svc.listLabTests().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.labTests = r ?? []; },
      error: () => { this.labTests = []; },
    });
    this.svc.listRadiologyTests().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.radiologyTests = r ?? []; },
      error: () => { this.radiologyTests = []; },
    });
    this.svc.listPackages().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.packages = r ?? []; this.loading = false; },
      error: () => { this.packages = []; this.loading = false; },
    });
    this.svc.listRadioServices().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.radioServices = r ?? []; },
      error: () => { this.radioServices = []; },
    });
    this.scheduling.listShifts().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.shifts = r ?? []; },
      error: () => { this.shifts = []; },
    });
  }

  // ─── Shifts ─────────────────────────────────────────────────────────
  editShift(s: Shift): void {
    this.shiftForm = { ...s };
    this.errorMessage = '';
    this.successMessage = '';
  }
  saveShift(): void {
    if (!this.shiftForm.name?.trim() || !this.shiftForm.code?.trim()
        || !this.shiftForm.startTime || !this.shiftForm.endTime) {
      this.errorMessage = 'name, code, startTime and endTime are required.';
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(this.shiftForm.startTime!) || !/^\d{2}:\d{2}$/.test(this.shiftForm.endTime!)) {
      this.errorMessage = 'startTime and endTime must be HH:mm (e.g. 06:00).';
      return;
    }
    if (this.saving) return;
    this.saving = true;
    this.scheduling.upsertShift(this.shiftForm).pipe(takeUntil(this.destroy$), finalize(() => this.saving = false)).subscribe({
      next: () => { this.successMessage = 'Shift saved.'; this.shiftForm = this.blankShift(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || e?.error?.detail || 'Save failed'; },
    });
  }

  // ─── MHC-package multi-select sync ──────────────────────────────────
  // Backend stores deptIds / radioIds as a comma-separated numeric-id string;
  // the p-multiSelects work with number[]. parseIdString is used on edit;
  // savePkg joins back to the legacy string format.
  private parseIdString(s: string | null | undefined): number[] {
    if (!s) return [];
    return s.split(',')
      .map((p) => Number.parseInt(p.trim(), 10))
      .filter((n) => !Number.isNaN(n));
  }

  // ─── Departments ────────────────────────────────────────────────────
  editDept(d: MasterDepartment): void {
    this.deptForm = { ...d };
    this.errorMessage = '';
    this.successMessage = '';
  }
  saveDept(): void {
    const name = this.deptForm.name?.trim();
    if (!name) { this.errorMessage = 'Name is required.'; return; }
    this.successMessage = ''; this.errorMessage = '';
    if (this.saving) return;
    const obs = this.deptForm.id
      ? this.svc.updateDepartment(this.deptForm.id, name)
      : this.svc.createDepartment(name);
    this.saving = true;
    obs.pipe(takeUntil(this.destroy$), finalize(() => this.saving = false)).subscribe({
      next: () => { this.successMessage = 'Department saved.'; this.deptForm = this.blankDept(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }

  // ─── Surgeons ───────────────────────────────────────────────────────
  editSurgeon(s: MasterSurgeon): void {
    this.surgeonForm = { ...s };
    this.errorMessage = '';
    this.successMessage = '';
  }
  saveSurgeon(): void {
    const name = this.surgeonForm.name?.trim();
    if (!name) { this.errorMessage = 'Name is required.'; return; }
    this.successMessage = ''; this.errorMessage = '';
    if (this.saving) return;
    const type = this.surgeonForm.type || 'surgeon';
    const qualification = this.surgeonForm.qualification?.trim() || undefined;
    const obs = this.surgeonForm.id
      ? this.svc.updateSurgeon(this.surgeonForm.id, {
          name,
          type,
          qualification: qualification ?? null,
          isActive: this.surgeonForm.isActive,
        })
      : this.svc.createSurgeon({ name, type, qualification });
    this.saving = true;
    obs.pipe(takeUntil(this.destroy$), finalize(() => this.saving = false)).subscribe({
      next: () => { this.successMessage = 'Surgeon saved.'; this.surgeonForm = this.blankSurgeon(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }

  // ─── Wards ──────────────────────────────────────────────────────────
  editWard(w: MasterWard): void {
    this.wardForm = { ...w };
    this.errorMessage = '';
    this.successMessage = '';
  }
  saveWard(): void {
    if (!this.wardForm.wardName?.trim() || !this.wardForm.wardCode?.trim() || !this.wardForm.department) {
      this.errorMessage = 'wardName, wardCode and department are required.';
      return;
    }
    const payload = {
      wardName: this.wardForm.wardName!.trim(),
      wardCode: this.wardForm.wardCode!.trim(),
      floor: this.wardForm.floor ?? null,
      department: this.wardForm.department!,
      totalBeds: Number(this.wardForm.totalBeds ?? 0),
      hmisWardId: this.wardForm.hmisWardId ?? null,
    };
    if (this.saving) return;
    const obs = this.wardForm.id
      ? this.svc.updateWard(this.wardForm.id, payload)
      : this.svc.createWard(payload);
    this.saving = true;
    obs.pipe(takeUntil(this.destroy$), finalize(() => this.saving = false)).subscribe({
      next: () => { this.successMessage = 'Ward saved.'; this.wardForm = this.blankWard(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.message || e?.error?.error || 'Save failed'; },
    });
  }

  // ─── Beds ───────────────────────────────────────────────────────────
  bedsForCurrentWard(): MasterBed[] {
    if (!this.bedFilterWardId) return this.beds;
    return this.beds.filter((b) => b.wardId === this.bedFilterWardId);
  }
  addBulkBedRow(): void {
    this.bedBulkRows.push({ bedNumber: '', bedType: 'general' });
  }
  removeBulkBedRow(i: number): void {
    this.bedBulkRows = this.bedBulkRows.filter((_, idx) => idx !== i);
  }
  saveBulkBeds(): void {
    if (!this.bedFilterWardId) { this.errorMessage = 'Pick a ward first.'; return; }
    const rows = this.bedBulkRows.filter((r) => r.bedNumber.trim());
    if (rows.length === 0) { this.errorMessage = 'Add at least one bed row.'; return; }
    this.svc.createBedsForWard(this.bedFilterWardId, rows)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.successMessage = `Created ${r.count} bed(s).`;
          this.bedBulkRows = [];
          this.refreshAll();
        },
        error: (e) => { this.errorMessage = e?.error?.message || 'Bulk create failed'; },
      });
  }
  editBed(b: MasterBed): void {
    this.bedForm = { ...b };
    this.errorMessage = '';
    this.successMessage = '';
  }
  saveBed(): void {
    if (!this.bedForm.id) { this.errorMessage = 'Pick a bed row to edit first.'; return; }
    if (!this.bedForm.bedNumber?.trim() || !this.bedForm.bedType) {
      this.errorMessage = 'bedNumber and bedType are required.';
      return;
    }
    if (this.saving) return;
    this.saving = true;
    this.svc.updateBed(this.bedForm.id, {
      bedNumber: this.bedForm.bedNumber!.trim(),
      bedType: this.bedForm.bedType!,
    }).pipe(takeUntil(this.destroy$), finalize(() => this.saving = false)).subscribe({
      next: () => { this.successMessage = 'Bed saved.'; this.bedForm = this.blankBed(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.message || 'Save failed'; },
    });
  }
  // `status` is `unknown` because Angular strict templates infer the
  // `(ngModelChange)` emit as a wider type; coerce to string at the boundary.
  setBedStatus(b: MasterBed, status: unknown): void {
    const next = String(status ?? '');
    if (!next || b.status === next) return;
    this.svc.updateBedStatus(b.id, next).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = `Bed ${b.bedNumber} → ${next}.`; this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.message || 'Status change failed'; },
    });
  }
  wardName(wardId: string): string {
    return this.wards.find((w) => w.id === wardId)?.wardName ?? '—';
  }

  // ─── OT Rooms ───────────────────────────────────────────────────────
  editOt(o: MasterOtRoom): void {
    this.otForm = { ...o };
    this.errorMessage = '';
    this.successMessage = '';
  }
  saveOt(): void {
    if (!this.otForm.name?.trim() || !this.otForm.code?.trim() || !this.otForm.type) {
      this.errorMessage = 'name, code and type are required.';
      return;
    }
    const payload = {
      name: this.otForm.name!.trim(),
      code: this.otForm.code!.trim().toUpperCase(),
      type: this.otForm.type! as MasterOtRoom['type'],
      equipmentClass: this.otForm.equipmentClass ?? null,
      hepaFiltered: this.otForm.hepaFiltered ?? false,
    };
    if (this.saving) return;
    const obs = this.otForm.id
      ? this.svc.updateOtRoom(this.otForm.id, payload)
      : this.svc.createOtRoom(payload);
    this.saving = true;
    obs.pipe(takeUntil(this.destroy$), finalize(() => this.saving = false)).subscribe({
      next: () => { this.successMessage = 'OT room saved.'; this.otForm = this.blankOt(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }
  // `status` is `unknown` so strict template type-check passes on the emit
  // from `(ngModelChange)`; we narrow + coerce on entry.
  setOtStatus(o: MasterOtRoom, status: unknown): void {
    const next = String(status ?? '');
    if (!next || o.status === next) return;
    this.svc.updateOtRoomStatus(o.id, next as MasterOtRoom['status']).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = `${o.code} → ${next}.`; this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Status change failed'; },
    });
  }

  // ─── Tablets ────────────────────────────────────────────────────────
  editTablet(t: MasterTablet): void {
    this.tabletForm = { ...t };
    this.errorMessage = '';
    this.successMessage = '';
  }
  saveTablet(): void {
    if (!this.tabletForm.genericName?.trim() || !this.tabletForm.brandName?.trim() || !this.tabletForm.type) {
      this.errorMessage = 'genericName, brandName and type are required.';
      return;
    }
    const payload = {
      genericName: this.tabletForm.genericName!.trim(),
      brandName: this.tabletForm.brandName!.trim(),
      type: this.tabletForm.type!,
      description: this.tabletForm.description ?? null,
    };
    if (this.saving) return;
    const obs = this.tabletForm.id
      ? this.svc.updateTablet(this.tabletForm.id, payload)
      : this.svc.createTablet(payload);
    this.saving = true;
    obs.pipe(takeUntil(this.destroy$), finalize(() => this.saving = false)).subscribe({
      next: () => { this.successMessage = 'Tablet saved.'; this.tabletForm = this.blankTablet(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || e?.error?.message || 'Save failed'; },
    });
  }

  // ─── Lab tests ──────────────────────────────────────────────────────
  editLab(l: MasterLabTest): void {
    this.labForm = { ...l };
    this.errorMessage = '';
    this.successMessage = '';
  }
  saveLab(): void {
    if (!this.labForm.description?.trim() || !this.labForm.department?.trim()) {
      this.errorMessage = 'description and department are required.';
      return;
    }
    const payload = {
      description: this.labForm.description!.trim(),
      department: this.labForm.department!.trim(),
    };
    if (this.saving) return;
    const obs = this.labForm.id
      ? this.svc.updateLabTest(this.labForm.id, payload)
      : this.svc.createLabTest(payload);
    this.saving = true;
    obs.pipe(takeUntil(this.destroy$), finalize(() => this.saving = false)).subscribe({
      next: () => { this.successMessage = 'Lab test saved.'; this.labForm = this.blankLab(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }

  // ─── Radiology tests ────────────────────────────────────────────────
  editRad(r: MasterRadiologyTest): void {
    this.radForm = { ...r };
    this.errorMessage = '';
    this.successMessage = '';
  }
  saveRad(): void {
    if (!this.radForm.description?.trim() || !this.radForm.department?.trim()) {
      this.errorMessage = 'description and department are required.';
      return;
    }
    const payload = {
      description: this.radForm.description!.trim(),
      department: this.radForm.department!.trim(),
    };
    if (this.saving) return;
    const obs = this.radForm.id
      ? this.svc.updateRadiologyTest(this.radForm.id, payload)
      : this.svc.createRadiologyTest(payload);
    this.saving = true;
    obs.pipe(takeUntil(this.destroy$), finalize(() => this.saving = false)).subscribe({
      next: () => { this.successMessage = 'Radiology test saved.'; this.radForm = this.blankRad(); this.refreshAll(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }

  // ─── MHC Packages ───────────────────────────────────────────────────
  editPkg(p: MasterPackage): void {
    this.pkgForm = { ...p };
    // Hydrate the multi-select arrays from the legacy comma-string columns.
    this.pkgDeptIds = this.parseIdString(p.deptIds);
    this.pkgRadioIds = this.parseIdString(p.radioIds);
    this.errorMessage = '';
    this.successMessage = '';
  }
  savePkg(): void {
    if (!this.pkgForm.name?.trim()) {
      this.errorMessage = 'name is required.';
      return;
    }
    const payload = {
      name: this.pkgForm.name!.trim(),
      description: this.pkgForm.description ?? null,
      // Join the multi-select arrays back to the comma-separated string the
      // backend expects. null when nothing's selected so the column stays
      // clean instead of holding an empty string.
      deptIds: this.pkgDeptIds.length ? this.pkgDeptIds.join(',') : null,
      radioIds: this.pkgRadioIds.length ? this.pkgRadioIds.join(',') : null,
    };
    if (this.saving) return;
    const obs = this.pkgForm.id
      ? this.svc.updatePackage(this.pkgForm.id, payload)
      : this.svc.createPackage(payload);
    this.saving = true;
    obs.pipe(takeUntil(this.destroy$), finalize(() => this.saving = false)).subscribe({
      next: () => {
        this.successMessage = 'Package saved.';
        this.pkgForm = this.blankPkg();
        this.pkgDeptIds = [];
        this.pkgRadioIds = [];
        this.refreshAll();
      },
      error: (e) => { this.errorMessage = e?.error?.message || e?.error?.error || 'Save failed'; },
    });
  }
  cancelPkg(): void {
    this.pkgForm = this.blankPkg();
    this.pkgDeptIds = [];
    this.pkgRadioIds = [];
  }

  // ─── Blank-form factories ───────────────────────────────────────────
  blankDept(): Partial<MasterDepartment> { return { name: '' }; }
  blankSurgeon(): Partial<MasterSurgeon> { return { name: '', type: 'surgeon', qualification: '', isActive: true }; }
  blankWard(): Partial<MasterWard> {
    return { wardName: '', wardCode: '', floor: '', department: '', totalBeds: 0, hmisWardId: null };
  }
  blankBed(): Partial<MasterBed> { return { bedNumber: '', bedType: 'general', wardId: '', status: 'available' }; }
  blankOt(): Partial<MasterOtRoom> {
    return { name: '', code: '', type: 'major', equipmentClass: '', hepaFiltered: false, status: 'available' };
  }
  blankTablet(): Partial<MasterTablet> {
    return { genericName: '', brandName: '', type: 'tablet', description: '' };
  }
  blankLab(): Partial<MasterLabTest> { return { description: '', department: '' }; }
  blankRad(): Partial<MasterRadiologyTest> { return { description: '', department: '' }; }
  blankPkg(): Partial<MasterPackage> { return { name: '', description: '', deptIds: '', radioIds: '' }; }
  blankShift(): Partial<Shift> {
    return { name: '', code: '', startTime: '', endTime: '', sequence: 0, isActive: true };
  }
}
