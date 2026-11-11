import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ActivityLogService, ActivityUser, ActivityRow, ActivityDownload } from '../services/activity-log.service';
import { DownloadOtpService } from '../shared/download-otp/download-otp.service';

/**
 * User-activity log — who logged in, what they did, what they downloaded.
 * Route: /activity-log (super_admin only; the API enforces it too).
 */
@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-log.component.html',
  styleUrls: ['./activity-log.component.css'],
})
export class ActivityLogComponent implements OnInit, OnDestroy {
  from = '';
  to = '';
  search = '';
  hideIdle = true;
  users: ActivityUser[] = [];
  failedLogins = 0;
  sortKey: 'lastActionAt' | 'lastLoginAt' | 'actions' | 'name' = 'lastActionAt';

  selected: ActivityUser | null = null;
  module = '';
  action = '';
  page = 1;
  readonly pageSize = 50;
  rows: ActivityRow[] = [];
  total = 0;
  downloads: ActivityDownload[] = [];
  modules: string[] = [];
  actions: string[] = [];
  expanded: string | null = null;

  loading = false;
  timelineLoading = false;
  errorMessage = '';
  private destroy$ = new Subject<void>();

  constructor(private svc: ActivityLogService, private downloadOtp: DownloadOtpService) {
    const p = (n: number) => String(n).padStart(2, '0');
    const ymd = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const t = new Date();
    this.to = ymd(t);
    this.from = ymd(new Date(t.getTime() - 29 * 86_400_000));
  }

  ngOnInit(): void {
    this.loadUsers();
    this.svc.facets().pipe(takeUntil(this.destroy$)).subscribe({ next: (f) => { this.modules = f.modules; this.actions = f.actions; }, error: () => {} });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.users({ from: this.from, to: this.to }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.users = r.data; this.failedLogins = r.failedLogins; this.loading = false;
        this.sumTotals(); this.applyFilter(); this.loadTimeline();
      },
      error: (e) => { this.loading = false; this.errorMessage = e?.error?.message || e?.error?.error || 'Failed to load activity'; },
    });
  }

  /** Filtered + sorted list, rebuilt only on change (stable array for *ngFor). */
  visible: ActivityUser[] = [];
  applyFilter(): void {
    const q = this.search.trim().toLowerCase();
    const t = (v: string | null) => (v ? new Date(v).getTime() : 0);
    this.visible = this.users
      .filter((u) => !this.hideIdle || u.actions || u.logins || u.downloads)
      .filter((u) => !q || [u.name, u.username, u.employeeId, u.title, u.role].some((x) => x?.toLowerCase().includes(q)))
      .sort((a, b) => this.sortKey === 'name' ? a.name.localeCompare(b.name)
        : this.sortKey === 'actions' ? b.actions - a.actions
          : t(b[this.sortKey]) - t(a[this.sortKey]));
  }
  sortBy(k: typeof this.sortKey): void { this.sortKey = k; this.applyFilter(); }

  get activeCount(): number { return this.users.filter((u) => u.actions || u.logins).length; }
  totals = { logins: 0, actions: 0, downloads: 0 };
  private sumTotals(): void {
    this.totals = this.users.reduce((t, u) => ({ logins: t.logins + u.logins, actions: t.actions + u.actions, downloads: t.downloads + u.downloads }), { logins: 0, actions: 0, downloads: 0 });
  }

  open(u: ActivityUser | null): void {
    this.selected = u;
    this.page = 1;
    this.expanded = null;
    this.loadTimeline();
  }

  loadTimeline(): void {
    this.timelineLoading = true;
    this.svc.timeline({
      from: this.from, to: this.to, userId: this.selected?.id ?? null, module: this.module, action: this.action,
      page: this.page, pageSize: this.pageSize,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data; this.total = r.total; this.downloads = r.downloads ?? []; this.timelineLoading = false; },
      error: (e) => { this.timelineLoading = false; this.errorMessage = e?.error?.message || 'Failed to load the timeline'; },
    });
  }
  setFilter(): void { this.page = 1; this.loadTimeline(); }
  get pages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  go(p: number): void { if (p < 1 || p > this.pages) return; this.page = p; this.loadTimeline(); }

  /** Failed logins across everyone (no user attached). */
  showFailed(): void {
    this.selected = null;
    this.module = 'auth';
    this.action = 'LOGIN_FAILED';
    this.page = 1;
    this.loadTimeline();
  }

  device(ua: string | null): string {
    if (!ua) return '';
    const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : '';
    const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /okhttp|Dart|axios|node/i.test(ua) ? 'App' : '';
    return [br, os].filter(Boolean).join(' · ');
  }
  actionClass(a: string): string {
    return a === 'LOGIN' ? 'al-login' : a === 'LOGIN_FAILED' ? 'al-fail' : a === 'DELETE' ? 'al-del' : a === 'EXPORT' ? 'al-exp' : '';
  }

  async exportCsv(): Promise<void> {
    if (!(await this.downloadOtp.verify('User activity log (CSV)'))) return;
    const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [['User', 'Employee ID', 'Role / title', 'Last login', 'Logins', 'Actions', 'Last action', 'Downloads'].join(',')];
    for (const u of this.visible) {
      lines.push([u.name, u.employeeId, u.title || u.role, u.lastLoginAt, u.logins, u.actions, u.lastActionAt, u.downloads].map(esc).join(','));
    }
    const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-activity-${this.from}-to-${this.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
