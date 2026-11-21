import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DoctorServiceService, DoctorChangeLogEntry } from '../../services/doctor-details/doctor-service.service';

/**
 * Doctor Updates — every change to a doctor's details or schedule, with who
 * made it and when. Route: /doctor-updates (Tele Caller, Front Desk, admins).
 * The API enforces access; a 403 shows the message instead of the table.
 */
@Component({
  selector: 'app-doctor-updates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-updates.component.html',
  styleUrls: ['./doctor-updates.component.css'],
})
export class DoctorUpdatesComponent implements OnInit {
  rows: DoctorChangeLogEntry[] = [];
  total = 0;
  page = 1;
  readonly limit = 25;
  loading = false;
  errorMessage = '';

  doctors: { id: number; name: string }[] = [];

  preset: 'today' | '7d' | '30d' | 'custom' = '7d';
  filters = { from: '', to: '', doctorId: null as number | null, action: '' };

  readonly actions: { value: string; label: string }[] = [
    { value: 'CREATE', label: 'Added' },
    { value: 'UPDATE', label: 'Details edited' },
    { value: 'ROOM_CHANGE', label: 'Room changed' },
    { value: 'DEACTIVATE', label: 'Deactivated' },
    { value: 'ACTIVATE', label: 'Reactivated' },
    { value: 'DELETE', label: 'Removed' },
    { value: 'LEAVE_ADDED', label: 'Leave / unavailable' },
    { value: 'LEAVE_REMOVED', label: 'Available again' },
    { value: 'SLOTS_BLOCKED', label: 'Slots blocked' },
    { value: 'EXTRA_SLOTS', label: 'Extra slots' },
    { value: 'ARRIVED', label: 'Arrived' },
    { value: 'ARRIVAL_UNDONE', label: 'Arrival undone' },
  ];
  private readonly actionLabels = new Map(this.actions.map((a) => [a.value, a.label]));

  constructor(private doctorService: DoctorServiceService) {}

  ngOnInit(): void {
    this.applyPreset('7d', false);
    this.doctorService.getDoctors().subscribe({
      next: (list: any[]) => {
        this.doctors = (list ?? [])
          .map((d) => ({ id: d.id, name: d.name }))
          .sort((a, b) => a.name.localeCompare(b.name));
      },
      error: () => { this.doctors = []; },
    });
    this.load();
  }

  applyPreset(p: 'today' | '7d' | '30d' | 'custom', reload = true): void {
    this.preset = p;
    if (p !== 'custom') {
      const days = p === 'today' ? 0 : p === '7d' ? 6 : 29;
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - days);
      this.filters.from = this.ymd(from);
      this.filters.to = this.ymd(to);
    }
    if (reload) this.search();
  }

  search(): void {
    this.page = 1;
    this.load();
  }

  goTo(page: number): void {
    if (page < 1 || page > this.pageCount) return;
    this.page = page;
    this.load();
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  load(): void {
    if (!this.filters.from || !this.filters.to) return;
    this.loading = true;
    this.errorMessage = '';
    this.doctorService.getDoctorChangeLog({
      from: this.filters.from,
      to: this.filters.to,
      doctorId: this.filters.doctorId,
      action: this.filters.action || null,
      page: this.page,
      limit: this.limit,
    }).subscribe({
      next: (res) => {
        this.rows = res.data ?? [];
        this.total = res.total ?? 0;
        this.loading = false;
      },
      error: (err) => {
        this.rows = [];
        this.total = 0;
        this.loading = false;
        this.errorMessage = err?.status === 403
          ? 'You do not have access to Doctor Updates.'
          : (err?.error?.error || 'Could not load doctor updates.');
      },
    });
  }

  actionLabel(a: string): string {
    return this.actionLabels.get(a) ?? a;
  }

  /** Pill colour: red = desk must act, amber = schedule change, green = good news, blue = info. */
  tone(a: string): string {
    switch (a) {
      case 'DEACTIVATE': case 'DELETE': case 'LEAVE_ADDED': return 'du-bad';
      case 'SLOTS_BLOCKED': case 'UPDATE': case 'ROOM_CHANGE': case 'ARRIVAL_UNDONE': return 'du-warn';
      case 'ACTIVATE': case 'LEAVE_REMOVED': case 'EXTRA_SLOTS': case 'CREATE': case 'ARRIVED': return 'du-good';
      default: return 'du-info';
    }
  }

  /** Extra detail lines when there are no field-level changes (leave, slots). */
  detailLines(r: DoctorChangeLogEntry): string[] {
    const d = r.details ?? {};
    const out: string[] = [];
    if (Array.isArray(d['times']) && d['times'].length) out.push(`Times: ${d['times'].join(', ')}`);
    if (d['timings']) out.push(`Timings: ${d['timings']}`);
    if (d['bulk']) out.push('Set for several doctors at once');
    return out;
  }

  private ymd(d: Date): string {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
}
