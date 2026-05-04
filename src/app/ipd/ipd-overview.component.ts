import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IpdService, IpdAdmission } from '../services/ipd.service';

@Component({
  selector: 'app-ipd-overview',
  templateUrl: './ipd-overview.component.html',
  styleUrls: ['./ipd-overview.component.css']
})
export class IpdOverviewComponent implements OnInit, OnDestroy {
  activeComponent: string = 'dashboard';
  loading = false;

  stats: any = {
    total: 0,
    byStatus: { admitted: 0, discharged: 0, lama: 0, dama: 0, expired: 0, transferred: 0 },
    byType: { elective: 0, emergency: 0, direct: 0 },
    averageLengthOfStay: 0
  };

  admissions: IpdAdmission[] = [];
  wards: any[] = [];
  bedCensus: any[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private ipdService: IpdService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadStats();
    this.loadActiveAdmissions();
    this.loadBedCensus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStats(): void {
    this.ipdService.getIPDStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => { this.stats = res?.data || res; },
        error: (err) => console.error('IPD stats failed', err)
      });
  }

  loadActiveAdmissions(): void {
    this.loading = true;
    this.ipdService.getActiveAdmissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res || [];
          this.admissions = Array.isArray(data) ? data : [];
          this.loading = false;
        },
        error: (err) => {
          console.error('Admissions load failed', err);
          this.loading = false;
        }
      });
  }

  loadBedCensus(): void {
    this.ipdService.getBedCensus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res || [];
          this.bedCensus = Array.isArray(data) ? data : [];
        },
        error: (err) => console.error('Bed census failed', err)
      });
  }

  showDashboard(): void { this.activeComponent = 'dashboard'; }
  showAdmissions(): void { this.activeComponent = 'admissions'; }
  showBedManagement(): void { this.activeComponent = 'beds'; }
  showAnalytics(): void { this.activeComponent = 'analytics'; }

  newAdmission(): void {
    this.router.navigate(['/ipd/admission']);
  }

  viewAdmission(id?: string): void {
    // No standalone /ipd/admission/:id detail route exists; the daily-work
    // entry point for an admission is the progress-note page. From there the
    // user has nav links to discharge / pharmacy / MAR.
    if (id) this.router.navigate(['/ipd/admission', id, 'progress-note']);
  }

  refresh(): void {
    this.loadStats();
    this.loadActiveAdmissions();
    this.loadBedCensus();
  }

  getOccupancyClass(rate: number): string {
    if (rate >= 90) return 'high';
    if (rate >= 70) return 'medium';
    return 'low';
  }
}
