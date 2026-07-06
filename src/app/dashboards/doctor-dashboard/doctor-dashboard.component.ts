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
  AntenatalRow,
  CardiacTest,
  DashboardAlert,
  DashboardService,
  DoctorDashboardSummary,
  DoctorQueueRow,
  ErBoardRow,
  IpdRoundRow,
  OtTodayRow,
  PreOpRow,
  TopInvestigation,
  TopMedication,
} from '../services/dashboard.service';
import { DonutSlice } from '../widgets/donut-chart/donut-chart.component';
import { PatientListItem } from '../widgets/patient-list-card/patient-list-card.component';
import { BarListItem } from '../widgets/bar-list-card/bar-list-card.component';

@Component({
  selector: 'app-doctor-dashboard',
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.css'],
})
export class DoctorDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('trendChart', { static: false }) trendChartEl?: ElementRef<HTMLDivElement>;

  summary?: DoctorDashboardSummary;
  isLoading = true;
  errorMsg = '';
  greeting = '';
  todayLabel = '';
  filteredQueue: DoctorQueueRow[] = [];
  queueFilter: 'all' | 'waiting' | 'done' = 'all';

  // Derived view-models for the new widgets — populated alongside fetchSummary.
  ipdRoundItems: PatientListItem[] = [];
  otTodayItems: PatientListItem[] = [];
  diagnosisSlices: DonutSlice[] = [];
  adherenceSlices: DonutSlice[] = [];
  adherenceCenterLabel = '—';
  adherenceCenterSub = '';

  // Performance strip
  patientMixSlices: DonutSlice[] = [];
  // Demographics card
  genderSlices: DonutSlice[] = [];
  ageBandMax = 0;
  // Heatmap
  hourCells: Array<{ hour: number; count: number; intensity: number; label: string }> = [];
  // Clinical activity
  topMedicationsItems: BarListItem[] = [];
  topInvestigationsItems: BarListItem[] = [];

  // Specialty-aware view-models
  preOpPipelineItems: PatientListItem[] = [];
  cardiacTestsItems: BarListItem[] = [];
  antenatalItems: PatientListItem[] = [];
  erBoardItems: PatientListItem[] = [];

  // New round-2 metrics
  myIpdLosItems: BarListItem[] = [];

  private userId: number | null = null;
  private chartInstance: echarts.ECharts | null = null;
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

    const stored = localStorage.getItem('userid');
    this.userId = stored ? parseInt(stored, 10) : null;
    this.todayLabel = this.formatLongDate(new Date());
    this.greeting = this.getGreeting();

    if (!this.userId || Number.isNaN(this.userId)) {
      this.errorMsg = 'Cannot identify the logged-in doctor. Please sign in again.';
      this.isLoading = false;
      return;
    }

    this.fetchSummary();

    // Refresh every 60s.
    this.refreshSub = interval(60_000).subscribe(() => this.fetchSummary(true));
  }

  ngAfterViewInit(): void {
    // Chart container is rendered inside *ngIf — the real init lives in
    // renderChart() called after fetchSummary clears isLoading.
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.chartInstance?.dispose();
    this.chartInstance = null;
  }

  refresh(): void {
    this.fetchSummary();
  }

  setQueueFilter(filter: 'all' | 'waiting' | 'done'): void {
    this.queueFilter = filter;
    this.applyQueueFilter();
  }

  trackQueueRow = (_: number, row: DoctorQueueRow): number => row.id;

  /** Click handler for the IPD round list — open the progress note page. */
  openIpdItem(item: PatientListItem): void {
    if (item.link) {
      this.router.navigateByUrl(item.link);
    }
  }

  /** Click handler for the OT board today — open the schedule detail page. */
  openOtItem(item: PatientListItem): void {
    if (item.link) {
      this.router.navigateByUrl(item.link);
    }
  }

  /** Generic click handler used by pre-op pipeline, antenatal, ER board lists. */
  openItem(item: PatientListItem): void {
    if (item.link) {
      this.router.navigateByUrl(item.link);
    }
  }

  /** Click handler for an alert row — follow link if present. */
  openAlert(alert: DashboardAlert): void {
    if (alert.link) {
      this.router.navigateByUrl(alert.link);
    }
  }

  /** Friendly status string for the queue row badge. */
  statusLabel(row: DoctorQueueRow): string {
    if (row.endConsultation) return 'Consulted';
    if (row.checkedIn) return 'Waiting';
    if (row.status === 'cancelled') return 'Cancelled';
    if (row.status === 'completed') return 'Completed';
    if (row.status === 'confirmed') return 'Confirmed';
    return 'Scheduled';
  }

  statusClass(row: DoctorQueueRow): string {
    if (row.endConsultation) return 'status status-done';
    if (row.checkedIn) return 'status status-waiting';
    if (row.status === 'cancelled') return 'status status-cancelled';
    return 'status status-scheduled';
  }

  /** Color-coded wait pill: green <15m, amber 15-30m, red >30m. */
  waitClass(mins: number | null): string {
    if (mins === null) return '';
    if (mins > 30) return 'wait-pill wait-red';
    if (mins >= 15) return 'wait-pill wait-amber';
    return 'wait-pill wait-green';
  }

  /** Render BP/Pulse/SpO2 if at least one is present, else empty. */
  vitalsSummary(row: DoctorQueueRow): string {
    const parts: string[] = [];
    if (row.BPs && row.BPd) parts.push(`BP ${row.BPs}/${row.BPd}`);
    if (row.pulse) parts.push(`HR ${row.pulse}`);
    if (row.spo2) parts.push(`SpO₂ ${row.spo2}`);
    return parts.join(' · ');
  }

  // ─── Internals ────────────────────────────────────────────────────────

  private fetchSummary(silent = false): void {
    if (!this.userId) return;
    if (!silent) this.isLoading = true;
    this.errorMsg = '';

    this.dashboardService.getDoctorSummary(this.userId).subscribe({
      next: (data) => {
        this.summary = data;
        this.applyQueueFilter();
        this.ipdRoundItems = this.mapIpdRound(data.ipdRound || []);
        this.otTodayItems = this.mapOtToday(data.otToday || []);
        this.diagnosisSlices = (data.diagnosisMix || []).map((d) => ({
          name: d.label,
          value: d.count,
        }));
        this.buildAdherenceSlices(data);
        this.buildPatientMixSlices(data);
        this.buildDemographics(data);
        this.buildHeatmap(data);
        this.topMedicationsItems = this.mapMedications(data.topMedications || []);
        this.topInvestigationsItems = this.mapInvestigations(data.topInvestigations || []);
        this.preOpPipelineItems = this.mapPreOp(data.preOpPipeline || []);
        this.cardiacTestsItems = this.mapCardiacTests(data.cardiacTests30d || []);
        this.antenatalItems = this.mapAntenatal(data.antenatalPatients || []);
        this.erBoardItems = this.mapErBoard(data.erActiveBoard || []);
        this.myIpdLosItems = (data.myIpdLos || []).map((r) => ({
          label: `PRN ${r.prn}`,
          count: r.dayOfStay,
        }));
        this.isLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.renderChart(), 0);
      },
      error: (err) => {
        console.error('[DoctorDashboard] summary fetch failed:', err);
        this.errorMsg =
          err?.error?.error ||
          'Unable to load the dashboard right now. Please try again.';
        this.isLoading = false;
      },
    });
  }

  private applyQueueFilter(): void {
    if (!this.summary) {
      this.filteredQueue = [];
      return;
    }
    const all = this.summary.queue;
    if (this.queueFilter === 'waiting') {
      this.filteredQueue = all.filter((r) => r.checkedIn && !r.endConsultation);
    } else if (this.queueFilter === 'done') {
      this.filteredQueue = all.filter((r) => r.endConsultation);
    } else {
      this.filteredQueue = all;
    }
  }

  private mapIpdRound(rows: IpdRoundRow[]): PatientListItem[] {
    return rows.map((r) => {
      const chips: PatientListItem['chips'] = [];
      if (r.lastVitals) {
        const lv = r.lastVitals;
        if (lv.bp) chips.push({ label: `BP ${lv.bp}`, tone: 'default' });
        if (lv.pulse !== null) chips.push({ label: `HR ${lv.pulse}`, tone: 'default' });
        if (lv.spo2 !== null) {
          chips.push({
            label: `SpO₂ ${lv.spo2}`,
            tone: lv.spo2 < 92 ? 'danger' : 'default',
          });
        }
        if (lv.temperatureC !== null && lv.temperatureC >= 38) {
          chips.push({ label: `${lv.temperatureC}°C`, tone: 'warning' });
        }
      } else {
        chips.push({ label: 'No vitals yet', tone: 'warning' });
      }
      if (r.pendingOrders > 0) {
        chips.push({
          label: `${r.pendingOrders} pending order${r.pendingOrders === 1 ? '' : 's'}`,
          tone: 'warning',
        });
      }
      const flags: PatientListItem['flags'] = [];
      if (r.icu) {
        flags.push({ icon: 'pi pi-bolt', label: 'ICU', tone: 'danger' });
      }
      return {
        id: r.admissionId,
        badge: r.bedNumber || '—',
        badgeSub: r.wardName || r.roomType || '',
        badgeTone: r.icu ? 'red' : 'violet',
        primary: r.patientName || `PRN ${r.prn}`,
        metaRight: `Day ${r.dayOfStay}`,
        secondary: r.diagnosisShort,
        chips,
        flags,
        link: `/ipd/admission/${r.admissionId}/progress-note`,
      };
    });
  }

  private mapOtToday(rows: OtTodayRow[]): PatientListItem[] {
    return rows.map((r) => {
      const time = this.formatTime(r.plannedStart);
      const urgencyTone =
        r.urgency === 'emergency' ? 'danger' :
        r.urgency === 'urgent' ? 'warning' : 'default';
      const statusTone =
        r.status === 'IN_PROGRESS' ? 'warning' :
        r.status === 'CLOSED' ? 'success' :
        r.status === 'CANCELLED' ? 'danger' : 'default';
      const chips: PatientListItem['chips'] = [
        { label: r.urgency, tone: urgencyTone },
        { label: r.status, tone: statusTone },
      ];
      const flags: PatientListItem['flags'] = [];
      if (r.urgency === 'emergency') {
        flags.push({ icon: 'pi pi-exclamation-circle', label: 'Emergency', tone: 'danger' });
      }
      return {
        id: r.scheduleId,
        badge: time,
        badgeSub: r.roomName || '',
        badgeTone: r.urgency === 'emergency' ? 'red' : 'amber',
        primary: r.patientName || `PRN ${r.prn || '—'}`,
        metaRight: '',
        secondary: r.procedureName,
        chips,
        flags,
        link: `/surgery-ot/${r.scheduleId}`,
      };
    });
  }

  private buildPatientMixSlices(data: DoctorDashboardSummary): void {
    const m = data.performance?.patientMix;
    if (!m || (m.newCount + m.followupCount + m.referralCount) === 0) {
      this.patientMixSlices = [{ name: 'No data', value: 1, color: '#e2e8f0' }];
      return;
    }
    this.patientMixSlices = [
      { name: 'New', value: m.newCount, color: '#3b82f6' },
      { name: 'Follow-up', value: m.followupCount, color: '#10b981' },
      { name: 'Referral', value: m.referralCount, color: '#f59e0b' },
    ].filter((s) => s.value > 0);
  }

  private buildDemographics(data: DoctorDashboardSummary): void {
    const palette: Record<string, string> = {
      Male: '#3b82f6',
      Female: '#ec4899',
      Other: '#8b5cf6',
      Unknown: '#94a3b8',
    };
    this.genderSlices = (data.demographics?.gender || []).map((g) => ({
      name: g.name,
      value: g.value,
      color: palette[g.name] || '#64748b',
    }));
    // PEDIATRICS specialty replaces the default age bands with finer
    // pediatric buckets when the server provides them.
    const bands = data.pediatricAgeBands ?? data.demographics?.ageBands ?? [];
    this.ageBandMax = bands.length > 0 ? Math.max(...bands.map((b) => b.count), 1) : 1;
  }

  /** Bands to render in the demographics card — pediatric override when present. */
  ageBandsForRender(): Array<{ band: string; count: number }> {
    if (!this.summary) return [];
    return this.summary.pediatricAgeBands ?? this.summary.demographics?.ageBands ?? [];
  }

  private buildHeatmap(data: DoctorDashboardSummary): void {
    const buckets = data.hourHeatmap || [];
    const max = buckets.length > 0 ? Math.max(...buckets.map((b) => b.count), 1) : 1;
    this.hourCells = buckets.map((b) => {
      const intensity = max > 0 ? b.count / max : 0;
      return {
        hour: b.hour,
        count: b.count,
        intensity,
        label: this.formatHourLabel(b.hour),
      };
    });
  }

  /** Human-readable label for the specialty chip. */
  specialtyLabel(group: string | undefined): string {
    switch (group) {
      case 'SURGICAL': return 'Surgical specialty';
      case 'CARDIAC': return 'Cardiac specialty';
      case 'PEDIATRICS': return 'Pediatric specialty';
      case 'OBGYN': return 'OB-GYN specialty';
      case 'EMERGENCY': return 'Emergency specialty';
      default: return '';
    }
  }

  private mapPreOp(rows: PreOpRow[]): PatientListItem[] {
    return rows.map((r) => {
      const date = new Date(r.plannedStart);
      const day = Number.isNaN(date.getTime()) ? '—' : this.shortDate(this.toYmd(date));
      const time = Number.isNaN(date.getTime()) ? '' : this.formatTime(r.plannedStart);
      const urgencyTone =
        r.urgency === 'emergency' ? 'danger' :
        r.urgency === 'urgent' ? 'warning' : 'default';
      const chips: PatientListItem['chips'] = [
        { label: r.urgency, tone: urgencyTone },
        { label: r.status, tone: 'default' },
      ];
      if (r.daysFromNow === 0) {
        chips.unshift({ label: 'Tomorrow', tone: 'warning' });
      } else if (r.daysFromNow === 1) {
        chips.unshift({ label: 'In 1 day', tone: 'warning' });
      } else if (r.daysFromNow >= 2) {
        chips.unshift({ label: `In ${r.daysFromNow}d`, tone: 'default' });
      }
      return {
        id: r.scheduleId,
        badge: day,
        badgeSub: time,
        badgeTone: r.urgency === 'emergency' ? 'red' : 'amber',
        primary: r.patientName || `PRN ${r.prn || '—'}`,
        metaRight: r.roomName,
        secondary: r.procedureName,
        chips,
        link: `/surgery-ot/${r.scheduleId}`,
      };
    });
  }

  private mapCardiacTests(rows: CardiacTest[]): BarListItem[] {
    return rows.map((r) => ({ label: r.name, count: r.count }));
  }

  private mapAntenatal(rows: AntenatalRow[]): PatientListItem[] {
    return rows.map((r) => {
      const chips: PatientListItem['chips'] = [];
      if (r.pregnancyWeeks !== null && r.pregnancyWeeks !== undefined) {
        const tone: 'default' | 'warning' | 'danger' | 'success' =
          r.pregnancyWeeks >= 37 ? 'warning' :
          r.pregnancyWeeks >= 28 ? 'default' : 'success';
        chips.push({ label: `${r.pregnancyWeeks} weeks`, tone });
      }
      if (r.isLactating) {
        chips.push({ label: 'Lactating', tone: 'default' });
      }
      const flags: PatientListItem['flags'] = [];
      if (r.pregnancyWeeks !== null && r.pregnancyWeeks !== undefined && r.pregnancyWeeks >= 37) {
        flags.push({ icon: 'pi pi-bell', label: 'Term', tone: 'warning' });
      }
      return {
        id: r.admissionId,
        badge: r.bedNumber || '—',
        badgeSub: r.wardName || '',
        badgeTone: 'violet',
        primary: r.patientName || `PRN ${r.prn}`,
        metaRight: `Day ${r.dayOfStay}`,
        secondary: r.isLactating && r.pregnancyWeeks === null
          ? 'Postnatal — lactating'
          : (r.pregnancyWeeks !== null ? 'Antenatal' : ''),
        chips,
        flags,
        link: `/ipd/admission/${r.admissionId}/progress-note`,
      };
    });
  }

  private mapErBoard(rows: ErBoardRow[]): PatientListItem[] {
    return rows.map((r) => {
      const triageTone: 'red' | 'amber' | 'slate' =
        r.triageCategory === 'red' ? 'red' :
        r.triageCategory === 'yellow' ? 'amber' : 'slate';
      const chips: PatientListItem['chips'] = [
        { label: r.status, tone: 'default' },
      ];
      if (r.vitalsBP) chips.push({ label: `BP ${r.vitalsBP}`, tone: 'default' });
      if (r.vitalsHR !== null) chips.push({ label: `HR ${r.vitalsHR}`, tone: 'default' });
      if (r.vitalsSpO2 !== null) {
        chips.push({
          label: `SpO₂ ${r.vitalsSpO2}`,
          tone: r.vitalsSpO2 < 92 ? 'danger' : 'default',
        });
      }
      const ageGenderParts: string[] = [];
      if (r.age !== null) ageGenderParts.push(`${r.age}y`);
      if (r.gender) ageGenderParts.push(r.gender);
      return {
        id: String(r.id),
        badge: r.triageCategory.toUpperCase().slice(0, 3),
        badgeSub: `${r.ageMinutes}m ago`,
        badgeTone: triageTone,
        primary: r.patientName,
        metaRight: ageGenderParts.join(' / '),
        secondary: r.presentingComplaint,
        chips,
        link: `/emergency/${r.id}`,
      };
    });
  }

  /** "2026-05-15" YMD string for shortDate(). */
  private toYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private mapMedications(rows: TopMedication[]): BarListItem[] {
    return rows.map((r) => ({
      label: r.genericName,
      count: r.count,
    }));
  }

  private mapInvestigations(rows: TopInvestigation[]): BarListItem[] {
    return rows.map((r) => ({
      label: r.name,
      count: r.count,
      tag: r.type === 'lab' ? 'Lab' : 'Rad',
      tagTone: r.type,
    }));
  }

  /** Cell-style getter for the heatmap — green→amber→red intensity ramp. */
  heatmapCellStyle(intensity: number): { [key: string]: string } {
    if (intensity === 0) return { background: '#f1f5f9', color: '#94a3b8' };
    // Interpolate hue from soft blue → vivid blue based on intensity.
    const opacity = 0.18 + intensity * 0.82;
    return {
      background: `rgba(59, 130, 246, ${opacity.toFixed(2)})`,
      color: intensity > 0.55 ? '#fff' : '#1d4ed8',
    };
  }

  private formatHourLabel(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  }

  /** Decide trend arrow for "today vs 7d avg" comparisons. */
  trendFor(today: number | null, weekly: number[]): 'up' | 'down' | 'flat' | undefined {
    if (today === null || weekly.length === 0) return undefined;
    const sum = weekly.reduce((s, n) => s + n, 0);
    if (sum === 0) return undefined;
    const avg = sum / weekly.length;
    if (today > avg * 1.1) return 'up';
    if (today < avg * 0.9) return 'down';
    return 'flat';
  }

  /** Trend tone for "lower is better" metrics (wait time, no-show rate). */
  inverseTrendFor(today: number | null, weekly: number[]): 'up' | 'down' | 'flat' | undefined {
    const t = this.trendFor(today, weekly);
    if (t === 'up') return 'down';
    if (t === 'down') return 'up';
    return t;
  }

  private buildAdherenceSlices(data: DoctorDashboardSummary): void {
    const a = data.followUpAdherence;
    if (!a || a.scheduled === 0 || a.percent === null) {
      this.adherenceSlices = [
        { name: 'No data', value: 1, color: '#e2e8f0' },
      ];
      this.adherenceCenterLabel = '—';
      this.adherenceCenterSub = 'No follow-ups';
      return;
    }
    const missed = a.scheduled - a.returned;
    this.adherenceSlices = [
      { name: 'Returned', value: a.returned, color: '#10b981' },
      { name: 'Missed', value: missed, color: '#fecaca' },
    ];
    this.adherenceCenterLabel = `${a.percent}%`;
    this.adherenceCenterSub = `${a.returned} of ${a.scheduled}`;
  }

  private renderChart(): void {
    if (!this.isBrowser || !this.summary) return;
    const el = this.trendChartEl?.nativeElement;
    if (!el) return;

    if (this.chartInstance) {
      this.chartInstance.dispose();
      this.chartInstance = null;
    }
    this.chartInstance = echarts.init(el);

    const xLabels = this.summary.last30Days.map((d) => this.shortDate(d.date));
    const values = this.summary.last30Days.map((d) => d.count);

    this.chartInstance.setOption({
      grid: { left: 36, right: 16, top: 24, bottom: 36 },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const idx = p.dataIndex as number;
          const raw = this.summary?.last30Days[idx];
          return raw ? `${raw.date}<br/><b>${raw.count}</b> patient${raw.count === 1 ? '' : 's'}` : '';
        },
      },
      xAxis: {
        type: 'category',
        data: xLabels,
        boundaryGap: false,
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
          name: 'Patients seen',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          data: values,
          lineStyle: { color: '#3b82f6', width: 2 },
          itemStyle: { color: '#3b82f6' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.30)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
            ]),
          },
        },
      ],
    });
  }

  private formatTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    let h = d.getHours();
    const m = d.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')} ${period}`;
  }

  private shortDate(ymd: string): string {
    const parts = ymd.split('-');
    if (parts.length !== 3) return ymd;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = Number(parts[1]);
    return `${Number(parts[2])} ${months[m - 1] || ''}`.trim();
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
