import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DieteticsService, FeedDoseRow, localDateString } from '../../services/dietetics.service';
import { AlertService } from '../../services/alert.service';

/**
 * RT / tube feeds — `/dietetics/feeds`.
 *
 * Doses come from the doctor's feed order on the diet plan (first feed time +
 * every N hours inside the feed window), so a Q2H feed appears every 2 hours
 * and a 1-hourly feed every hour. Kitchen: prepare + print a label for each
 * dose. Ward nurse: record the feed given (or not given, with a reason).
 */
@Component({
  selector: 'app-diet-feeds',
  templateUrl: './diet-feeds.component.html',
  styleUrls: ['../dietetics-shared.css', './diet-feeds.component.css'],
})
export class DietFeedsComponent implements OnInit, OnDestroy {
  date = localDateString();
  wardId = '';
  wards: Array<{ id: string; wardName: string }> = [];
  doses: FeedDoseRow[] = [];
  /** Label print window, in hours from now (0 = whole day). */
  labelHours = 2;
  selected = new Set<string>();
  printing: FeedDoseRow[] = [];
  givenByName = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  readonly role = typeof localStorage !== 'undefined' ? (localStorage.getItem('role') ?? '') : '';
  readonly subAdminType = typeof localStorage !== 'undefined' ? (localStorage.getItem('subAdminType') ?? '') : '';
  readonly username = typeof localStorage !== 'undefined' ? (localStorage.getItem('username') ?? '') : '';

  private destroy$ = new Subject<void>();

  constructor(private svc: DieteticsService, private alertSvc: AlertService) {}

  get isKitchen(): boolean { return this.role === 'super_admin' || this.subAdminType === 'Canteen Staff'; }
  get isNurse(): boolean {
    return this.role === 'super_admin'
      || ['Nurse', 'Nursing', 'IPD Nurse', 'ICU Nurse', 'ER Nurse', 'Ward Coordinator', 'nurse', 'Nursing Superintendent'].includes(this.subAdminType);
  }

  ngOnInit(): void {
    this.givenByName = this.username;
    this.svc.listCensusWards().pipe(takeUntil(this.destroy$)).subscribe({
      next: (w) => { this.wards = w; },
      error: () => { /* ward filter optional */ },
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
    this.svc.listFeeds(this.date, this.wardId || undefined).pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => { this.doses = d; this.loading = false; this.selected.clear(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load feeds'; this.loading = false; },
    });
  }

  count(status: FeedDoseRow['status']): number { return this.doses.filter((d) => d.status === status).length; }

  /** Ordered doses due within the label window — what the kitchen prepares next. */
  get dueSoon(): FeedDoseRow[] {
    const until = this.labelHours > 0 ? Date.now() + this.labelHours * 3600 * 1000 : Infinity;
    return this.doses.filter((d) => d.status === 'ORDERED' && new Date(d.scheduledFor).getTime() <= until);
  }

  isLate(d: FeedDoseRow): boolean {
    return (d.status === 'ORDERED' || d.status === 'PREPARED') && new Date(d.scheduledFor).getTime() < Date.now() - 30 * 60 * 1000;
  }

  toggle(d: FeedDoseRow): void {
    if (this.selected.has(d.id)) this.selected.delete(d.id); else this.selected.add(d.id);
  }
  selectDueSoon(): void { this.dueSoon.forEach((d) => this.selected.add(d.id)); }

  /** Print one label per selected dose (or the due-soon doses). */
  printLabels(): void {
    const rows = this.selected.size ? this.doses.filter((d) => this.selected.has(d.id)) : this.dueSoon;
    if (!rows.length) { this.errorMessage = 'No feeds selected or due in this window.'; return; }
    this.printing = rows;
    setTimeout(() => { window.print(); this.printing = []; }, 50);
  }

  prepare(d: FeedDoseRow): void { this.act(d, 'prepare', {}, 'Prepared'); }
  prepareSelected(): void {
    const rows = this.doses.filter((d) => this.selected.has(d.id) && d.status === 'ORDERED');
    rows.forEach((d) => this.act(d, 'prepare', {}, null));
    if (rows.length) this.successMessage = `${rows.length} feed(s) marked prepared.`;
  }

  give(d: FeedDoseRow): void {
    this.act(d, 'give', { givenByName: this.givenByName.trim() || this.username }, 'Given');
  }

  async skip(d: FeedDoseRow): Promise<void> {
    const reason = await this.alertSvc.prompt(`Why was the ${new Date(d.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} feed not given?`, {
      title: 'Feed not given', placeholder: 'e.g. patient vomited, NPO for procedure, tube blocked',
    });
    if (!reason?.trim()) return;
    this.act(d, 'skip', { reason: reason.trim() }, 'Marked not given');
  }

  private act(d: FeedDoseRow, action: 'prepare' | 'give' | 'skip', body: { givenByName?: string; reason?: string }, msg: string | null): void {
    this.errorMessage = '';
    this.svc.updateFeed(d.id, action, body).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        Object.assign(d, { status: r.status, preparedAt: r.preparedAt, givenAt: r.givenAt, givenByName: r.givenByName, skipReason: r.skipReason });
        if (msg) this.successMessage = `${msg}: bed ${d.bedNumber || '—'} at ${new Date(d.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
      },
      error: (e) => { this.errorMessage = e?.error?.error || 'Update failed'; },
    });
  }

  trackDose(_: number, d: FeedDoseRow): string { return d.id; }
}
