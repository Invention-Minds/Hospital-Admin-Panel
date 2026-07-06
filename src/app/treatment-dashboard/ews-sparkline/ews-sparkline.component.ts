import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Phase 9.13 — tiny inline SVG sparkline for the EWS trend.
 *
 * Pure SVG, no charting dependency — renders reliably inside the watchboard
 * rows and the patient drawer. Pass an array of numeric scores (oldest →
 * newest); the last point is emphasised.
 */
@Component({
  selector: 'app-ews-sparkline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg *ngIf="points.length > 1" [attr.viewBox]="'0 0 ' + w + ' ' + h"
         [attr.width]="w" [attr.height]="h" class="spark">
      <polyline [attr.points]="linePoints" fill="none" [attr.stroke]="stroke" stroke-width="2"
                stroke-linejoin="round" stroke-linecap="round" />
      <circle [attr.cx]="lastX" [attr.cy]="lastY" r="3" [attr.fill]="stroke" />
    </svg>
    <span *ngIf="points.length <= 1" class="spark-empty">—</span>
  `,
  styles: [`
    .spark { display: block; }
    .spark-empty { color: #b4b6ba; font-size: 12px; }
  `],
})
export class EwsSparklineComponent implements OnChanges {
  @Input() points: number[] = [];
  @Input() w = 90;
  @Input() h = 28;
  /** Drives the colour — pass the latest band. */
  @Input() band: string | null = 'low';

  linePoints = '';
  lastX = 0;
  lastY = 0;
  stroke = '#16a34a';

  ngOnChanges(): void {
    const bandColor: Record<string, string> = {
      high: '#dc2626', medium: '#ea580c', 'low-medium': '#d97706', low: '#16a34a',
    };
    this.stroke = bandColor[this.band ?? 'low'] ?? '#16a34a';

    if (this.points.length < 2) { this.linePoints = ''; return; }
    const max = Math.max(...this.points, 1);
    const min = Math.min(...this.points, 0);
    const range = max - min || 1;
    const pad = 4;
    const n = this.points.length;
    const coords = this.points.map((v, i) => {
      const x = pad + (i / (n - 1)) * (this.w - 2 * pad);
      const y = this.h - pad - ((v - min) / range) * (this.h - 2 * pad);
      return { x, y };
    });
    this.linePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    this.lastX = coords[coords.length - 1].x;
    this.lastY = coords[coords.length - 1].y;
  }
}
