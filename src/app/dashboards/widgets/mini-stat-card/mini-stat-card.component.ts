import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as echarts from 'echarts';

/**
 * Compact KPI card with a tiny inline sparkline. Sits in the performance
 * strip below the main KPI tiles. Sparkline is optional — if no data, the
 * card just renders the metric value alone.
 */
@Component({
  selector: 'app-mini-stat-card',
  templateUrl: './mini-stat-card.component.html',
  styleUrls: ['./mini-stat-card.component.css'],
})
export class MiniStatCardComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('spark', { static: false }) sparkEl?: ElementRef<HTMLDivElement>;

  @Input() label = '';
  @Input() value: string | number = '—';
  @Input() subText?: string;
  @Input() trend?: 'up' | 'down' | 'flat';
  /** Inline sparkline series — typically 7d. */
  @Input() sparkData: number[] = [];
  @Input() accent: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'slate' = 'blue';
  @Input() icon?: string;
  @Input() tooltip?: string;

  private chart: echarts.ECharts | null = null;
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    this.renderSpark();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sparkData']) this.renderSpark();
  }

  ngOnDestroy(): void {
    this.chart?.dispose();
    this.chart = null;
  }

  trendArrow(): string {
    if (this.trend === 'up') return 'pi pi-arrow-up';
    if (this.trend === 'down') return 'pi pi-arrow-down';
    return '';
  }

  private renderSpark(): void {
    if (!this.isBrowser) return;
    if (!this.sparkData || this.sparkData.length === 0) return;
    const el = this.sparkEl?.nativeElement;
    if (!el) return;
    if (!this.chart) this.chart = echarts.init(el);

    const colorMap: Record<string, string> = {
      blue: '#3b82f6',
      green: '#10b981',
      amber: '#f59e0b',
      red: '#ef4444',
      violet: '#8b5cf6',
      slate: '#64748b',
    };
    const stroke = colorMap[this.accent] || '#3b82f6';

    this.chart.setOption(
      {
        grid: { left: 0, right: 0, top: 4, bottom: 4 },
        xAxis: { type: 'category', show: false, data: this.sparkData.map((_, i) => i) },
        yAxis: { type: 'value', show: false, scale: true },
        tooltip: { show: false },
        series: [
          {
            type: 'line',
            data: this.sparkData,
            smooth: true,
            symbol: 'none',
            lineStyle: { width: 1.6, color: stroke },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: this.hexWithAlpha(stroke, 0.28) },
                { offset: 1, color: this.hexWithAlpha(stroke, 0.02) },
              ]),
            },
          },
        ],
      },
      true,
    );
  }

  private hexWithAlpha(hex: string, alpha: number): string {
    // hex like #RRGGBB → rgba()
    const m = hex.match(/^#?([0-9a-f]{6})$/i);
    if (!m) return hex;
    const r = parseInt(m[1].slice(0, 2), 16);
    const g = parseInt(m[1].slice(2, 4), 16);
    const b = parseInt(m[1].slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
