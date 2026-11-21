import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RunSignal, TrendPoint } from '../../services/quality.service';

interface Dot { x: number; y: number; cls: string; label: string }

/**
 * Small SVG run chart: monthly line, dashed median, signal months coloured
 * (red = concern, green = improvement), and this month so far as a hollow dot.
 * No chart library — renders on the server too. Geometry is built in
 * ngOnChanges, never in getters.
 */
@Component({
  selector: 'app-run-chart',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="rc" [attr.viewBox]="'0 0 ' + W + ' ' + H" role="img" [attr.aria-label]="ariaLabel">
      <line *ngIf="medianY !== null" class="rc-median" [attr.x1]="PAD" [attr.x2]="W - PAD" [attr.y1]="medianY" [attr.y2]="medianY" />
      <path class="rc-line" [attr.d]="path" />
      <path *ngIf="currentPath" class="rc-line rc-line-current" [attr.d]="currentPath" />
      <circle *ngFor="let d of dots" [attr.cx]="d.x" [attr.cy]="d.y" r="3.2" [attr.class]="d.cls"><title>{{ d.label }}</title></circle>
      <circle *ngIf="currentDot as c" [attr.cx]="c.x" [attr.cy]="c.y" r="3.4" class="rc-dot rc-current"><title>{{ c.label }}</title></circle>
    </svg>
    <div class="rc-axis"><span>{{ firstLabel }}</span><span>{{ lastLabel }}</span></div>
  `,
  styles: [`
    :host { display: block; }
    .rc { width: 100%; height: auto; display: block; overflow: visible; }
    .rc-median { stroke: #9ca3af; stroke-width: 1; stroke-dasharray: 4 3; vector-effect: non-scaling-stroke; }
    .rc-line { fill: none; stroke: #0e2970; stroke-width: 1.8; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
    .rc-line-current { stroke-dasharray: 3 3; stroke: #6b7280; }
    .rc-dot { fill: #0e2970; }
    .rc-concern { fill: #dc2626; }
    .rc-improvement { fill: #16a34a; }
    .rc-neutral { fill: #d97706; }
    .rc-current { fill: #fff; stroke: #6b7280; stroke-width: 1.5; vector-effect: non-scaling-stroke; }
    .rc-axis { display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; margin-top: 2px; }
  `],
})
export class RunChartComponent implements OnChanges {
  @Input() points: TrendPoint[] = [];
  @Input() current: TrendPoint | null = null;
  @Input() median: number | null = null;
  @Input() signals: RunSignal[] = [];
  @Input() unit = '';
  @Input() label = '';

  readonly W = 300;
  readonly H = 76;
  readonly PAD = 6;

  path = '';
  currentPath = '';
  dots: Dot[] = [];
  currentDot: Dot | null = null;
  medianY: number | null = null;
  firstLabel = '';
  lastLabel = '';
  ariaLabel = '';

  ngOnChanges(): void {
    const all = [...this.points, ...(this.current ? [this.current] : [])];
    const vals = all.map((p) => p.value).filter((v): v is number => v !== null);
    if (this.median !== null) vals.push(this.median);
    const lo = vals.length ? Math.min(...vals) : 0;
    const hi = vals.length ? Math.max(...vals) : 1;
    const span = hi - lo || Math.max(1, Math.abs(hi));
    const n = Math.max(all.length - 1, 1);
    const x = (i: number) => this.PAD + (i * (this.W - 2 * this.PAD)) / n;
    const y = (v: number) => this.H - this.PAD - ((v - lo) / span) * (this.H - 2 * this.PAD);

    // Which months fall inside a signal run → colour.
    const months = this.points.map((p) => p.period);
    const tone = new Map<string, string>();
    for (const s of this.signals) {
      const a = months.indexOf(s.from);
      const b = months.indexOf(s.to);
      for (let i = Math.max(a, 0); i <= b && i >= 0; i++) tone.set(months[i], `rc-${s.polarity}`);
    }

    let d = '';
    let pen = false;
    this.dots = [];
    this.points.forEach((p, i) => {
      if (p.value === null) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)} `;
      pen = true;
      this.dots.push({ x: x(i), y: y(p.value), cls: `rc-dot ${tone.get(p.period) ?? ''}`, label: `${this.fmtMonth(p.period)}: ${this.fmt(p.value)} (n=${p.n})` });
    });
    this.path = d.trim();

    this.currentDot = null;
    this.currentPath = '';
    if (this.current && this.current.value !== null) {
      const ci = this.points.length;
      this.currentDot = { x: x(ci), y: y(this.current.value), cls: 'rc-current', label: `${this.fmtMonth(this.current.period)} so far: ${this.fmt(this.current.value)} (n=${this.current.n})` };
      const prev = this.points[this.points.length - 1];
      if (prev && prev.value !== null) this.currentPath = `M${x(ci - 1).toFixed(1)},${y(prev.value).toFixed(1)} L${x(ci).toFixed(1)},${y(this.current.value).toFixed(1)}`;
    }
    this.medianY = this.median === null ? null : y(this.median);
    this.firstLabel = this.points.length ? this.fmtMonth(this.points[0].period) : '';
    this.lastLabel = this.current ? `${this.fmtMonth(this.current.period)} (so far)` : (this.points.length ? this.fmtMonth(this.points[this.points.length - 1].period) : '');
    this.ariaLabel = `${this.label}: run chart`;
  }

  private fmt(v: number): string { return `${v}${this.unit && this.unit !== '' ? ' ' + this.unit : ''}`; }
  private fmtMonth(p: string): string {
    const [yy, mm] = p.split('-').map(Number);
    return new Date(yy, mm - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  }
}
