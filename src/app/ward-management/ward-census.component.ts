import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WardManagementService, BedCensus } from '../services/ward-management.service';

type Mode = 'live' | 'snapshot';

@Component({
  selector: 'app-ward-census',
  templateUrl: './ward-census.component.html',
  styleUrls: ['./ward-census.component.css']
})
export class WardCensusComponent implements OnInit, OnDestroy {
  loading = false;
  census: BedCensus[] = [];
  stats: any = {
    totalWards: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    maintenanceBeds: 0,
    reservedBeds: 0,
    occupancyRate: 0
  };

  autoRefresh = true;

  // Sprint 4a Phase 1e — date picker + snapshot-mode state
  selectedDate: Date = new Date();
  readonly today: Date = new Date();
  maxDate: Date = new Date();
  mode: Mode = 'live';
  snapshotMissing = false;
  snapshotTime: Date | null = null;
  snapshotReason: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private wardService: WardManagementService) { }

  ngOnInit(): void {
    this.loadCensus();
    this.loadStats();

    // Auto-refresh every 60s — only fires in live mode.
    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.autoRefresh && this.mode === 'live') this.refresh();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  private toYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  onDateChange(): void {
    const today = new Date();
    this.mode = this.isSameDay(this.selectedDate, today) ? 'live' : 'snapshot';
    this.snapshotMissing = false;
    this.snapshotTime = null;
    this.snapshotReason = null;

    if (this.mode === 'live') {
      this.loadCensus();
      this.loadStats();
    } else {
      this.loadSnapshot();
    }
  }

  loadCensus(): void {
    this.loading = true;
    this.wardService.getBedCensus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res || [];
          this.census = Array.isArray(data) ? data : [];
          this.loading = false;
        },
        error: (err) => {
          console.error('Census load failed', err);
          this.loading = false;
        }
      });
  }

  loadSnapshot(): void {
    this.loading = true;
    const ymd = this.toYmd(this.selectedDate);
    this.wardService.getWardCensusSnapshot(ymd)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const wards = res?.data?.wards || [];
          // Normalize snapshot rows into the same shape the live view expects.
          this.census = wards.map((w: any) => ({
            wardId: w.wardId,
            wardName: w.wardName,
            wardCode: w.wardCode,
            totalBeds: w.totalBeds,
            occupiedBeds: w.occupiedBeds,
            availableBeds: w.availableBeds,
            occupancyRate: w.occupancyRate,
            beds: [], // snapshot rows don't carry per-bed detail
          }));
          this.snapshotTime = res?.data?.snapshotTime ? new Date(res.data.snapshotTime) : null;
          this.snapshotReason = res?.data?.snapshotReason || null;
          this.snapshotMissing = false;
          // Derive aggregate stats from the snapshot rows for the header cards.
          this.stats = this.deriveStats(wards);
          this.loading = false;
        },
        error: (err) => {
          if (err?.status === 404) {
            this.census = [];
            this.stats = { totalWards: 0, totalBeds: 0, occupiedBeds: 0, availableBeds: 0, maintenanceBeds: 0, reservedBeds: 0, occupancyRate: 0 };
            this.snapshotMissing = true;
          } else {
            console.error('Snapshot load failed', err);
          }
          this.loading = false;
        }
      });
  }

  private deriveStats(wards: any[]): any {
    const totalBeds = wards.reduce((s, w) => s + (w.totalBeds || 0), 0);
    const occupiedBeds = wards.reduce((s, w) => s + (w.occupiedBeds || 0), 0);
    const availableBeds = wards.reduce((s, w) => s + (w.availableBeds || 0), 0);
    const maintenanceBeds = wards.reduce((s, w) => s + (w.maintenanceBeds || 0), 0);
    const reservedBeds = wards.reduce((s, w) => s + (w.reservedBeds || 0), 0);
    return {
      totalWards: wards.length,
      totalBeds,
      occupiedBeds,
      availableBeds,
      maintenanceBeds,
      reservedBeds,
      occupancyRate: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    };
  }

  loadStats(): void {
    this.wardService.getWardStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => { this.stats = res?.data || res; },
        error: (err) => console.error('Stats load failed', err)
      });
  }

  downloadReport(): void {
    this.wardService.downloadBedCensusReport()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `bed-census-${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: (err) => console.error('Download failed', err)
      });
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
  }

  refresh(): void {
    if (this.mode === 'snapshot') {
      this.loadSnapshot();
    } else {
      this.loadCensus();
      this.loadStats();
    }
  }

  getOccupancyClass(rate: number): string {
    if (rate >= 90) return 'high';
    if (rate >= 70) return 'medium';
    return 'low';
  }
}
