import {
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import {
  DashboardService,
  NursePatientCard,
  NurseSummary,
} from '../services/dashboard.service';
import { DonutSlice } from '../widgets/donut-chart/donut-chart.component';

/**
 * Bedside nurse dashboard, scoped to a block (or ward set). Per-patient
 * cards with last vitals, medication queue, pending non-drug orders, and
 * critical/ICU flags. Auto-refresh every 60s.
 */
@Component({
  selector: 'app-nurse-dashboard',
  templateUrl: './nurse-dashboard.component.html',
  styleUrls: ['./nurse-dashboard.component.css'],
})
export class NurseDashboardComponent implements OnInit, OnDestroy {
  summary?: NurseSummary;
  isLoading = true;
  errorMsg = '';
  greeting = '';
  todayLabel = '';

  patientFilter: 'all' | 'critical' | 'overdue' = 'all';
  filteredPatients: NursePatientCard[] = [];

  acuitySlices: DonutSlice[] = [];

  private userId: number | null = null;
  private blockId: string = '';
  private refreshSub?: Subscription;
  private readonly isBrowser: boolean;

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.userId = parseInt(localStorage.getItem('userid') || '', 10);
    this.blockId = localStorage.getItem('blockId') || '';
    this.todayLabel = this.formatLongDate(new Date());
    this.greeting = this.getGreeting();
    if (!this.userId || Number.isNaN(this.userId)) {
      this.errorMsg = 'Cannot identify the logged-in nurse. Please sign in again.';
      this.isLoading = false;
      return;
    }
    this.fetchSummary();
    this.refreshSub = interval(60_000).subscribe(() => this.fetchSummary(true));
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  refresh(): void {
    this.fetchSummary();
  }

  setPatientFilter(f: 'all' | 'critical' | 'overdue'): void {
    this.patientFilter = f;
    this.applyFilter();
  }

  openPatient(p: NursePatientCard): void {
    this.router.navigateByUrl(`/ipd/admission/${p.admissionId}/progress-note`);
  }

  trackPatient = (_: number, p: NursePatientCard): string => p.admissionId;

  vitalsAgeMins(at: string): number | null {
    if (!at) return null;
    const t = new Date(at).getTime();
    if (Number.isNaN(t)) return null;
    return Math.max(0, Math.floor((Date.now() - t) / 60000));
  }

  censusMax(): number {
    if (!this.summary?.blockCensus7d?.length) return 1;
    return Math.max(1, ...this.summary.blockCensus7d.map((c) => c.count));
  }

  shortDay(ymd: string): string {
    const p = ymd.split('-');
    if (p.length !== 3) return ymd;
    const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[d.getDay()];
  }

  private fetchSummary(silent = false): void {
    if (!this.userId) return;
    if (!silent) this.isLoading = true;
    this.errorMsg = '';
    this.dashboardService.getNurseSummary(this.userId, this.blockId).subscribe({
      next: (data) => {
        this.summary = data;
        this.applyFilter();
        this.acuitySlices = data.acuityMix.map((s) => ({
          name: s.name,
          value: s.value,
          color:
            s.name === 'Critical' ? '#ef4444' :
            s.name === 'Active care' ? '#f59e0b' : '#10b981',
        }));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[NurseDashboard] fetch failed:', err);
        this.errorMsg =
          err?.error?.error || 'Unable to load the dashboard right now.';
        this.isLoading = false;
      },
    });
  }

  private applyFilter(): void {
    if (!this.summary) {
      this.filteredPatients = [];
      return;
    }
    switch (this.patientFilter) {
      case 'critical':
        this.filteredPatients = this.summary.patients.filter((p) => p.critical);
        break;
      case 'overdue':
        this.filteredPatients = this.summary.patients.filter(
          (p) => p.overdueMeds > 0 || p.pendingOrders > 0 || p.vitalsOverdue,
        );
        break;
      default:
        this.filteredPatients = this.summary.patients;
    }
  }

  private formatLongDate(d: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  private getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }
}
