import { Component, OnInit } from '@angular/core';
import * as echarts from 'echarts';
import { ModuleUsageService, ModuleUsageRow, ModuleUsageSummary } from '../../services/module-usage.service';

/**
 * Module Utilization — management analytics page.
 *
 * Shows, per application module (from AppAuditLog), how many active users
 * are using it vs not using it over a date range, with the actual names in
 * an expandable row. Adoption % is against ALL active users (the backend
 * has no per-module entitlement table — access rules live in the sidebar).
 */
@Component({
  selector: 'app-module-utilization',
  templateUrl: './module-utilization.component.html',
  styleUrl: './module-utilization.component.css',
})
export class ModuleUtilizationComponent implements OnInit {
  constructor(private moduleUsage: ModuleUsageService) {}

  isLoading: boolean = true;
  errorMessage: string = '';

  // Filters (YYYY-MM-DD, native date inputs)
  fromDate: string = '';
  toDate: string = '';

  // Data
  summary: ModuleUsageSummary | null = null;
  modules: ModuleUsageRow[] = [];

  // Row expansion — module key currently expanded (one at a time)
  expandedKey: string | null = null;

  private chart: echarts.ECharts | null = null;

  ngOnInit(): void {
    // Default range: last 30 days (inclusive of today)
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 29);
    this.toDate = this.formatDate(to);
    this.fromDate = this.formatDate(from);
    this.loadSummary();
  }

  applyFilter(): void {
    if (this.fromDate && this.toDate && this.fromDate > this.toDate) {
      this.errorMessage = '"From" date must not be after "To" date.';
      return;
    }
    this.errorMessage = '';
    this.loadSummary();
  }

  loadSummary(): void {
    this.isLoading = true;
    this.expandedKey = null;
    this.moduleUsage.getSummary(this.fromDate, this.toDate).subscribe({
      next: (data) => {
        this.summary = data;
        this.modules = data.modules;
        this.isLoading = false;
        setTimeout(() => this.renderChart(), 0);
      },
      error: (error) => {
        console.error('Failed to load module usage summary', error);
        this.errorMessage = 'Failed to load module utilization data. Please try again.';
        this.isLoading = false;
      },
    });
  }

  toggleExpand(key: string): void {
    this.expandedKey = this.expandedKey === key ? null : key;
  }

  adoptionClass(pct: number): string {
    if (pct >= 60) return 'adoption-high';
    if (pct >= 30) return 'adoption-mid';
    return 'adoption-low';
  }

  private renderChart(): void {
    if (typeof window === 'undefined') return; // SSR guard
    const chartDom = document.getElementById('moduleAdoptionChart');
    if (!chartDom) return;

    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
    if (this.modules.length === 0) return;

    // Top-to-bottom by adoption: reverse so highest renders at the top.
    const sorted = [...this.modules]
      .sort((a, b) => a.adoptionPct - b.adoptionPct);

    this.chart = echarts.init(chartDom);
    this.chart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          const row = sorted[p.dataIndex];
          return `${row.label}<br/>Adoption: <b>${row.adoptionPct}%</b><br/>Using: ${row.activeCount} / ${row.eligibleCount}`;
        },
      },
      grid: { left: 8, right: 40, top: 10, bottom: 10, containLabel: true },
      xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      yAxis: {
        type: 'category',
        data: sorted.map((m) => m.label),
        axisLabel: { fontSize: 11 },
      },
      series: [
        {
          type: 'bar',
          data: sorted.map((m) => m.adoptionPct),
          barMaxWidth: 14,
          itemStyle: { color: '#6F46C1', borderRadius: [0, 6, 6, 0] },
          label: { show: true, position: 'right', formatter: '{c}%', fontSize: 10 },
        },
      ],
    });
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
