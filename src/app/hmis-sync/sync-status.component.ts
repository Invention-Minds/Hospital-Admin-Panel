import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HmisSyncService } from '../services/hmis-sync.service';

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

  private destroy$ = new Subject<void>();

  constructor(private hmisSyncService: HmisSyncService) { }

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

  retryAllFailed(): void {
    if (!confirm('Retry all failed syncs?')) return;
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
