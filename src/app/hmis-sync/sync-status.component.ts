import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  HmisSyncService,
  HmisDeadLetter,
  HmisConflict,
} from '../services/hmis-sync.service';
import { AlertService } from '../services/alert.service';

@Component({
  selector: 'app-sync-status',
  templateUrl: './sync-status.component.html',
  styleUrls: ['./sync-status.component.css']
})
export class SyncStatusComponent implements OnInit, OnDestroy {
  loading = false;
  moduleStatuses: any[] = [];
  health: any = { healthy: true, status: 'healthy', successRate: 100, recentHour: { success: 0, failed: 0, total: 0 } };
  stats: any = { total: 0, success: 0, failed: 0, pending: 0, successRate: 0, byModule: {} };
  auditLogs: any[] = [];
  failedCount: number = 0;

  // Phase 9 — sync hardening tabs.
  activeTab: 'overview' | 'dead-letter' | 'conflicts' = 'overview';
  deadLetters: HmisDeadLetter[] = [];
  conflicts: HmisConflict[] = [];

  // Resolve dialog state — single dialog reused for both DL and conflict rows.
  resolveDialog: {
    visible: boolean;
    kind: 'dead-letter' | 'conflict' | null;
    rowId: number | null;
    outcome: string;
    resolution: string;
    submitting: boolean;
  } = {
    visible: false,
    kind: null,
    rowId: null,
    outcome: '',
    resolution: '',
    submitting: false,
  };

  private destroy$ = new Subject<void>();

  constructor(private hmisSyncService: HmisSyncService, private alertSvc: AlertService) { }

  ngOnInit(): void {
    this.loadStatus();
    this.loadHealth();
    this.loadStats();
    this.loadAuditLogs();
    this.loadFailedCount();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStatus(): void {
    this.loading = true;
    this.hmisSyncService.getSyncStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res || [];
          this.moduleStatuses = Array.isArray(data) ? data : [];
          this.loading = false;
        },
        error: (err) => {
          console.error('Status load failed', err);
          this.loading = false;
        }
      });
  }

  loadHealth(): void {
    this.hmisSyncService.getHmisHealthStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => { this.health = res?.data || res; },
        error: (err) => console.error('Health load failed', err)
      });
  }

  loadStats(): void {
    this.hmisSyncService.getSyncStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => { this.stats = res?.data || res; },
        error: (err) => console.error('Stats load failed', err)
      });
  }

  loadAuditLogs(): void {
    this.hmisSyncService.getAuditLogs(20, 0)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res || [];
          this.auditLogs = Array.isArray(data) ? data : [];
        },
        error: (err) => console.error('Audit logs failed', err)
      });
  }

  loadFailedCount(): void {
    this.hmisSyncService.getFailedSyncsCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => { this.failedCount = res?.count || 0; },
        error: (err) => console.error('Failed count failed', err)
      });
  }

  async retryAllFailed(): Promise<void> {
    if (!await this.alertSvc.confirm('Retry all failed syncs?', { confirmLabel: 'Retry all' })) return;
    this.hmisSyncService.retryAllFailedSyncs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.refresh(),
        error: (err) => console.error('Retry all failed', err)
      });
  }

  downloadAuditReport(): void {
    this.hmisSyncService.downloadAuditReport()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'hmis-audit-log.csv';
          a.click();
          URL.revokeObjectURL(url);
        },
        error: (err) => console.error('Download failed', err)
      });
  }

  retrySingle(logId: number): void {
    this.hmisSyncService.retrySyncLog(logId.toString())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.refresh(),
        error: (err) => console.error('Retry failed', err)
      });
  }

  refresh(): void {
    this.loadStatus();
    this.loadHealth();
    this.loadStats();
    this.loadAuditLogs();
    this.loadFailedCount();
    if (this.activeTab === 'dead-letter') this.loadDeadLetters();
    if (this.activeTab === 'conflicts') this.loadConflicts();
  }

  // ─── Phase 9 — Tab switching + loaders ────────────────────────────────
  selectTab(tab: 'overview' | 'dead-letter' | 'conflicts'): void {
    this.activeTab = tab;
    if (tab === 'dead-letter') this.loadDeadLetters();
    if (tab === 'conflicts') this.loadConflicts();
  }

  loadDeadLetters(): void {
    this.hmisSyncService
      .listDeadLetters({ status: 'QUARANTINED' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          this.deadLetters = rows ?? [];
        },
        error: (err) => console.error('Dead-letter load failed', err),
      });
  }

  loadConflicts(): void {
    this.hmisSyncService
      .listConflicts({ status: 'OPEN' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          this.conflicts = rows ?? [];
        },
        error: (err) => console.error('Conflicts load failed', err),
      });
  }

  runDeadLetterMover(): void {
    this.hmisSyncService
      .runDeadLetterMover()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.alertSvc.show(`Dead-letter mover ran. ${res.moved} row(s) quarantined.`);
          this.loadDeadLetters();
          this.loadFailedCount();
        },
        error: (err) => this.alertSvc.show(err?.error?.error || 'Mover failed'),
      });
  }

  // ─── Resolve dialog ───────────────────────────────────────────────────
  openResolve(kind: 'dead-letter' | 'conflict', rowId: number): void {
    this.resolveDialog = {
      visible: true,
      kind,
      rowId,
      outcome: kind === 'dead-letter' ? 'RESOLVED' : 'RESOLVED_LOCAL',
      resolution: '',
      submitting: false,
    };
  }

  closeResolve(): void {
    this.resolveDialog.visible = false;
  }

  submitResolve(): void {
    const { kind, rowId, outcome, resolution } = this.resolveDialog;
    if (!kind || rowId == null) return;
    if (!resolution || resolution.trim().length < 5) {
      this.alertSvc.show('Resolution note (min 5 chars) is required.');
      return;
    }
    this.resolveDialog.submitting = true;

    if (kind === 'dead-letter') {
      this.hmisSyncService
        .resolveDeadLetter(rowId, {
          outcome: outcome as 'RESOLVED' | 'IGNORED' | 'REPLAYED',
          resolution: resolution.trim(),
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.resolveDialog.submitting = false;
            this.resolveDialog.visible = false;
            this.loadDeadLetters();
            this.loadFailedCount();
          },
          error: (err) => {
            this.resolveDialog.submitting = false;
            this.alertSvc.show(err?.error?.error || 'Resolve failed');
          },
        });
    } else {
      this.hmisSyncService
        .resolveConflict(rowId, {
          outcome: outcome as 'RESOLVED_LOCAL' | 'RESOLVED_HMIS' | 'IGNORED',
          resolution: resolution.trim(),
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.resolveDialog.submitting = false;
            this.resolveDialog.visible = false;
            this.loadConflicts();
          },
          error: (err) => {
            this.resolveDialog.submitting = false;
            this.alertSvc.show(err?.error?.error || 'Resolve failed');
          },
        });
    }
  }

  getStatusColor(status: string): string {
    if (status === 'success') return '#10b981';
    if (status === 'failed') return '#dc2626';
    if (status === 'pending') return '#f59e0b';
    return '#9ca3af';
  }

  getModuleKeys(): string[] {
    return this.stats?.byModule ? Object.keys(this.stats.byModule) : [];
  }
}
