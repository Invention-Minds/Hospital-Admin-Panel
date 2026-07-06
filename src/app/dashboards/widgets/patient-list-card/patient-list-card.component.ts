import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface PatientListItem {
  /** Stable id for trackBy + click payload. */
  id: string;
  /** Leading badge — e.g. bed number "B-204" or scheduled time "10:30 AM". */
  badge: string;
  /** Optional secondary tag below the badge — e.g. ward name or OT room. */
  badgeSub?: string;
  /** Primary line — patient name. */
  primary: string;
  /** Right-side meta — e.g. "Day 4 of stay" or "Elective". */
  metaRight?: string;
  /** Inline secondary line — diagnosis snippet or procedure name. */
  secondary?: string;
  /** Per-row stats chips — vitals, pending orders, etc. */
  chips?: Array<{ label: string; tone: 'default' | 'warning' | 'danger' | 'success' }>;
  /** Flags (rendered as icons after the name) — e.g. ICU, MLC, urgent. */
  flags?: Array<{ icon: string; label: string; tone: 'info' | 'warning' | 'danger' }>;
  /** Optional badge tone for the leading block. */
  badgeTone?: 'blue' | 'amber' | 'red' | 'violet' | 'slate';
  /** Optional URL to navigate to on click. */
  link?: string;
}

/**
 * Reusable list of patients with leading badge + actionable rows. Used by
 * the doctor dashboard for the IPD round list and the OT board for today,
 * but designed to fit nurse and ward views too.
 */
@Component({
  selector: 'app-patient-list-card',
  templateUrl: './patient-list-card.component.html',
  styleUrls: ['./patient-list-card.component.css'],
})
export class PatientListCardComponent {
  @Input() title = '';
  @Input() subTitle = '';
  @Input() items: PatientListItem[] = [];
  @Input() emptyText = 'Nothing to show right now.';
  @Input() emptyIcon = 'pi pi-inbox';
  @Input() accentIcon?: string;

  @Output() itemClick = new EventEmitter<PatientListItem>();

  trackItem = (_: number, i: PatientListItem): string => i.id;

  onItemClick(item: PatientListItem): void {
    this.itemClick.emit(item);
  }
}
