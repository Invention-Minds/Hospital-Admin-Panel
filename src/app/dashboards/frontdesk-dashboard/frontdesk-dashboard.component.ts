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
  FrontDeskQueueRow,
  FrontDeskSummary,
} from '../services/dashboard.service';
import { DonutSlice } from '../widgets/donut-chart/donut-chart.component';
import { BarListItem } from '../widgets/bar-list-card/bar-list-card.component';

const TONE_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9', '#22c55e', '#64748b'];

/**
 * Reception / Tele-caller / Front Desk dashboard. Operational live view —
 * appointment queue, hourly arrival pattern, channel mix, callback list,
 * doctors on leave. Auto-refresh every 60s.
 */
@Component({
  selector: 'app-frontdesk-dashboard',
  templateUrl: './frontdesk-dashboard.component.html',
  styleUrls: ['./frontdesk-dashboard.component.css'],
})
export class FrontDeskDashboardComponent implements OnInit, OnDestroy {
  summary?: FrontDeskSummary;
  isLoading = true;
  errorMsg = '';
  greeting = '';
  todayLabel = '';

  queueFilter: 'all' | 'waiting' | 'done' | 'no-show' = 'all';
  filteredQueue: FrontDeskQueueRow[] = [];

  channelSlices: DonutSlice[] = [];
  hourCells: Array<{ hour: number; count: number; intensity: number; label: string }> = [];

  // New widgets
  deptBookingSlices: DonutSlice[] = [];
  busiestDoctorsItems: BarListItem[] = [];
  patientMixSlices: DonutSlice[] = [];

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

  setQueueFilter(f: 'all' | 'waiting' | 'done' | 'no-show'): void {
    this.queueFilter = f;
    this.applyFilter();
  }

  waitClass(mins: number | null): string {
    if (mins === null) return '';
    if (mins > 30) return 'wait-pill wait-red';
    if (mins >= 15) return 'wait-pill wait-amber';
    return 'wait-pill wait-green';
  }

  statusLabel(row: FrontDeskQueueRow): string {
    if (row.endConsultation) return 'Done';
    if (row.checkedIn) return 'Waiting';
    if (row.arrived) return 'Arrived';
    if (row.status === 'cancelled') return 'Cancelled';
    if (row.status === 'confirmed') return 'Confirmed';
    return 'Scheduled';
  }

  statusClass(row: FrontDeskQueueRow): string {
    if (row.endConsultation) return 'status status-done';
    if (row.checkedIn) return 'status status-waiting';
    if (row.arrived) return 'status status-arrived';
    if (row.status === 'cancelled') return 'status status-cancelled';
    return 'status status-scheduled';
  }

  trackQueueRow = (_: number, r: FrontDeskQueueRow): number => r.id;
  trackCallback = (_: number, c: { id: number }): number => c.id;

  goToAppointments(): void {
    this.router.navigate(['/appointments']);
  }

  private fetchSummary(silent = false): void {
    if (!silent) this.isLoading = true;
    this.errorMsg = '';
    this.dashboardService.getFrontDeskSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.applyFilter();
        this.buildChannelSlices(data);
        this.buildHourCells(data);
        this.deptBookingSlices = (data.deptBookingMix || []).map((d, i) => ({
          name: d.name,
          value: d.value,
          color: TONE_PALETTE[i % TONE_PALETTE.length],
        }));
        this.busiestDoctorsItems = (data.busiestDoctors || []).map((d) => ({
          label: 'Dr. ' + d.doctorName,
          count: d.count,
        }));
        const mixPalette: Record<string, string> = {
          New: '#3b82f6',
          'Follow-up': '#10b981',
          Referral: '#f59e0b',
          Other: '#94a3b8',
        };
        this.patientMixSlices = (data.patientMixToday || []).map((m) => ({
          name: m.name,
          value: m.value,
          color: mixPalette[m.name] || '#64748b',
        }));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[FrontDeskDashboard] fetch failed:', err);
        this.errorMsg =
          err?.error?.error || 'Unable to load the dashboard right now.';
        this.isLoading = false;
      },
    });
  }

  private applyFilter(): void {
    if (!this.summary) {
      this.filteredQueue = [];
      return;
    }
    const all = this.summary.queue;
    switch (this.queueFilter) {
      case 'waiting':
        this.filteredQueue = all.filter((r) => r.checkedIn && !r.endConsultation);
        break;
      case 'done':
        this.filteredQueue = all.filter((r) => r.endConsultation);
        break;
      case 'no-show':
        this.filteredQueue = all.filter(
          (r) =>
            !r.checkedIn &&
            !r.endConsultation &&
            r.status !== 'cancelled',
        );
        break;
      default:
        this.filteredQueue = all;
    }
  }

  private buildChannelSlices(data: FrontDeskSummary): void {
    const palette: Record<string, string> = {
      'walk-in': '#3b82f6',
      whatsapp: '#10b981',
      phone: '#f59e0b',
      web: '#8b5cf6',
      website: '#8b5cf6',
      online: '#8b5cf6',
    };
    this.channelSlices = data.channelMix.map((c) => ({
      name: this.titleCase(c.name),
      value: c.value,
      color: palette[c.name.toLowerCase()] || '#64748b',
    }));
  }

  private buildHourCells(data: FrontDeskSummary): void {
    const max = Math.max(1, ...data.hourlyArrivals.map((h) => h.count));
    this.hourCells = data.hourlyArrivals.map((h) => ({
      hour: h.hour,
      count: h.count,
      intensity: max > 0 ? h.count / max : 0,
      label: this.hourLabel(h.hour),
    }));
  }

  heatmapCellStyle(intensity: number): { [k: string]: string } {
    if (intensity === 0) return { background: '#f1f5f9', color: '#94a3b8' };
    const opacity = 0.18 + intensity * 0.82;
    return {
      background: `rgba(59, 130, 246, ${opacity.toFixed(2)})`,
      color: intensity > 0.55 ? '#fff' : '#1d4ed8',
    };
  }

  private hourLabel(h: number): string {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  }

  private titleCase(s: string): string {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
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
