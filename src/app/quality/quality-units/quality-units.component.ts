import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import {
  QualityUnitService, HospitalUnit, UnitSources, UnitType, UnitPerson,
  EscalationMatrix, EscalationModule, ComplaintCategory, ComplaintSlaRule,
} from '../../services/quality-unit.service';

/**
 * Quality → Units & Escalation.
 *   Units: the hospital's functional departments (separate from doctor
 *   specialties), each with an HOD + deputy. One person may head several.
 *   Mapping: which specialties / legacy department text / IPD wards route to
 *   a unit, so auto-raised incidents and complaints land on the right HOD.
 *   Escalation matrix: per module × severity, who is alerted when a case is
 *   still open N hours after it was raised.
 * Route /quality/units — Quality Manager / super_admin (the API enforces it).
 */

interface LadderRow { hours: number; targets: string[]; extra: string[]; label: string; whatsapp: boolean; sms: boolean }

const TARGET_OPTIONS: Array<{ token: string; label: string }> = [
  { token: 'hod', label: 'Unit HOD + deputy' },
  { token: 'quality_manager', label: 'Quality Manager' },
  { token: 'patient_relations', label: 'Patient Relations' },
  { token: 'admin_type:Medical Superintendent', label: 'Medical Superintendent' },
  { token: 'admin_type:Medical Director', label: 'Medical Director' },
  { token: 'admin_type:CEO', label: 'CEO' },
];

// Starter list of non-clinical units (clinical ones come from "Import specialties").
const SUGGESTED_UNITS: Array<{ name: string; type: UnitType }> = [
  { name: 'Nursing', type: 'nursing' }, { name: 'ICU / Critical Care', type: 'nursing' },
  { name: 'Operation Theatre', type: 'clinical' }, { name: 'Emergency', type: 'clinical' },
  { name: 'Pharmacy', type: 'diagnostic' }, { name: 'Laboratory', type: 'diagnostic' },
  { name: 'Radiology', type: 'diagnostic' }, { name: 'CSSD', type: 'support' },
  { name: 'Biomedical Engineering', type: 'support' }, { name: 'Maintenance / Engineering', type: 'support' },
  { name: 'Housekeeping', type: 'support' }, { name: 'Dietary / F&B', type: 'support' },
  { name: 'Security', type: 'support' }, { name: 'Front Office / Billing', type: 'administrative' },
  { name: 'Medical Records', type: 'administrative' }, { name: 'IT', type: 'administrative' },
  { name: 'HR', type: 'administrative' }, { name: 'Quality', type: 'administrative' },
];

@Component({
  selector: 'app-quality-units',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quality-units.component.html',
  styleUrls: ['./quality-units.component.css'],
})
export class QualityUnitsComponent implements OnInit {
  tab: 'units' | 'matrix' | 'sla' = 'units';
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  units: HospitalUnit[] = [];
  sources: UnitSources | null = null;
  readonly UNIT_TYPES: UnitType[] = ['clinical', 'nursing', 'diagnostic', 'support', 'administrative'];
  readonly TARGET_OPTIONS = TARGET_OPTIONS;

  newUnit = { name: '', type: 'support' as UnitType, hodUserId: null as number | null, deputyUserId: null as number | null };

  // Mapping editor for one unit at a time.
  editing: HospitalUnit | null = null;
  mapDepartments = new Set<string>();
  mapWards = new Set<string>();

  // Escalation matrix.
  matrixModule: EscalationModule = 'incident';
  matrix: EscalationMatrix | null = null;
  severities: Record<EscalationModule, string[]> = { incident: [], complaint: [] };
  ladders: Record<string, LadderRow[]> = {};   // key `${module}:${severity}`
  dirty = new Set<string>();

  constructor(private svc: QualityUnitService) {}

  ngOnInit(): void { this.loadAll(); }

  // ── Loading ────────────────────────────────────────────────────────────
  loadAll(): void {
    this.loading = true;
    forkJoin({ units: this.svc.list(), sources: this.svc.sources(), matrix: this.svc.matrix() }).subscribe({
      next: ({ units, sources, matrix }) => {
        this.units = units.data;
        this.sources = sources.data;
        this.matrix = matrix.data.matrix;
        this.severities = matrix.data.severities;
        this.buildLadders();
        this.loading = false;
      },
      error: (e) => { this.loading = false; this.fail(e, 'Failed to load units'); },
    });
  }

  private reloadUnits(): void {
    forkJoin({ units: this.svc.list(), sources: this.svc.sources() }).subscribe({
      next: ({ units, sources }) => { this.units = units.data; this.sources = sources.data; },
      error: (e) => this.fail(e, 'Failed to reload units'),
    });
  }

  // ── Units ──────────────────────────────────────────────────────────────
  get people(): UnitPerson[] { return this.sources?.people ?? []; }
  personLabel(p: UnitPerson): string {
    const kind = p.adminType || p.subAdminType || (p.role === 'doctor' ? 'Doctor' : p.role);
    return `${p.fullName || p.username} · ${kind}`;
  }
  get suggestions(): Array<{ name: string; type: UnitType }> {
    const have = new Set(this.units.map((u) => u.name.toLowerCase()));
    return SUGGESTED_UNITS.filter((s) => !have.has(s.name.toLowerCase()));
  }
  useSuggestion(s: { name: string; type: UnitType }): void { this.newUnit.name = s.name; this.newUnit.type = s.type; }

  addUnit(): void {
    if (!this.newUnit.name.trim() || this.saving) return;
    this.saving = true;
    this.svc.create({ ...this.newUnit, name: this.newUnit.name.trim() }).subscribe({
      next: () => {
        this.saving = false;
        this.flash(`Unit "${this.newUnit.name.trim()}" added`);
        this.newUnit = { name: '', type: 'support', hodUserId: null, deputyUserId: null };
        this.reloadUnits();
      },
      error: (e) => { this.saving = false; this.fail(e, 'Failed to add unit'); },
    });
  }

  /** Inline edits on a unit row (HOD, deputy, type, active). */
  saveUnit(u: HospitalUnit, patch: Partial<{ type: UnitType; hodUserId: number | null; deputyUserId: number | null; isActive: boolean }>): void {
    this.svc.update(u.id, patch).subscribe({
      next: () => { this.flash(`Saved ${u.name}`); this.reloadUnits(); },
      error: (e) => { this.fail(e, `Failed to save ${u.name}`); this.reloadUnits(); },
    });
  }

  importSpecialties(): void {
    if (this.saving) return;
    this.saving = true;
    this.svc.importSpecialties().subscribe({
      next: (r) => {
        this.saving = false;
        this.flash(r.data.created.length ? `Created ${r.data.created.length} clinical unit(s): ${r.data.created.join(', ')}` : 'Every specialty already has a unit');
        this.reloadUnits();
      },
      error: (e) => { this.saving = false; this.fail(e, 'Import failed'); },
    });
  }

  // ── Mapping editor ─────────────────────────────────────────────────────
  openMapping(u: HospitalUnit): void {
    this.editing = u;
    this.mapDepartments = new Set(u.departments);
    this.mapWards = new Set(u.wardIds);
  }
  closeMapping(): void { this.editing = null; }
  toggle(set: Set<string>, value: string): void { if (set.has(value)) set.delete(value); else set.add(value); }

  /** Name of another unit a value is already mapped to (it moves here on save). */
  mappedElsewhere(kind: 'department' | 'ward', value: string): string | null {
    const m = this.sources?.mappings.find((x) => x.kind === kind && x.value === value);
    if (!m || m.unitId === this.editing?.id) return null;
    return this.units.find((u) => u.id === m.unitId)?.name ?? 'another unit';
  }

  saveMapping(): void {
    if (!this.editing || this.saving) return;
    this.saving = true;
    const u = this.editing;
    this.svc.setMappings(u.id, [...this.mapDepartments], [...this.mapWards]).subscribe({
      next: () => { this.saving = false; this.flash(`Mapping saved for ${u.name}`); this.editing = null; this.reloadUnits(); },
      error: (e) => { this.saving = false; this.fail(e, 'Failed to save mapping'); },
    });
  }

  // ── Escalation matrix ──────────────────────────────────────────────────
  private buildLadders(): void {
    if (!this.matrix) return;
    this.ladders = {};
    this.dirty.clear();
    for (const m of ['incident', 'complaint'] as EscalationModule[]) {
      for (const sev of this.severities[m] ?? []) {
        const known = new Set(TARGET_OPTIONS.map((t) => t.token));
        this.ladders[`${m}:${sev}`] = (this.matrix[m][sev]?.levels ?? []).map((l) => {
          const tokens = l.targets.split(',').map((t) => t.trim()).filter(Boolean);
          return {
            hours: Math.round((l.afterMinutes / 60) * 100) / 100,
            targets: tokens.filter((t) => known.has(t)),
            extra: tokens.filter((t) => !known.has(t)),   // e.g. user:12 — kept as-is
            label: l.label ?? '',
            whatsapp: !!l.notifyWhatsapp,
            sms: !!l.notifySms,
          };
        });
      }
    }
  }

  ladder(sev: string): LadderRow[] { return this.ladders[`${this.matrixModule}:${sev}`] ?? []; }
  source(sev: string): 'custom' | 'default' { return this.matrix?.[this.matrixModule]?.[sev]?.source ?? 'default'; }
  markDirty(sev: string): void { this.dirty.add(`${this.matrixModule}:${sev}`); }
  isDirty(sev: string): boolean { return this.dirty.has(`${this.matrixModule}:${sev}`); }

  toggleTarget(sev: string, row: LadderRow, token: string): void {
    row.targets = row.targets.includes(token) ? row.targets.filter((t) => t !== token) : [...row.targets, token];
    this.markDirty(sev);
  }
  addLevel(sev: string): void {
    const rows = this.ladder(sev);
    const last = rows[rows.length - 1];
    rows.push({ hours: last ? last.hours * 2 : 24, targets: ['quality_manager'], extra: [], label: '', whatsapp: false, sms: false });
    this.markDirty(sev);
  }
  removeLevel(sev: string, i: number): void { this.ladder(sev).splice(i, 1); this.markDirty(sev); }

  saveLadder(sev: string): void {
    const rows = this.ladder(sev);
    for (let i = 0; i < rows.length; i++) {
      if (!(rows[i].hours > 0)) { this.errorMessage = `${sev} level ${i + 1}: hours must be more than 0`; return; }
      if (rows[i].targets.length + rows[i].extra.length === 0) { this.errorMessage = `${sev} level ${i + 1}: pick at least one person / role`; return; }
      if (i > 0 && rows[i].hours <= rows[i - 1].hours) { this.errorMessage = `${sev} level ${i + 1} must fire later than level ${i}`; return; }
    }
    this.persistLadder(sev, rows.map((r) => ({
      afterMinutes: Math.round(r.hours * 60),
      targets: [...r.targets, ...r.extra].join(','),
      label: r.label.trim() || null,
      notifyWhatsapp: r.whatsapp,
      notifySms: r.sms,
    })));
  }
  resetLadder(sev: string): void { this.persistLadder(sev, []); }

  private persistLadder(sev: string, levels: Array<{ afterMinutes: number; targets: string; label: string | null; notifyWhatsapp?: boolean; notifySms?: boolean }>): void {
    this.saving = true;
    this.errorMessage = '';
    this.svc.setLadder(this.matrixModule, sev, levels).subscribe({
      next: () => {
        this.saving = false;
        this.flash(levels.length ? `Saved ${this.matrixModule} · ${sev}` : `Reset ${this.matrixModule} · ${sev} to default`);
        this.svc.matrix().subscribe((m) => { this.matrix = m.data.matrix; this.buildLadders(); });
      },
      error: (e) => { this.saving = false; this.fail(e, 'Failed to save escalation levels'); },
    });
  }

  // ── Complaint deadlines ────────────────────────────────────────────────
  slaLoaded = false;
  slaRules: ComplaintSlaRule[] = [];
  categories: ComplaintCategory[] = [];
  slaDefaults: Record<string, number> = { high: 24, medium: 72, low: 168 };
  slaMaxHours = 2160;
  readonly COMPLAINT_SEVERITIES = ['high', 'medium', 'low'];
  newRule = { unitId: null as number | null, category: null as string | null, severity: null as string | null, hours: 48, note: '' };
  ruleHours: Record<number, number> = {};   // inline edits, keyed by rule id
  tester = { unitId: null as number | null, category: null as string | null, severity: 'medium' };
  testResult: { hours: number; ruleId: number | null; label: string } | null = null;

  openSlaTab(): void {
    this.tab = 'sla';
    if (!this.slaLoaded) this.loadSla();
  }
  loadSla(): void {
    this.svc.slaRules().subscribe({
      next: (r) => {
        this.slaRules = r.data.rules;
        this.categories = r.data.categories;
        this.slaDefaults = r.data.defaults;
        this.slaMaxHours = r.data.maxHours;
        this.ruleHours = Object.fromEntries(this.slaRules.map((x) => [x.id, x.hours]));
        this.slaLoaded = true;
      },
      error: (e) => this.fail(e, 'Failed to load complaint deadlines'),
    });
  }
  categoryLabel(key: string | null): string {
    return key ? this.categories.find((c) => c.key === key)?.label ?? key : 'Any type';
  }
  addRule(): void {
    if (this.saving) return;
    const h = Math.round(Number(this.newRule.hours));
    if (!(h >= 1 && h <= this.slaMaxHours)) { this.errorMessage = `Hours must be between 1 and ${this.slaMaxHours}`; return; }
    if (!this.newRule.unitId && !this.newRule.category && !this.newRule.severity) {
      this.errorMessage = 'Pick at least a unit, a type or a severity — any / any / any is the built-in default.';
      return;
    }
    this.saving = true;
    this.svc.createSlaRule({ ...this.newRule, hours: h, note: this.newRule.note.trim() || null }).subscribe({
      next: () => {
        this.saving = false;
        this.flash('Deadline rule added — applies to complaints raised from now on');
        this.newRule = { unitId: null, category: null, severity: null, hours: 48, note: '' };
        this.loadSla(); this.runTest();
      },
      error: (e) => { this.saving = false; this.fail(e, 'Failed to add the rule'); },
    });
  }
  saveRuleHours(r: ComplaintSlaRule): void {
    const h = Math.round(Number(this.ruleHours[r.id]));
    if (h === r.hours) return;
    if (!(h >= 1 && h <= this.slaMaxHours)) { this.errorMessage = `Hours must be between 1 and ${this.slaMaxHours}`; this.ruleHours[r.id] = r.hours; return; }
    this.svc.updateSlaRule(r.id, { hours: h }).subscribe({
      next: () => { this.flash('Rule updated'); this.loadSla(); this.runTest(); },
      error: (e) => { this.fail(e, 'Failed to update the rule'); this.ruleHours[r.id] = r.hours; },
    });
  }
  deleteRule(r: ComplaintSlaRule): void {
    if (!confirm('Delete this deadline rule? Complaints already raised keep their deadline.')) return;
    this.svc.deleteSlaRule(r.id).subscribe({
      next: () => { this.flash('Rule deleted'); this.loadSla(); this.runTest(); },
      error: (e) => this.fail(e, 'Failed to delete the rule'),
    });
  }
  runTest(): void {
    this.svc.testSla(this.tester).subscribe({
      next: (r) => { this.testResult = r.data; },
      error: (e) => this.fail(e, 'Could not work out the deadline'),
    });
  }
  hoursText(h: number): string {
    return h % 24 === 0 ? `${h}h (${h / 24} day${h === 24 ? '' : 's'})` : `${h}h`;
  }

  sevLabel(s: string): string { return s.replace(/_/g, ' '); }
  targetLabel(token: string): string { return TARGET_OPTIONS.find((t) => t.token === token)?.label ?? token; }

  // ── Messages ───────────────────────────────────────────────────────────
  private flash(msg: string): void {
    this.errorMessage = '';
    this.successMessage = msg;
    setTimeout(() => { if (this.successMessage === msg) this.successMessage = ''; }, 3500);
  }
  private fail(e: { error?: { message?: string; error?: string } }, fallback: string): void {
    this.successMessage = '';
    this.errorMessage = e?.error?.message || e?.error?.error || fallback;
  }
}
