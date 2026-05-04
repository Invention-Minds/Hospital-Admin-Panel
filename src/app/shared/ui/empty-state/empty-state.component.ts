import { Component, Input } from '@angular/core';

/**
 * EmptyState — presentation-only placeholder shown when a list/table/card
 * has no data to render.
 *
 * Design-gap decision (#9): icon + primary text + optional secondary text,
 * centered, muted text color, min 48px vertical padding. Default icon is
 * PrimeIcons `pi pi-inbox`. Override via `icon` input for context-specific
 * cues (e.g. `pi pi-exclamation-triangle` when empty-because-error).
 *
 * Intentionally presentation-only: no action slot in v1. When first module
 * needs an "Add first X" CTA, add an `<ng-content>` slot and flag in
 * docs/ui-patterns.md.
 */
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.css'],
})
export class EmptyStateComponent {
  /** Primary headline text. Required. */
  @Input() text = '';

  /** Optional secondary/supporting line below the headline. */
  @Input() secondaryText: string | null = null;

  /**
   * PrimeIcon class (e.g. 'pi pi-inbox', 'pi pi-database',
   * 'pi pi-exclamation-triangle'). Defaults to 'pi pi-inbox' per the
   * design-gap decision for empty tables.
   */
  @Input() icon = 'pi pi-inbox';
}
