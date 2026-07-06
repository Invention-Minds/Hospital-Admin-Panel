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

export interface DonutSlice {
  name: string;
  value: number;
  color?: string;
}

/**
 * Compact echarts donut chart. Used for diagnosis mix and (with a single
 * slice + remainder) the follow-up adherence ring. SSR-safe via the
 * isPlatformBrowser guard.
 */
@Component({
  selector: 'app-donut-chart',
  template: `<div #host class="donut-host"></div>`,
  styles: [
    `
      :host { display: block; width: 100%; height: 100%; }
      .donut-host { width: 100%; height: 100%; min-height: 180px; }
    `,
  ],
})
export class DonutChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLDivElement>;

  @Input() slices: DonutSlice[] = [];
  /** Optional centered label shown inside the ring (e.g. "72%" for adherence). */
  @Input() centerLabel?: string;
  @Input() centerSubLabel?: string;
  @Input() showLegend = true;

  private chart: echarts.ECharts | null = null;
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slices'] || changes['centerLabel'] || changes['centerSubLabel']) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.chart?.dispose();
    this.chart = null;
  }

  private render(): void {
    if (!this.isBrowser) return;
    const el = this.host?.nativeElement;
    if (!el) return;

    if (!this.chart) {
      this.chart = echarts.init(el);
    }

    const palette = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#8b5cf6',
      '#ef4444',
      '#64748b',
      '#0ea5e9',
      '#22c55e',
    ];
    const data = this.slices.map((s, i) => ({
      name: s.name,
      value: s.value,
      itemStyle: { color: s.color || palette[i % palette.length] },
    }));

    const option: echarts.EChartsCoreOption = {
      tooltip: { trigger: 'item' },
      legend: this.showLegend
        ? {
            type: 'scroll',
            bottom: 0,
            left: 'center',
            textStyle: { color: '#475569', fontSize: 11 },
            itemWidth: 10,
            itemHeight: 10,
            icon: 'circle',
          }
        : { show: false },
      graphic: this.centerLabel
        ? [
            {
              type: 'text',
              left: 'center',
              top: '38%',
              style: {
                text: this.centerLabel,
                fontSize: 22,
                fontWeight: 700,
                fill: '#0f172a',
              },
            },
            this.centerSubLabel
              ? {
                  type: 'text',
                  left: 'center',
                  top: '54%',
                  style: {
                    text: this.centerSubLabel,
                    fontSize: 11,
                    fill: '#64748b',
                  },
                }
              : null,
          ].filter(Boolean) as any
        : undefined,
      series: [
        {
          type: 'pie',
          radius: ['58%', '78%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: { show: false },
          labelLine: { show: false },
          data,
        },
      ],
    };

    this.chart.setOption(option, true);
  }
}
