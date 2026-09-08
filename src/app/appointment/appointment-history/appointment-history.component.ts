import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import {
  AppointmentEventRow,
  AppointmentHistoryResponse,
  AppointmentHistoryService,
} from '../../services/appointment-history.service';

/**
 * Per-appointment lifecycle trail popup.
 *
 * Shows every recorded event for one appointment — booked, confirmed,
 * rescheduled (old slot → new slot), cancelled, checked in, completed —
 * with who did it and where from (front desk / WhatsApp bot / no-show cron).
 *
 * Opened from the action column of the confirmed / cancelled / completed
 * appointment tables. Fed by GET /api/appointments/:id/history.
 */
@Component({
  selector: 'app-appointment-history',
  templateUrl: './appointment-history.component.html',
  styleUrl: './appointment-history.component.css',
})
export class AppointmentHistoryComponent implements OnChanges {
  @Input() appointmentId: number | null = null;
  @Input() showDialog = false;
  @Output() close = new EventEmitter<void>();

  isLoading = false;
  errorMessage = '';
  history: AppointmentHistoryResponse | null = null;

  constructor(private historyService: AppointmentHistoryService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['appointmentId'] || changes['showDialog']) && this.showDialog && this.appointmentId) {
      this.load();
    }
  }

  load(): void {
    if (!this.appointmentId) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.history = null;
    this.historyService.getHistory(this.appointmentId).subscribe({
      next: (res) => {
        this.history = res;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          err?.error?.error || 'Could not load the appointment history.';
      },
    });
  }

  closeDialog(): void {
    this.close.emit();
    this.showDialog = false;
  }

  /** Human label for the status-badge pill in the Event column. */
  eventLabel(type: string): string {
    switch (type) {
      case 'BOOKED': return 'Booked';
      case 'CONFIRMED': return 'Confirmed';
      case 'RESCHEDULED': return 'Rescheduled';
      case 'CANCELLED': return 'Cancelled';
      case 'CHECKED_IN': return 'Checked In';
      case 'CHECKED_OUT': return 'Checked Out';
      case 'COMPLETED': return 'Completed';
      case 'OPD_CLOSED': return 'OPD Closed';
      case 'STATUS_CHANGE': return 'Status Change';
      case 'DELETED': return 'Deleted';
      default: return type;
    }
  }

  /** Badge colour class — mirrors the status-badge classes on the tables. */
  eventClass(type: string): string {
    switch (type) {
      case 'CANCELLED': return 'evt-cancelled';
      case 'RESCHEDULED': return 'evt-rescheduled';
      case 'BOOKED': return 'evt-booked';
      case 'CONFIRMED': return 'evt-confirmed';
      case 'CHECKED_IN': return 'evt-checkedin';
      case 'COMPLETED': return 'evt-completed';
      default: return 'evt-neutral';
    }
  }

  /** "21-04-2026 10:00" — empty when the event carries no slot on that side. */
  slotText(date: string | null, time: string | null, doctor: string | null): string {
    if (!date && !time && !doctor) return '';
    const parts: string[] = [];
    if (date) parts.push(this.ddmmyyyy(date));
    if (time) parts.push(time);
    if (doctor) parts.push(`· ${doctor}`);
    return parts.join(' ');
  }

  /** True when the event moved the slot, so the table shows "old → new". */
  hasSlotMove(e: AppointmentEventRow): boolean {
    return e.eventType === 'RESCHEDULED';
  }

  /** Who did it, with the role when we could join one. */
  actorText(e: AppointmentEventRow): string {
    const name = e.actorName || (e.actorType === 'system' ? 'System' : 'Unknown');
    return e.actorRole ? `${name} (${e.actorRole})` : name;
  }

  /** Front-desk-readable source label. */
  sourceLabel(source: string | null): string {
    if (!source) return '-';
    switch (source) {
      case 'admin-panel': return 'Admin panel';
      case 'walk-in': return 'Walk-in';
      case 'whatsapp-bot': return 'WhatsApp bot';
      case 'cron:expired-3h': return 'Auto (no-show 3h)';
      case 'cron:mark-complete': return 'Auto (end of day)';
      case 'service-close': return 'Service closed';
      case 'followup-automation': return 'Follow-up automation';
      case 'scheduled-completion': return 'Auto (scheduled)';
      default: return source;
    }
  }

  private ddmmyyyy(isoOrYmd: string): string {
    const parts = isoOrYmd.slice(0, 10).split('-');
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : isoOrYmd;
  }
}
