import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

import { OtSchedule, OtWorkflowService } from '../../services/ot-workflow.service';
import {
  OtEquipmentUsage, OtScheduleExtrasService, OtScheduleStaff, OtScheduleSurgery,
} from '../../services/ot-schedule-extras.service';
import { getJmrhPdfBranding } from '../../shared/pdf/jmrh-letterhead';

pdfMake.vfs = pdfFonts.vfs;

/**
 * Phase 9.2 — Surgery Track Sheet (UHJ/OTS/F-04).
 *
 * Read-only print rollup at /surgery-ot/:id/track-sheet. Aggregates the
 * 4 schedule timestamps (OT admission / start / end / OT discharge),
 * plus induction / time-out / incision / sign-out / extubation / wheel-
 * out / wheel-in pulled from the safety checklist + nursing chart +
 * intra-op note. Adds team + equipment + implants.
 *
 * No editing here — timestamps are captured where they happen.
 */
@Component({
  selector: 'app-ot-track-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ot-track-sheet.component.html',
  styleUrls: ['./ot-track-sheet.component.css'],
})
export class OtTrackSheetComponent implements OnInit, OnDestroy {
  scheduleId = '';
  schedule: OtSchedule | null = null;
  staff: OtScheduleStaff[] = [];
  surgeries: OtScheduleSurgery[] = [];
  equipment: OtEquipmentUsage[] = [];

  loading = true;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private otSvc: OtWorkflowService,
    private extrasSvc: OtScheduleExtrasService,
  ) {}

  ngOnInit(): void {
    this.scheduleId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.scheduleId) {
      this.errorMessage = 'Invalid schedule id';
      this.loading = false;
      return;
    }
    forkJoin({
      sch: this.otSvc.getSchedule(this.scheduleId),
      staff: this.extrasSvc.listStaff(this.scheduleId),
      surg: this.extrasSvc.listSurgeries(this.scheduleId),
      equip: this.extrasSvc.listEquipment(this.scheduleId),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.schedule = r.sch;
        this.staff = r.staff.data;
        this.surgeries = r.surg.data;
        this.equipment = r.equip.data;
        this.loading = false;
      },
      error: (e) => {
        this.errorMessage = e?.error?.error || 'Failed to load schedule';
        this.loading = false;
      },
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  primaryNote() { return this.schedule?.intraOpNotes?.find((n) => n.noteNumber === 1) ?? null; }
  primarySurgery() { return this.surgeries.find((s) => s.isPrimary) ?? this.surgeries[0] ?? null; }

  staffByRole(role: string): OtScheduleStaff[] {
    return this.staff.filter((s) => s.role === role);
  }

  /** Build the rollup of 8 timestamps from across the entities. */
  get timeline(): Array<{ label: string; at: string | null | undefined }> {
    const s = this.schedule;
    const note = this.primaryNote();
    const safety = s?.safetyChecklist;
    return [
      { label: 'OT Admission (Wheel-in)', at: s?.otAdmissionAt },
      { label: 'Sign-In (pre-induction)', at: safety?.signInAt },
      { label: 'Induction', at: s?.inductionAt },
      { label: 'Time-Out (pre-incision)', at: safety?.timeOutAt },
      { label: 'Incision', at: note?.incisionAt },
      { label: 'Wound closure', at: note?.woundClosureAt },
      { label: 'Sign-Out (pre-exit)', at: safety?.signOutAt },
      { label: 'Extubation', at: s?.extubationAt },
      { label: 'OT Discharge (Wheel-out)', at: s?.otDischargeAt },
    ];
  }

  parseImplants(): Array<{ name: string; batch?: string; serial?: string; manufacturer?: string }> {
    const raw = this.primaryNote()?.implants;
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }

  // ─── PDF export (pdfMake — same approach as OPD / estimation) ──────
  private fmtDate(v: string | null | undefined): string {
    return v ? formatDate(v, 'dd-MMM-yyyy', 'en-US') : '—';
  }
  private fmtDateTime(v: string | null | undefined): string {
    return v ? formatDate(v, 'dd-MMM-yyyy HH:mm', 'en-US') : '—';
  }
  /** Join all staff names for a role, '—' when none. */
  private staffNames(role: string): string {
    const names = this.staffByRole(role).map((s) => s.staffName).filter(Boolean);
    return names.length ? names.join(', ') : '—';
  }

  /** Shared pdfMake table layout: shaded header row, light grid, padding. */
  private get pdfGridLayout(): any {
    return {
      fillColor: (rowIndex: number) => (rowIndex === 0 ? '#eef3fa' : null),
      hLineColor: () => '#d6dce5',
      vLineColor: () => '#d6dce5',
      hLineWidth: () => 0.7,
      vLineWidth: () => 0.7,
      paddingTop: () => 4,
      paddingBottom: () => 4,
      paddingLeft: () => 6,
      paddingRight: () => 6,
    };
  }

  /** Blank signature block (line + label) for the sign-off footer. */
  private sigBlock(label: string): any {
    return {
      width: '*',
      stack: [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.7, lineColor: '#888888' }], margin: [0, 34, 0, 4] },
        { text: label, fontSize: 8, color: '#666666' },
      ],
    };
  }

  async print(): Promise<void> {
    const s = this.schedule;
    if (!s) return;
    const note = this.primaryNote();
    const ps = this.primarySurgery();

    // JMRH letterhead background (shared helper) — provides the hospital header
    // band + footer; content starts below it via brand.pageMargins.
    const brand = await getJmrhPdfBranding();

    const headerRows: any[] = [
      ['Patient', `${s.patientName || '—'} · PRN ${s.prn || '—'}`],
      ['Date', this.fmtDate(s.date)],
      ['OT Room', s.otRoom?.name || s.otRoom?.code || '—'],
    ];
    if (ps) {
      const extra = [ps.surgeryType, ps.categoryCode].filter(Boolean).join(' · ');
      headerRows.push(['Surgery', extra ? `${ps.surgeryName} · ${extra}` : ps.surgeryName]);
    }
    headerRows.push(['Diagnosis', note?.preOpDiagnosis || '—']);
    headerRows.push(['Anaesthesia', note?.anaesthesiaType || '—']);

    const teamRows: any[] = [
      ['Surgeon', this.staffByRole('surgeon')[0]?.staffName || s.surgeonName || '—'],
      ['Co-Surgeon', this.staffNames('co-surgeon')],
      ['Assistant Surgeon', this.staffNames('assistant-surgeon')],
      ['Anaesthetist', this.staffByRole('anaesthetist')[0]?.staffName || s.anaesthesiologistName || '—'],
      ['Scrub Nurse', this.staffByRole('scrub-nurse')[0]?.staffName || s.scrubNurseName || '—'],
      ['Floor Nurse', this.staffNames('floor-nurse')],
      ['Technician', this.staffNames('technician')],
    ];

    const implants = this.parseImplants();

    const content: any[] = [
      { text: 'Surgery Track Sheet', style: 'subheader', alignment: 'center' },
      { text: '(UHJ/OTS/F-04)', alignment: 'center', fontSize: 9, color: '#8a94a3', margin: [0, 0, 0, 16] },

      // Header
      {
        table: { widths: ['auto', '*'], body: headerRows.map((r) => [{ text: r[0], bold: true }, { text: r[1] }]) },
        layout: this.pdfGridLayout,
        margin: [0, 0, 0, 16],
      },

      // Timeline
      { text: 'Timeline', style: 'sectionHeader' },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [{ text: 'Event', bold: true }, { text: 'Time', bold: true }],
            ...this.timeline.map((t) => [{ text: t.label }, { text: this.fmtDateTime(t.at) }]),
          ],
        },
        layout: this.pdfGridLayout,
        margin: [0, 4, 0, 16],
      },

      // Team
      { text: 'Team', style: 'sectionHeader' },
      {
        table: { widths: ['auto', '*'], body: teamRows.map((r) => [{ text: r[0], bold: true }, { text: r[1] }]) },
        layout: this.pdfGridLayout,
        margin: [0, 4, 0, 16],
      },

      // Equipment
      { text: 'Equipment', style: 'sectionHeader' },
      this.equipment.length
        ? {
            table: {
              widths: ['*', 'auto', '*'],
              body: [
                [{ text: 'Equipment', bold: true }, { text: 'Used (min)', bold: true }, { text: 'Notes', bold: true }],
                ...this.equipment.map((e) => [{ text: e.equipmentName }, { text: String(e.usedMinutes ?? '') }, { text: e.notes || '—' }]),
              ],
            },
            layout: this.pdfGridLayout,
            margin: [0, 4, 0, 16],
          }
        : { text: 'No equipment logged.', italics: true, color: '#8a94a3', margin: [0, 4, 0, 16] },
    ];

    // Implants (only when present)
    if (implants.length) {
      content.push({ text: 'Implants', style: 'sectionHeader' });
      content.push({
        table: {
          widths: ['*', 'auto', 'auto', '*'],
          body: [
            [{ text: 'Name', bold: true }, { text: 'Batch', bold: true }, { text: 'Serial', bold: true }, { text: 'Manufacturer', bold: true }],
            ...implants.map((i) => [{ text: i.name || '—' }, { text: i.batch || '—' }, { text: i.serial || '—' }, { text: i.manufacturer || '—' }]),
          ],
        },
        layout: this.pdfGridLayout,
        margin: [0, 4, 0, 16],
      });
    }

    // Disposition
    content.push({ text: 'Disposition', style: 'sectionHeader' });
    content.push({
      table: {
        widths: ['auto', '*'],
        body: [
          [{ text: 'Patient shifted to', bold: true }, { text: s.pacuRecord?.dischargedTo || note?.disposition || '—' }],
          [{ text: 'Condition at end', bold: true }, { text: s.outcome ? 'Recorded' : '—' }],
        ],
      },
      layout: this.pdfGridLayout,
      margin: [0, 4, 0, 16],
    });

    // Staff signatures
    content.push({ text: 'Staff Signatures', style: 'sectionHeader' });
    content.push({
      columns: [
        this.sigBlock('Scrub Nurse — Date & Time'),
        this.sigBlock('Floor Nurse — Date & Time'),
        this.sigBlock('OT In-charge — Date & Time'),
      ],
      columnGap: 20,
      margin: [0, 4, 0, 0],
    });

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: brand.pageMargins,
      background: brand.background,
      footer: brand.footer,
      content,
      styles: {
        subheader: { fontSize: 14, bold: true },
        sectionHeader: { fontSize: 12, bold: true, margin: [0, 8, 0, 4] },
      },
    };

    pdfMake.createPdf(docDefinition).open();
  }
}
