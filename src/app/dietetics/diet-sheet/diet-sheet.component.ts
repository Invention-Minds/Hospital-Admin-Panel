import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  DieteticsService,
  SheetPreview,
  SheetRow,
  SheetWindowSlot,
  IssuedSheet,
  SupplementMaster,
  localDateString,
} from '../../services/dietetics.service';
import { SignatureCreateResponse } from '../../services/signature.service';

/**
 * Diet Information Sheet — `/dietetics/sheet`.
 *
 * The hospital's "DIET INFORMATION LIST <date> · EVE TO next-day LUNCH",
 * built live from every admitted patient:
 *   • Dietitian edits each patient × meal cell (instruction / supplement /
 *     "NO") — saved immediately, audited, pushed to the kitchen.
 *   • Rows changed since the last issued sheet are highlighted (their green
 *     rows); new admissions are listed separately; patients who left are shown.
 *   • Issue = dietitian signs; F&B manager / supervisor acknowledges on the
 *     "Issued sheets" tab (= diet communicated to the kitchen).
 *   • Print gives the paper layout with both sign-off lines.
 */
@Component({
  selector: 'app-diet-sheet',
  templateUrl: './diet-sheet.component.html',
  styleUrls: ['../dietetics-shared.css', './diet-sheet.component.css'],
})
export class DietSheetComponent implements OnInit, OnDestroy {
  tab: 'live' | 'issued' = 'live';
  date = localDateString();
  wardFilter = '';
  search = '';

  preview: SheetPreview | null = null;
  supplements: SupplementMaster[] = [];
  sheets: IssuedSheet[] = [];
  viewingSheet: IssuedSheet | null = null;

  loading = false;
  errorMessage = '';
  successMessage = '';

  // Cell editor.
  editing: { row: SheetRow; slot: SheetWindowSlot; instruction: string; skip: boolean; supplementId: string; supplementDose: string } | null = null;
  savingCell = false;

  // Issue / acknowledge.
  issuing = false;
  issueNotes = '';
  acknowledging: IssuedSheet | null = null;

  readonly role = typeof localStorage !== 'undefined' ? (localStorage.getItem('role') ?? '') : '';
  readonly subAdminType = typeof localStorage !== 'undefined' ? (localStorage.getItem('subAdminType') ?? '') : '';
  readonly username = typeof localStorage !== 'undefined' ? (localStorage.getItem('username') ?? '') : '';

  private destroy$ = new Subject<void>();

  constructor(private svc: DieteticsService) {}

  get isDietitian(): boolean {
    return this.role === 'super_admin' || ['Dietician', 'Diet'].includes(this.subAdminType);
  }
  /** F&B manager / supervisor — acknowledges issued sheets (not the dietitian who issued them). */
  get isFnb(): boolean {
    return this.role === 'super_admin' || this.subAdminType === 'Canteen Staff';
  }
  /** Issued sheets still waiting for F&B. */
  get openSheets(): number {
    return this.sheets.filter((s) => s.status === 'ISSUED').length;
  }

  ngOnInit(): void {
    this.load();
    this.loadSheets();
    this.svc.listSupplements().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.supplements = r.filter((s) => s.isActive); },
      error: () => { /* swallow */ },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.getSheetPreview(this.date).pipe(takeUntil(this.destroy$)).subscribe({
      next: (p) => { this.preview = p; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load the diet sheet'; this.loading = false; },
    });
  }

  loadSheets(): void {
    this.svc.listSheets(30).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.sheets = r; },
      error: () => { /* swallow */ },
    });
  }

  // ─── Rows to show (live sheet or an issued snapshot) ────────────────
  get window(): SheetWindowSlot[] {
    return this.viewingSheet?.snapshot?.window ?? this.preview?.window ?? [];
  }
  private get allRows(): SheetRow[] {
    return this.viewingSheet?.snapshot?.rows ?? this.preview?.rows ?? [];
  }
  get wards(): string[] {
    return Array.from(new Set(this.allRows.map((r) => r.wardName ?? 'No ward'))).sort();
  }
  private matches(r: SheetRow): boolean {
    if (this.wardFilter && (r.wardName ?? 'No ward') !== this.wardFilter) return false;
    const q = this.search.trim().toLowerCase();
    if (!q) return true;
    return [r.patientName, r.prn, r.bedNumber, r.admissionNo, r.diagnosis, r.dietCode]
      .some((v) => (v ?? '').toLowerCase().includes(q));
  }
  /** Main table: everyone except new admissions (when there is a previous sheet). */
  get mainRows(): SheetRow[] {
    return this.allRows.filter((r) => this.matches(r) && !(r.isNew && !this.viewingSheet));
  }
  get newRows(): SheetRow[] {
    return this.viewingSheet ? [] : this.allRows.filter((r) => this.matches(r) && r.isNew);
  }
  /** Rows changed since the last issued sheet (the green rows). */
  get changedCount(): number {
    return (this.preview?.rows ?? []).filter((r) => r.changes.length).length;
  }

  get totalsLine(): string {
    const t = this.viewingSheet?.snapshot?.totals ?? this.preview?.totals;
    if (!t) return '';
    return t.noTray ? `TOTAL PATIENT = ${t.total} − ${t.noTray} (no tray) = ${t.served}` : `TOTAL PATIENT = ${t.total}`;
  }
  get windowLabel(): string {
    const w = this.window;
    if (!w.length) return '';
    const fmt = (d: string) => d.split('-').reverse().join('-');
    return `${w[0].name.toUpperCase()} ${fmt(w[0].date)} TO ${w[w.length - 1].name.toUpperCase()} ${fmt(w[w.length - 1].date)}`;
  }

  // ─── Cell editing (dietitian) ───────────────────────────────────────
  openCell(row: SheetRow, slot: SheetWindowSlot): void {
    if (!this.isDietitian || this.viewingSheet) return;
    const c = row.cells[slot.slotId];
    this.editing = {
      row, slot,
      instruction: c?.instruction ?? '',
      skip: !!c?.skip,
      supplementId: c?.supplementId ?? '',
      supplementDose: c?.supplementDose ?? '',
    };
  }
  onSupplementPick(): void {
    if (!this.editing) return;
    const s = this.supplements.find((x) => x.id === this.editing!.supplementId);
    if (s && !this.editing.supplementDose) this.editing.supplementDose = s.defaultDose ?? '';
  }
  saveCell(clear = false): void {
    const e = this.editing;
    if (!e) return;
    this.savingCell = true;
    this.svc.updateSheetCell({
      admissionId: e.row.admissionId,
      mealTimeSlotId: e.slot.slotId,
      instruction: clear ? null : (e.instruction || null),
      skip: clear ? false : e.skip,
      supplementId: clear ? null : (e.supplementId || null),
      supplementDose: clear ? null : (e.supplementDose || null),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.savingCell = false;
        this.editing = null;
        this.successMessage = `${e.row.bedNumber ?? e.row.admissionNo} · ${e.slot.name} updated — kitchen notified.`;
        this.load();
      },
      error: (err) => { this.savingCell = false; this.errorMessage = err?.error?.error || 'Save failed'; },
    });
  }

  // ─── Issue / acknowledge ────────────────────────────────────────────
  startIssue(): void {
    this.issueNotes = this.preview?.standingNotes ?? '';
    this.issuing = true;
  }
  onIssueSigned(sig: SignatureCreateResponse): void {
    this.svc.issueSheet({ date: this.date, notes: this.issueNotes, signatureId: sig.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.issuing = false;
          this.successMessage = `Sheet issued (${r.windowLabel}) — ${r.totals.total} patients. Waiting for F&B acknowledgement.`;
          this.load();
          this.loadSheets();
        },
        error: (e) => { this.errorMessage = e?.error?.error || 'Issue failed'; },
      });
  }
  onAckSigned(sig: SignatureCreateResponse): void {
    if (!this.acknowledging) return;
    const id = this.acknowledging.id;
    this.svc.acknowledgeSheet(id, sig.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.acknowledging = null;
        this.viewingSheet = null;
        this.successMessage = 'Sheet acknowledged — diet communicated to the kitchen.';
        this.loadSheets();
      },
      error: (e) => { this.errorMessage = e?.error?.error || 'Acknowledge failed'; },
    });
  }

  /** Opens the issued copy inside the Issued tab (read-only), not the live sheet. */
  viewSheet(s: IssuedSheet): void {
    this.svc.getSheet(s.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (full) => { this.viewingSheet = full; this.tab = 'issued'; },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to open sheet'; },
    });
  }

  print(): void {
    if (typeof window !== 'undefined') window.print();
  }

  cellTitle(row: SheetRow, slot: SheetWindowSlot): string {
    const c = row.cells[slot.slotId];
    if (c?.text) return c.text;
    return c?.defaultMeal ? `Menu: ${c.defaultMeal}` : '';
  }
}
