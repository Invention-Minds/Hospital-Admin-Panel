import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import * as echarts from 'echarts';
import {
  DashboardService,
  ManagementSummary,
} from '../services/dashboard.service';
import { DonutSlice } from '../widgets/donut-chart/donut-chart.component';
import { BarListItem } from '../widgets/bar-list-card/bar-list-card.component';

/**
 * Hospital-wide dashboard for admin / manager personas. Big-picture KPIs +
 * trend chart + dept revenue mix + flow funnel + doctor leaderboard + alerts.
 * Auto-refresh every 60s.
 */
@Component({
  selector: 'app-management-dashboard',
  templateUrl: './management-dashboard.component.html',
  styleUrls: ['./management-dashboard.component.css'],
})
export class ManagementDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('trendChart', { static: false }) trendChartEl?: ElementRef<HTMLDivElement>;
  @ViewChild('funnelChart', { static: false }) funnelChartEl?: ElementRef<HTMLDivElement>;

  summary?: ManagementSummary;
  isLoading = true;
  errorMsg = '';
  greeting = '';
  todayLabel = '';

  revenueDonutSlices: DonutSlice[] = [];
  doctorLeaderboardItems: BarListItem[] = [];

  // New cards
  hospitalGenderSlices: DonutSlice[] = [];
  erTriageSlices: DonutSlice[] = [];
  losBarItems: BarListItem[] = [];
  ageBandMax = 0;

  @ViewChild('revTrendChart', { static: false }) revTrendChartEl?: ElementRef<HTMLDivElement>;
  @ViewChild('admDisChart', { static: false }) admDisChartEl?: ElementRef<HTMLDivElement>;
  private revTrendChart: echarts.ECharts | null = null;
  private admDisChart: echarts.ECharts | null = null;

  private trendChart: echarts.ECharts | null = null;
  private funnelChart: echarts.ECharts | null = null;
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

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.trendChart?.dispose();
    this.funnelChart?.dispose();
    this.revTrendChart?.dispose();
    this.admDisChart?.dispose();
    this.trendChart = null;
    this.funnelChart = null;
    this.revTrendChart = null;
    this.admDisChart = null;
  }

  refresh(): void {
    this.fetchSummary();
  }

  formatINR(n: number): string {
    if (n === 0) return '₹0';
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${Math.round(n)}`;
  }

  openAlert(link: string | null): void {
    if (link) this.router.navigateByUrl(link);
  }

  private fetchSummary(silent = false): void {
    if (!silent) this.isLoading = true;
    this.errorMsg = '';
    this.dashboardService.getManagementSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.revenueDonutSlices = data.departmentRevenueMix.map((d) => ({
          name: d.name,
          value: d.value,
        }));
        this.doctorLeaderboardItems = data.doctorLeaderboard.map((d) => ({
          label: 'Dr. ' + d.doctorName,
          count: d.count,
        }));
        // New widget view-models
        const genderPalette: Record<string, string> = {
          Male: '#3b82f6',
          Female: '#ec4899',
          Other: '#8b5cf6',
          Unknown: '#94a3b8',
        };
        this.hospitalGenderSlices = (data.hospitalDemographics?.gender || []).map((g) => ({
          name: g.name,
          value: g.value,
          color: genderPalette[g.name] || '#64748b',
        }));
        const triagePalette: Record<string, string> = {
          red: '#ef4444',
          yellow: '#f59e0b',
          green: '#10b981',
          black: '#1f2937',
        };
        this.erTriageSlices = (data.erTriageToday || []).map((t) => ({
          name: t.category.charAt(0).toUpperCase() + t.category.slice(1),
          value: t.count,
          color: triagePalette[t.category] || '#94a3b8',
        }));
        this.losBarItems = (data.losDistribution || []).map((b) => ({
          label: b.band,
          count: b.count,
        }));
        const ageMax = (data.hospitalDemographics?.ageBands || []).reduce(
          (m, b) => Math.max(m, b.count),
          1,
        );
        this.ageBandMax = ageMax;
        this.isLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.renderTrend();
          this.renderFunnel();
          this.renderRevTrend();
          this.renderAdmDis();
        }, 0);
      },
      error: (err) => {
        console.error('[ManagementDashboard] fetch failed:', err);
        this.errorMsg =
          err?.error?.error || 'Unable to load the dashboard right now.';
        this.isLoading = false;
      },
    });
  }

  private renderTrend(): void {
    if (!this.isBrowser || !this.summary) return;
    const el = this.trendChartEl?.nativeElement;
    if (!el) return;
    if (this.trendChart) this.trendChart.dispose();
    this.trendChart = echarts.init(el);

    const dates = this.summary.footfallTrend30d.map((d) => this.shortDate(d.date));
    this.trendChart.setOption({
      grid: { left: 40, right: 16, top: 36, bottom: 36 },
      tooltip: { trigger: 'axis' },
      legend: {
        top: 4,
        left: 'center',
        textStyle: { color: '#475569', fontSize: 11 },
        icon: 'circle',
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#64748b', fontSize: 10 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [
        {
          name: 'OPD',
          type: 'line',
          stack: 'total',
          smooth: true,
          symbol: 'none',
          areaStyle: { color: 'rgba(59, 130, 246, 0.4)' },
          lineStyle: { color: '#3b82f6', width: 1.5 },
          data: this.summary.footfallTrend30d.map((d) => d.opd),
        },
        {
          name: 'IPD',
          type: 'line',
          stack: 'total',
          smooth: true,
          symbol: 'none',
          areaStyle: { color: 'rgba(139, 92, 246, 0.4)' },
          lineStyle: { color: '#8b5cf6', width: 1.5 },
          data: this.summary.footfallTrend30d.map((d) => d.ipd),
        },
        {
          name: 'ER',
          type: 'line',
          stack: 'total',
          smooth: true,
          symbol: 'none',
          areaStyle: { color: 'rgba(239, 68, 68, 0.4)' },
          lineStyle: { color: '#ef4444', width: 1.5 },
          data: this.summary.footfallTrend30d.map((d) => d.er),
        },
      ],
    });
  }

  private renderFunnel(): void {
    if (!this.isBrowser || !this.summary) return;
    const el = this.funnelChartEl?.nativeElement;
    if (!el) return;
    if (this.funnelChart) this.funnelChart.dispose();
    this.funnelChart = echarts.init(el);

    this.funnelChart.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c}' },
      series: [
        {
          type: 'funnel',
          left: '10%',
          right: '10%',
          top: 10,
          bottom: 10,
          minSize: '0%',
          maxSize: '100%',
          sort: 'descending',
          gap: 2,
          label: {
            show: true,
            position: 'inside',
            color: '#fff',
            fontWeight: 600,
            fontSize: 11,
            formatter: '{b}: {c}',
          },
          itemStyle: { borderColor: '#fff', borderWidth: 2 },
          color: ['#3b82f6', '#0ea5e9', '#10b981', '#8b5cf6', '#ef4444'],
          data: this.summary.flowFunnel.map((s) => ({
            name: s.stage,
            value: s.value,
          })),
        },
      ],
    });
  }

  ageBandsForRender(): Array<{ band: string; count: number }> {
    return this.summary?.hospitalDemographics?.ageBands || [];
  }

  private renderRevTrend(): void {
    if (!this.isBrowser || !this.summary) return;
    const el = this.revTrendChartEl?.nativeElement;
    if (!el) return;
    if (this.revTrendChart) this.revTrendChart.dispose();
    this.revTrendChart = echarts.init(el);
    const dates = this.summary.revenueTrend30d.map((d) => this.shortDate(d.date));
    const values = this.summary.revenueTrend30d.map((d) => Math.round(d.amount));
    this.revTrendChart.setOption({
      grid: { left: 56, right: 16, top: 24, bottom: 36 },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `${p.axisValue}<br/><b>${this.formatINR(p.value)}</b>`;
        },
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLabel: { color: '#64748b', fontSize: 10 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          formatter: (v: number) => this.formatINR(v),
        },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: values,
          lineStyle: { color: '#10b981', width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(16, 185, 129, 0.30)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.02)' },
            ]),
          },
        },
      ],
    });
  }

  private renderAdmDis(): void {
    if (!this.isBrowser || !this.summary) return;
    const el = this.admDisChartEl?.nativeElement;
    if (!el) return;
    if (this.admDisChart) this.admDisChart.dispose();
    this.admDisChart = echarts.init(el);
    const dates = this.summary.admissionsVsDischarges30d.map((d) => this.shortDate(d.date));
    this.admDisChart.setOption({
      grid: { left: 36, right: 16, top: 32, bottom: 36 },
      tooltip: { trigger: 'axis' },
      legend: {
        top: 4,
        left: 'center',
        textStyle: { color: '#475569', fontSize: 11 },
        icon: 'circle',
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#64748b', fontSize: 10 },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: [
        {
          name: 'Admissions',
          type: 'bar',
          data: this.summary.admissionsVsDischarges30d.map((d) => d.admissions),
          itemStyle: { color: '#3b82f6', borderRadius: [2, 2, 0, 0] },
        },
        {
          name: 'Discharges',
          type: 'bar',
          data: this.summary.admissionsVsDischarges30d.map((d) => d.discharges),
          itemStyle: { color: '#10b981', borderRadius: [2, 2, 0, 0] },
        },
      ],
    });
  }

  private shortDate(ymd: string): string {
    const p = ymd.split('-');
    if (p.length !== 3) return ymd;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${Number(p[2])} ${months[Number(p[1]) - 1] || ''}`.trim();
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
