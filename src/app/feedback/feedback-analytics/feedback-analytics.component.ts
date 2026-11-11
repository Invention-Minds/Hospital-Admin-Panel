import { Component, ElementRef, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  FeedbackService, FeedbackAnalytics, FeedbackBucket, FeedbackThresholds,
} from '../../services/feedback.service';
import { QualityUnitService, HospitalUnit } from '../../services/quality-unit.service';
import { isQualityEditor } from '../../quality/quality-access';
import { DownloadOtpService } from '../../shared/download-otp/download-otp.service';
import { EChartsTracker } from '../../shared/charts/echarts-tracker';
import { FEEDBACK_STRINGS, FEEDBACK_LANGS } from '../feedback-i18n';

type Dim = 'department' | 'doctor' | 'ward' | 'unit' | 'channel' | 'language' | 'collector' | 'template';

/**
 * Feedback analytics — NPS / satisfaction broken down by department, doctor,
 * ward, unit, channel, language, collecting staff and question; NPS trend;
 * "why did you choose us"; complaint resolution per unit; recent low-score
 * comments. Quality Manager can edit the thresholds.
 * Route: /feedback/analytics (feedback viewers).
 */
@Component({
  selector: 'app-feedback-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './feedback-analytics.component.html',
  styleUrls: ['./feedback-analytics.component.css'],
})
export class FeedbackAnalyticsComponent implements OnInit, OnDestroy {
  @ViewChild('trendChart') set trendEl(el: ElementRef<HTMLDivElement> | undefined) {
    this.trendHost = el?.nativeElement ?? null;
    void this.drawTrend();
  }
  private trendHost: HTMLDivElement | null = null;
  private charts = new EChartsTracker();
  private destroy$ = new Subject<void>();
  private readonly browser: boolean;

  from = '';
  to = '';
  template = 'all';
  unitId: number | '' = '';
  units: HospitalUnit[] = [];

  data: FeedbackAnalytics | null = null;
  loading = false;
  errorMessage = '';
  dim: Dim = 'department';

  readonly canEditConfig = isQualityEditor();
  config: FeedbackThresholds | null = null;
  configDraft: FeedbackThresholds | null = null;
  configSaving = false;
  configMessage = '';

  readonly DIMS: Array<{ key: Dim; label: string }> = [
    { key: 'department', label: 'Department' },
    { key: 'unit', label: 'Unit' },
    { key: 'doctor', label: 'Doctor (OPD / admitting)' },
    { key: 'ward', label: 'Ward' },
    { key: 'channel', label: 'Channel' },
    { key: 'language', label: 'Language' },
    { key: 'collector', label: 'Collected by' },
    { key: 'template', label: 'Survey type' },
  ];
  readonly TEMPLATES = [
    { value: 'all', label: 'All surveys' },
    { value: 'opd-post-visit', label: 'OPD' },
    { value: 'ipd-discharge', label: 'IPD discharge' },
    { value: 'er-discharge', label: 'Emergency' },
    { value: 'day-care', label: 'Day care' },
    { value: 'general', label: 'General / walk-up' },
  ];
  private readonly QUESTION_LABELS: Record<string, string> = { ...FEEDBACK_STRINGS.en.cat, overall: 'Overall' };
  private readonly REASON_LABELS: Record<string, string> = FEEDBACK_STRINGS.en.reason;
  private readonly LANG_LABELS: Record<string, string> = Object.fromEntries(FEEDBACK_LANGS.map((l) => [l.code, l.label]));
  private readonly TEMPLATE_LABELS: Record<string, string> = Object.fromEntries(this.TEMPLATES.map((t) => [t.value, t.label]));

  constructor(
    private svc: FeedbackService, private unitSvc: QualityUnitService, private downloadOtp: DownloadOtpService,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.browser = isPlatformBrowser(platformId);
    const today = new Date();
    const start = new Date(today.getTime() - 29 * 86_400_000);
    this.to = this.ymd(today);
    this.from = this.ymd(start);
  }

  ngOnInit(): void {
    this.load();
    this.unitSvc.list(true).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.units = r.data ?? []; }, error: () => { /* filter is optional */ },
    });
    this.svc.getConfig().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.config = r.data; this.configDraft = { ...r.data }; }, error: () => { /* shown via analytics */ },
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); this.charts.disposeAll(); }

  private ymd(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.analytics({ from: this.from, to: this.to, template: this.template, unitId: this.unitId })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.data = r; this.loading = false; void this.drawTrend(); },
        error: (e) => { this.loading = false; this.errorMessage = e?.error?.message || 'Failed to load feedback analytics'; },
      });
  }

  get rows(): FeedbackBucket[] { return this.data?.breakdowns[this.dim] ?? []; }
  get dimLabel(): string { return this.DIMS.find((x) => x.key === this.dim)?.label ?? ''; }

  rowLabel(b: FeedbackBucket): string {
    const k = b.label ?? b.key;
    if (k === '—') return 'Not recorded'; // e.g. surveys from before visit context was captured
    if (this.dim === 'language') return this.LANG_LABELS[k] ?? k;
    if (this.dim === 'template') return this.TEMPLATE_LABELS[k] ?? k;
    return k;
  }
  questionLabel(k: string): string { return this.QUESTION_LABELS[k] ?? k; }
  reasonLabel(k: string): string { return this.REASON_LABELS[k] ?? k; }
  templateLabel(k: string): string { return this.TEMPLATE_LABELS[k] ?? k; }
  get maxReason(): number { return Math.max(1, ...(this.data?.choiceReasons ?? []).map((r) => r.count)); }

  npsClass(n: number): string { return n >= 50 ? 'fa-good' : n >= 0 ? 'fa-mid' : 'fa-bad'; }
  pctClass(p: number | null): string { return p === null ? '' : p >= 80 ? 'fa-good' : p >= 60 ? 'fa-mid' : 'fa-bad'; }

  private async drawTrend(): Promise<void> {
    if (!this.browser || !this.trendHost || !this.data) return;
    const trend = this.data.trend;
    const chart = await this.charts.init(this.trendHost);
    chart.setOption({
      grid: { left: 44, right: 44, top: 28, bottom: 32 },
      tooltip: { trigger: 'axis' },
      legend: { data: ['NPS', 'Responses'], top: 0 },
      xAxis: { type: 'category', data: trend.map((t) => t.key) },
      yAxis: [
        { type: 'value', name: 'NPS', min: -100, max: 100 },
        { type: 'value', name: 'Responses', minInterval: 1, splitLine: { show: false } },
      ],
      series: [
        { name: 'Responses', type: 'bar', yAxisIndex: 1, data: trend.map((t) => t.responses), itemStyle: { color: '#c7d2fe' } },
        { name: 'NPS', type: 'line', data: trend.map((t) => t.nps), smooth: true, itemStyle: { color: '#1e40af' }, lineStyle: { width: 3 } },
      ],
    }, true);
  }

  saveConfig(): void {
    if (!this.configDraft || this.configSaving) return;
    this.configSaving = true;
    this.configMessage = '';
    this.svc.updateConfig(this.configDraft).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.configSaving = false;
        this.config = r.data;
        this.configDraft = { ...r.data };
        this.configMessage = 'Saved — applies to new survey answers.';
        this.load();
      },
      error: (e) => { this.configSaving = false; this.configMessage = e?.error?.message || 'Failed to save'; },
    });
  }

  async exportCsv(): Promise<void> {
    const d = this.data;
    if (!d) return;
    if (!(await this.downloadOtp.verify('Feedback analytics (CSV)'))) return;
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines: string[] = [];
    const row = (...cells: unknown[]) => lines.push(cells.map(esc).join(','));
    row('Feedback analytics', `${this.from} to ${this.to}`, this.templateLabel(this.template));
    row();
    row('Responses', 'NPS', 'Satisfied %', 'Avg rating', 'Response rate %', 'Surveys created');
    row(d.summary.responses, d.summary.nps, d.summary.satisfiedPct, d.summary.avgRating, d.summary.responseRate, d.summary.surveysCreated);
    for (const dim of this.DIMS) {
      row();
      row(dim.label, 'Responses', 'NPS', 'Promoters', 'Passives', 'Detractors', 'Satisfied %', 'Avg rating');
      const saved = this.dim;
      this.dim = dim.key;
      for (const b of d.breakdowns[dim.key] ?? []) {
        row(this.rowLabel(b), b.responses, b.nps, b.promoters, b.passives, b.detractors, b.satisfiedPct, b.avgRating);
      }
      this.dim = saved;
    }
    row();
    row('Question', 'Answers', 'Average', 'Satisfied %');
    for (const q of d.byQuestion) row(this.questionLabel(q.key), q.count, q.avg, q.satisfiedPct);
    row();
    row('Why patients chose us', 'Count');
    for (const r of d.choiceReasons) row(this.reasonLabel(r.key), r.count);
    row();
    row('Complaints by unit', 'Raised', 'Resolved', 'Resolution %', 'Avg hours to resolve');
    for (const c of d.complaintsByUnit) row(c.label, c.total, c.resolved, c.resolutionRate, c.avgResolutionHours);
    row();
    row('Complaints by type', 'Raised', 'Resolved', 'On time %', 'Overdue open', 'Avg hours to resolve');
    for (const c of d.complaintsByType ?? []) row(c.label, c.total, c.resolved, c.onTimePct, c.overdueOpen, c.avgResolutionHours);

    const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-analytics-${this.from}-to-${this.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
