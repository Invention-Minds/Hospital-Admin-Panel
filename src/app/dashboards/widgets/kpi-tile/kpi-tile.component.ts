import { Component, Input } from '@angular/core';

/**
 * Reusable KPI tile for the designation-scoped dashboards.
 *
 * Single tile = icon + value + label + optional sub-metric + accent color.
 * Designed to be dense and scannable; six fit comfortably across a 12-col
 * grid on desktop and collapse to two-up on small screens.
 */
@Component({
  selector: 'app-kpi-tile',
  templateUrl: './kpi-tile.component.html',
  styleUrls: ['./kpi-tile.component.css'],
})
export class KpiTileComponent {
  @Input() icon = 'pi pi-chart-bar';
  @Input() label = '';
  @Input() value: string | number = 0;
  @Input() subLabel?: string;
  @Input() subValue?: string | number;
  @Input() accent: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'slate' = 'blue';
  @Input() tooltip?: string;
}
