import { Component, OnInit, OnDestroy } from '@angular/core';
import { WardManagementService } from '../../services/ward-management.service';
import { MessageService } from 'primeng/api';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-bed-census',
  templateUrl: './bed-census.component.html',
  styleUrls: ['./bed-census.component.css']
})
export class BedCensusComponent implements OnInit, OnDestroy {
  censusData: any[] = [];
  loading = false;
  selectedWard: any = null;
  totalStats = {
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    occupancyRate: 0
  };

  private destroy$ = new Subject<void>();
  private refreshInterval$ = new Subject<void>();

  constructor(
    private wardService: WardManagementService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.loadBedCensus();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.refreshInterval$.next();
    this.refreshInterval$.complete();
  }

  loadBedCensus(): void {
    this.loading = true;
    this.wardService.getBedCensus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (census) => {
          this.censusData = census;
          this.calculateTotalStats();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load bed census data'
          });
          console.error(error);
        },
        complete: () => {
          this.loading = false;
        }
      });
  }

  startAutoRefresh(): void {
    interval(30000) // Refresh every 30 seconds
      .pipe(
        switchMap(() => this.wardService.getBedCensus()),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (census) => {
          this.censusData = census;
          this.calculateTotalStats();
        }
      });
  }

  calculateTotalStats(): void {
    this.totalStats.totalBeds = this.censusData.reduce((sum, ward) => sum + ward.totalBeds, 0);
    this.totalStats.occupiedBeds = this.censusData.reduce((sum, ward) => sum + ward.occupiedBeds, 0);
    this.totalStats.availableBeds = this.censusData.reduce((sum, ward) => sum + ward.availableBeds, 0);
    this.totalStats.occupancyRate = this.totalStats.totalBeds > 0
      ? Math.round((this.totalStats.occupiedBeds / this.totalStats.totalBeds) * 100)
      : 0;
  }

  getOccupancyColor(occupancyRate: number): string {
    if (occupancyRate < 50) return 'success'; // < 50% green
    if (occupancyRate < 80) return 'warning'; // 50-80% yellow
    return 'danger'; // > 80% red
  }

  getOccupancyIcon(occupancyRate: number): string {
    if (occupancyRate < 50) return 'pi pi-check-circle';
    if (occupancyRate < 80) return 'pi pi-exclamation-circle';
    return 'pi pi-times-circle';
  }

  viewWardDetails(ward: any): void {
    this.selectedWard = ward;
  }

  refreshCensus(): void {
    this.loadBedCensus();
    this.messageService.add({
      severity: 'info',
      summary: 'Refreshed',
      detail: 'Bed census data refreshed'
    });
  }

  downloadReport(): void {
    this.wardService.downloadBedCensusReport()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `bed-census-${new Date().toISOString().split('T')[0]}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to download report'
          });
        }
      });
  }
}
