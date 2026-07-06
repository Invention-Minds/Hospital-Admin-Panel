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
  NursingSuperSummary,
  WardSummaryRow,
} from '../services/dashboard.service';
import { BarListItem } from '../widgets/bar-list-card/bar-list-card.component';

/**
 * Nursing Superintendent dashboard — hospital-wide nursing oversight.
 * Per-ward table, pending bed-request queue, ICU step-down requests,
 * discharge pipeline, NABH-style compliance score. Auto-refresh every 60s.
 */
@Component({
  selector: 'app-nursing-super-dashboard',
  templateUrl: './nursing-super-dashboard.component.html',
  styleUrls: ['./nursing-super-dashboard.component.css'],
})
export class NursingSuperDashboardComponent implements OnInit, OnDestroy {
  summary?: NursingSuperSummary;
  isLoading = true;
  errorMsg = '';
  greeting = '';
  todayLabel = '';

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
    this.todayLabel = this.formatLongDate(new Date());
    this.greeting = this.getGreeting();
    this.fetchSummary();
    this.refreshSub = interval(60_000).subscribe(() => this.fetchSummary(true));
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  refresh(): void {
    this.fetchSummary();
  }

  ratioClass(ratio: string | null): string {
    if (!ratio) return 'ratio-unknown';
    const r = parseFloat(ratio);
    if (Number.isNaN(r)) return 'ratio-unknown';
    if (r > 8) return 'ratio-bad';
    if (r > 5) return 'ratio-warn';
    return 'ratio-ok';
  }

  occupancyClass(p: number | null): string {
    if (p === null) return '';
    if (p >= 95) return 'occ-bad';
    if (p >= 80) return 'occ-warn';
    return 'occ-ok';
  }

  goToBedRequests(): void {
    this.router.navigate(['/icu-transfer-queue']);
  }

  goToHandover(): void {
    this.router.navigate(['/staff-handover']);
  }

  trackWard = (_: number, w: WardSummaryRow): string => w.wardId;

  losByWardItems: BarListItem[] = [];

  private buildLosBarItems(): void {
    if (!this.summary) {
      this.losByWardItems = [];
      return;
    }
    this.losByWardItems = this.summary.losByWard.map((w) => ({
      label: w.wardName,
      count: w.avgLosDays,
    }));
  }

  private fetchSummary(silent = false): void {
    if (!silent) this.isLoading = true;
    this.errorMsg = '';
    this.dashboardService.getNursingSuperSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.buildLosBarItems();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[NursingSuperDashboard] fetch failed:', err);
        this.errorMsg =
          err?.error?.error || 'Unable to load the dashboard right now.';
        this.isLoading = false;
      },
    });
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
