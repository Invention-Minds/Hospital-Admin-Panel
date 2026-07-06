import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  CreateSchedulePayload,
  OtKpis,
  OtRoom,
  OtSchedule,
  OtScheduleStatus,
  OtUrgency,
  OtWorkflowService,
} from '../../services/ot-workflow.service';
import { MessageService } from 'primeng/api';
import { AlertService } from '../../services/alert.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';

/**
 * Phase 11 — OT Board (default landing page for /surgery-ot).
 *
 * Three sections:
 *   1. KPI strip — utilisation, on-time start, turnover, reschedule rate,
 *      unplanned-return, SSI rate, WHO checklist adherence.
 *   2. Day view — for the selected date, rows = OT rooms, cells = scheduled
 *      procedures with status pill. Click a slot to open the detail page.
 *   3. Booking modal — quick booking form.
 */
@Component({
  selector: 'app-ot-board',
  templateUrl: './ot-board.component.html',
  styleUrls: ['./ot-board.component.css'],
})
export class OtBoardComponent implements OnInit, OnDestroy {
  loading = false;

  date = '';
  rooms: OtRoom[] = [];
  schedules: OtSchedule[] = [];
  kpis: OtKpis | null = null;

  // Booking modal state
  bookingVisible = false;
  bookingSubmitting = false;
  bookingForm: CreateSchedulePayload & { plannedStartTime: string; plannedEndTime: string } = {
    otRoomId: '',
    patientName: '',
    prn: '',
    admissionId: '',
    date: '',
    plannedStart: '',
    plannedEnd: '',
    plannedStartTime: '09:00',
    plannedEndTime: '10:00',
    surgeonName: '',
    anaesthesiologistName: '',
    scrubNurseName: '',
    runnerName: '',
    procedureName: '',
    procedureCode: '',
    urgency: 'elective',
  };

  private destroy$ = new Subject<void>();

  readonly urgencyOptions: { value: OtUrgency; label: string }[] = [
    { value: 'elective',  label: 'Elective' },
    { value: 'urgent',    label: 'Urgent' },
    { value: 'emergency', label: 'Emergency' },
  ];

  constructor(
    private otService: OtWorkflowService,
    private router: Router,
    private alertSvc: AlertService,
    private appointmentConfirm: AppointmentConfirmService,
    private messages: MessageService,
  ) {}

  /** Floating toast (global <p-toast> in AppComponent) so messages stay visible
   *  even when the page is scrolled or the booking modal is open. */
  private toast(severity: 'success' | 'error' | 'warn' | 'info', detail: string): void {
    const summary = severity === 'success' ? 'Success' : severity === 'error' ? 'Error' : 'OT';
    this.messages.add({ severity, summary, detail });
  }

  ngOnInit(): void {
    this.date = new Date().toISOString().slice(0, 10);
    this.refresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loading = true;

    // Three parallel loads — rooms, today's schedules, KPIs.
    let pending = 3;
    const done = () => {
      pending -= 1;
      if (pending === 0) this.loading = false;
    };

    this.otService.listRooms().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rooms = r ?? []; done(); },
      error: () => { this.rooms = []; done(); },
    });
    this.otService.listSchedules({ date: this.date }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => { this.schedules = s ?? []; done(); },
      error: () => { this.schedules = []; done(); },
    });
    // KPIs over the last 30 days, regardless of selected day.
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 30);
    this.otService.getKpis(past.toISOString().slice(0, 10), today.toISOString().slice(0, 10))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (k) => { this.kpis = k; done(); },
        error: () => { this.kpis = null; done(); },
      });
  }

  /** Group schedules by room for the matrix view. */
  schedulesIn(roomId: string): OtSchedule[] {
    return this.schedules
      .filter((s) => s.otRoomId === roomId)
      .sort((a, b) => new Date(a.plannedStart).getTime() - new Date(b.plannedStart).getTime());
  }

  // ─── Booking ────────────────────────────────────────────────────────
  openBooking(roomId?: string): void {
    this.bookingForm = {
      otRoomId: roomId ?? this.rooms[0]?.id ?? '',
      patientName: '',
      prn: '',
      admissionId: '',
      date: this.date,
      plannedStart: '',
      plannedEnd: '',
      plannedStartTime: '09:00',
      plannedEndTime: '10:00',
      surgeonName: '',
      anaesthesiologistName: '',
      scrubNurseName: '',
      runnerName: '',
      procedureName: '',
      procedureCode: '',
      urgency: 'elective',
    };
    this.bookingVisible = true;
  }

  closeBooking(): void {
    this.bookingVisible = false;
  }

  /**
   * Auto-fill patient name from the PRN. The booking form only carries
   * patientName (plus prn), so that's the only demographic field we map.
   * Response shape is { patientData: { name, ... } }. Only fills when empty so
   * a manually-typed name is preserved.
   */
  onPrnChange(): void {
    const prn = this.bookingForm.prn?.trim();
    if (!prn) return;
    this.appointmentConfirm.getDetailsByPRN(prn).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        const p = res?.patientData;
        if (p?.name && !this.bookingForm.patientName?.trim()) {
          this.bookingForm.patientName = p.name;
        }
      },
      error: () => { /* best-effort autofill */ },
    });
  }

  submitBooking(): void {
    if (!this.bookingForm.otRoomId) {
      this.toast('warn', 'Pick an OT room.');
      return;
    }
    if (!this.bookingForm.procedureName?.trim()) {
      this.toast('warn', 'Procedure name is required.');
      return;
    }
    // Combine date + time into ISO strings.
    const baseDate = this.bookingForm.date;
    const plannedStart = `${baseDate}T${this.bookingForm.plannedStartTime}:00+05:30`;
    const plannedEnd = `${baseDate}T${this.bookingForm.plannedEndTime}:00+05:30`;
    this.bookingSubmitting = true;
    this.otService
      .createSchedule({
        otRoomId: this.bookingForm.otRoomId,
        patientName: this.bookingForm.patientName?.trim() || undefined,
        prn: this.bookingForm.prn?.trim() || undefined,
        admissionId: this.bookingForm.admissionId?.trim() || undefined,
        date: baseDate,
        plannedStart,
        plannedEnd,
        surgeonName: this.bookingForm.surgeonName?.trim() || undefined,
        anaesthesiologistName: this.bookingForm.anaesthesiologistName?.trim() || undefined,
        scrubNurseName: this.bookingForm.scrubNurseName?.trim() || undefined,
        runnerName: this.bookingForm.runnerName?.trim() || undefined,
        procedureName: this.bookingForm.procedureName.trim(),
        procedureCode: this.bookingForm.procedureCode?.trim() || undefined,
        urgency: this.bookingForm.urgency,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.bookingSubmitting = false;
          this.bookingVisible = false;
          this.toast('success', `Booked ${row.procedureName} at ${this.formatTime(row.plannedStart)}.`);
          this.refresh();
        },
        error: (err) => {
          this.bookingSubmitting = false;
          this.toast('error', err?.error?.error || 'Failed to book slot');
        },
      });
  }

  // ─── Per-slot actions ───────────────────────────────────────────────
  openSchedule(s: OtSchedule): void {
    this.router.navigate(['/surgery-ot', s.id]);
  }

  startSlot(s: OtSchedule, evt: Event): void {
    evt.stopPropagation();
    this.otService.startSchedule(s.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.refresh(),
      error: (err) => { this.toast('error', err?.error?.error || 'Failed to start'); },
    });
  }

  endSlot(s: OtSchedule, evt: Event): void {
    evt.stopPropagation();
    this.otService.endSchedule(s.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.refresh(),
      error: (err) => { this.toast('error', err?.error?.error || 'Failed to end'); },
    });
  }

  async cancelSlot(s: OtSchedule, evt: Event): Promise<void> {
    evt.stopPropagation();
    const reason = await this.alertSvc.prompt('Cancel reason (min 5 chars)?', { title: 'Cancel slot', placeholder: 'Reason…', confirmLabel: 'Cancel slot', severity: 'warning' });
    if (!reason || reason.trim().length < 5) return;
    this.otService.cancelSchedule(s.id, reason.trim()).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.refresh(),
      error: (err) => { this.toast('error', err?.error?.error || 'Failed to cancel'); },
    });
  }

  // ─── View helpers ───────────────────────────────────────────────────
  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  pillClass(status: OtScheduleStatus): string {
    switch (status) {
      case 'BOOKED':       return 'pill pill-info';
      case 'CONFIRMED':    return 'pill pill-info';
      case 'IN_PROGRESS':  return 'pill pill-warn';
      case 'CLOSED':       return 'pill pill-good';
      case 'CANCELLED':    return 'pill pill-bad';
      case 'RESCHEDULED':  return 'pill pill-na';
      default: return 'pill';
    }
  }

  urgencyClass(u: OtUrgency): string {
    if (u === 'emergency') return 'urgency-em';
    if (u === 'urgent') return 'urgency-ur';
    return 'urgency-ro';
  }

  roomStatusClass(status: string): string {
    switch (status) {
      case 'available':   return 'rs-good';
      case 'in-use':      return 'rs-warn';
      case 'cleaning':    return 'rs-info';
      case 'maintenance': return 'rs-bad';
      default: return '';
    }
  }
}
