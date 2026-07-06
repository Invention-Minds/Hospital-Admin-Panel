import { Component, Input } from '@angular/core';

export interface BarListItem {
  label: string;
  count: number;
  /** Optional small chip rendered to the right of the label — e.g. "Lab" or "Rad". */
  tag?: string;
  tagTone?: 'lab' | 'radiology' | 'default';
}

/**
 * Ranked horizontal-bar list. The bar fill is proportional to the max count
 * in the list, so the leader always reads as 100% and downstream rows
 * scale relatively. Used for top medications and top investigations.
 */
@Component({
  selector: 'app-bar-list-card',
  templateUrl: './bar-list-card.component.html',
  styleUrls: ['./bar-list-card.component.css'],
})
export class BarListCardComponent {
  @Input() title = '';
  @Input() subTitle = '';
  @Input() accentIcon?: string;
  @Input() items: BarListItem[] = [];
  @Input() emptyText = 'No data yet.';
  @Input() emptyIcon = 'pi pi-inbox';
  @Input() unitLabel = '';

  get max(): number {
    if (!this.items.length) return 0;
    return Math.max(...this.items.map((i) => i.count));
  }

  pct(item: BarListItem): number {
    if (this.max <= 0) return 0;
    return Math.max(2, Math.round((item.count / this.max) * 100));
  }
}
