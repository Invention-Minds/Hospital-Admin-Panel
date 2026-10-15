import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as FileSaver from 'file-saver';

import {
  DieteticsService,
  RoundsRow,
  SCREENING_FORM_LABEL,
  localDateString,
} from '../../services/dietetics.service';

/**
 * Dietitian rounds list — `/dietetics/rounds`. Replaces the IP list the
 * dietitian downloads and annotates by hand: height, weight, BMI (from the
 * last screening, else the doctor's initial assessment), admit date,
 * consultant, provisional diagnosis, diet, remarks and nutrition risk —
 * with what is due (screening / re-screening / re-assessment). Excel export
 * keeps the familiar sheet for clinical rounds.
 */
@Component({
  selector: 'app-diet-rounds',
  templateUrl: './diet-rounds.component.html',
  styleUrls: ['../dietetics-shared.css', './diet-rounds.component.css'],
})
export class DietRoundsComponent implements OnInit, OnDestroy {
  wardId = '';
  wards: Array<{ id: string; wardName: string }> = [];
  rows: RoundsRow[] = [];
  onlyAction = false;
  search = '';
  loading = false;
  errorMessage = '';
  readonly formLabel = SCREENING_FORM_LABEL;

  private destroy$ = new Subject<void>();

  constructor(private svc: DieteticsService) {}

  ngOnInit(): void {
    this.svc.listCensusWards().pipe(takeUntil(this.destroy$)).subscribe({
      next: (w) => { this.wards = w; },
      error: () => { /* swallow */ },
    });
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.getRounds(this.wardId || undefined).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load rounds list'; this.loading = false; },
    });
  }

  get visible(): RoundsRow[] {
    const q = this.search.trim().toLowerCase();
    return this.rows.filter((r) =>
      (!this.onlyAction || !!r.actionNeeded)
      && (!q || [r.patientName, r.prn, r.bedNumber, r.diagnosis, r.consultant].some((v) => (v ?? '').toLowerCase().includes(q))));
  }
  get dueCount(): number { return this.rows.filter((r) => !!r.actionNeeded).length; }
  get atRiskCount(): number { return this.rows.filter((r) => r.screening?.atRisk).length; }

  riskClass(r: RoundsRow): string {
    const lvl = r.screening?.riskLevel;
    if (!lvl) return '';
    if (['HIGH', 'SEVERE'].includes(lvl)) return 'dx-pill-bad';
    if (['MEDIUM', 'MODERATE', 'MILD'].includes(lvl)) return 'dx-pill-warn';
    return 'dx-pill-ok';
  }

  async exportExcel(): Promise<void> {
    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    const ws = wb.addWorksheet('Current IP list');
    ws.addRow([`CURRENT IP LIST ${localDateString().split('-').reverse().join('-')}`]);
    ws.addRow([]);
    const header = ws.addRow([
      'S.No', 'PRN', 'Patient name', 'Age', 'Bed No', 'Ht (cm)', 'Wt (kg)', 'BMI', 'Admit date',
      'Consulting doctor', 'Provisional diagnosis', 'Diet', 'Remarks', 'Nutri score', 'Risk', 'Action needed',
    ]);
    header.font = { bold: true };
    this.visible.forEach((r, i) => ws.addRow([
      i + 1, r.prn, r.patientName ?? '', r.age ?? '', r.bedNumber ?? '',
      r.heightCm ?? '', r.weightKg ?? '', r.bmi ?? '',
      r.admissionDate ? new Date(r.admissionDate).toLocaleDateString('en-IN') : '',
      r.consultant, r.diagnosis, r.diet?.code ?? '', r.remark ?? '',
      r.screening?.riskScore ?? '', r.screening?.riskLevel ?? '', r.actionNeeded ?? '',
    ]));
    ws.columns.forEach((c) => { c.width = 16; });
    const buffer = await wb.xlsx.writeBuffer();
    FileSaver.saveAs(new Blob([buffer]), `Current_IP_list_${localDateString()}.xlsx`);
  }
}
