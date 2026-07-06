import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ESignComponent } from '../../shared/ui/e-sign/e-sign.component';
import {
  OtNursingChartService,
  OtIntraOpNursingChart,
  NursingChartUpsertPayload,
  SignerRole,
} from '../../services/ot-nursing-chart.service';
import { SignatureCreateResponse } from '../../services/signature.service';

/**
 * OT Intra-Op Nursing Chart — `/surgery-ot/:id/nursing-chart`.
 *
 * Long form mirroring the printed UHJ/OTS/F-02 layout. Vertical-tab
 * navigation across 6 sections so the scrub nurse doesn't scroll an
 * 80-field page.
 *
 * Sign chain — scrub → floor → OT in-charge. Each sign is sequential; the
 * backend enforces ordering. Once the in-charge signs the chart is
 * read-only.
 */
type Section =
  | 'header' | 'positioning' | 'lines-tourniquet'
  | 'counts' | 'specimens' | 'end' | 'sign';

@Component({
  selector: 'app-ot-nursing-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, ESignComponent],
  templateUrl: './ot-nursing-chart.component.html',
  styleUrls: ['./ot-nursing-chart.component.css'],
})
export class OtNursingChartComponent implements OnInit, OnDestroy {
  scheduleId = '';
  section: Section = 'header';
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  serverRow: OtIntraOpNursingChart | null = null;
  form: NursingChartUpsertPayload = this.blank();

  /** Per-role nurse names captured before signing. Required — the e-sign
   *  pad and the sign call both need a non-empty name (backend rejects a
   *  null signer name). */
  scrubNurseName = '';
  floorNurseName = '';
  inchargeNurseName = '';

  /** Pressure-protection options are encoded as comma-joined keys in the
   *  backend column; the UI surfaces them as a check-list. */
  readonly pressureOptions: ReadonlyArray<{ key: string; label: string }> = [
    { key: 'head', label: 'Head support' },
    { key: 'sandbags', label: 'Sand bags' },
    { key: 'pillow', label: 'Pillow' },
    { key: 'axillary-roll', label: 'Axillary roll' },
    { key: 'shoulder-roll', label: 'Shoulder roll' },
    { key: 'eye-protections', label: 'Eye protections' },
    { key: 'boot', label: 'Boot' },
    { key: 'stirupps', label: 'Stirrups' },
    { key: 'sling', label: 'Sling' },
    { key: 'lt-arm', label: 'Lt. arm' },
    { key: 'rt-arm', label: 'Rt. arm' },
    { key: 'lt-leg', label: 'Lt. leg' },
    { key: 'rt-leg', label: 'Rt. leg' },
  ];

  readonly transferModes = ['bed', 'stretcher', 'wheelchair'];
  readonly anaesthesiaTypes = ['GA', 'SA', 'EA', 'REGIONAL', 'BLOCK_MAC', 'LOCAL'];
  readonly positions = ['supine', 'prone', 'lithotomy', 'left-lateral', 'right-lateral', 'others'];
  readonly endConditions = ['stable', 'fair', 'critical'];
  readonly dressingTypes = ['compression', 'simple', 'immobilizer', 'pop-cast'];
  readonly shiftedTo = ['recovery', 'icu', 'ward', 'others'];

  /** Swab types — drive both the form fields and the count summary. Stored
   *  as flat columns server-side so the printed-form layout is preserved. */
  readonly swabTypes: ReadonlyArray<{ key: string; label: string }> = [
    { key: 'RoMop',        label: 'R.O. mop' },
    { key: 'RoGauze',      label: 'R.O. gauze' },
    { key: 'PlainGauze',   label: 'Plain gauze' },
    { key: 'ThroatPack',   label: 'Throat pack' },
    { key: 'Patties',      label: 'Patties' },
    { key: 'Peanuts',      label: 'Peanuts' },
    { key: 'RibbonPacks',  label: 'Ribbon packs' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private svc: OtNursingChartService,
  ) {}

  ngOnInit(): void {
    this.scheduleId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    if (!this.scheduleId) return;
    this.loading = true;
    this.errorMessage = '';
    this.svc.get(this.scheduleId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (row) => {
        this.serverRow = row;
        this.form = row ? { ...row } : this.blank();
        this.loading = false;
      },
      error: (e) => {
        this.errorMessage = e?.error?.error || 'Failed to load chart';
        this.loading = false;
      },
    });
  }

  setSection(s: Section): void {
    this.section = s;
    this.successMessage = '';
    this.errorMessage = '';
  }

  get readOnly(): boolean {
    return this.serverRow?.status === 'SIGNED_INCHARGE';
  }

  // ─── Pressure-protection checklist sync ─────────────────────────────
  // Backend stores pressureProtections as comma-joined keys. UI works with
  // a Set<string>; we sync to/from the string on toggle and on hydrate.
  hasPressureKey(key: string): boolean {
    const csv = this.form.pressureProtections ?? '';
    return csv.split(',').map((s) => s.trim()).includes(key);
  }
  togglePressureKey(key: string): void {
    const set = new Set(
      (this.form.pressureProtections ?? '')
        .split(',').map((s) => s.trim()).filter(Boolean),
    );
    if (set.has(key)) set.delete(key); else set.add(key);
    this.form.pressureProtections = Array.from(set).join(',') || null;
  }

  // ─── Swab count accessors ───────────────────────────────────────────
  // Strict template type-check can't index the form by a computed key like
  // `form['swabRoMopInitial']`, so we route through these typed helpers.
  private acc(): Record<string, unknown> {
    return this.form as unknown as Record<string, unknown>;
  }
  getSwab(typeKey: string, slot: 'Initial' | 'Additional' | 'Final'): number | null {
    const v = this.acc()[`swab${typeKey}${slot}`];
    return typeof v === 'number' ? v : null;
  }
  setSwab(typeKey: string, slot: 'Initial' | 'Additional' | 'Final', value: number | null): void {
    this.acc()[`swab${typeKey}${slot}`] = value;
  }

  /** True when ANY swab row has (initial + additional) !== final. All-zero
   *  rows (untouched) are ignored. Drives the warning banner and blocks the
   *  sign path so a chart can't be signed with mismatched swab counts. */
  get countsMismatch(): boolean {
    return this.swabTypes.some((s) => {
      const initial = this.getSwab(s.key, 'Initial') ?? 0;
      const additional = this.getSwab(s.key, 'Additional') ?? 0;
      const final = this.getSwab(s.key, 'Final') ?? 0;
      if (initial === 0 && additional === 0 && final === 0) return false;
      return initial + additional !== final;
    });
  }

  // ─── Save ──────────────────────────────────────────────────────────
  saveDraft(): void {
    if (this.readOnly || !this.scheduleId) return;
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.svc.upsert(this.scheduleId, this.form).pipe(takeUntil(this.destroy$)).subscribe({
      next: (row) => {
        this.serverRow = row;
        this.saving = false;
        this.successMessage = 'Saved.';
      },
      error: (e) => {
        this.errorMessage = e?.error?.error || e?.error?.detail || 'Save failed';
        this.saving = false;
      },
    });
  }

  /** Captured nurse name for a given sign role. */
  nameFor(role: SignerRole): string {
    switch (role) {
      case 'scrub': return this.scrubNurseName;
      case 'floor': return this.floorNurseName;
      case 'incharge': return this.inchargeNurseName;
    }
  }

  onSigned(role: SignerRole, sig: SignatureCreateResponse): void {
    const nurseName = this.nameFor(role).trim();
    if (!nurseName) { this.errorMessage = 'Nurse name is required before signing.'; return; }
    if (this.countsMismatch) {
      this.errorMessage = 'Cannot sign — swab counts do not match (initial + additional ≠ final).';
      return;
    }
    this.svc.sign(this.scheduleId, role, { signatureId: sig.id, nurseName })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.successMessage = `${role} nurse signed.`; this.load(); },
        error: (e) => { this.errorMessage = e?.error?.error || 'Sign failed'; },
      });
  }

  blank(): NursingChartUpsertPayload {
    return { swabsCountTallied: false };
  }
}
