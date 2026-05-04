import { Component, Input } from '@angular/core';

/**
 * Inline "Synced · HMIS-PREFIX-id" or "Sync pending" indicator for
 * records that flow through an inline-await HMIS push (MLC Sprint 3d,
 * LAMA/DAMA Sprint 3e, future regulatory-paperwork modules).
 *
 * Presentational only. Caller passes the record's `hmisId` field
 * (nullable) and a `prefix` that matches the HMIS id format used by
 * that module.
 *
 *   <app-hmis-sync-indicator
 *     [hmisId]="mlc?.hmisMlcId"
 *     prefix="HMIS-MLC">
 *   </app-hmis-sync-indicator>
 *
 * `size` = `'default'` (detail screens, prominent) or `'small'` (list
 * row badge, narrow column). Visual weight only — copy is identical.
 */
export type HmisSyncIndicatorSize = 'default' | 'small';

@Component({
  selector: 'app-hmis-sync-indicator',
  templateUrl: './hmis-sync-indicator.component.html',
  styleUrls: ['./hmis-sync-indicator.component.css'],
})
export class HmisSyncIndicatorComponent {
  /** HMIS id from the record; null → pending state. */
  @Input() hmisId: string | null = null;

  /** Prefix surfaced before the id, e.g. "HMIS-MLC", "HMIS-LAMA". */
  @Input() prefix = 'HMIS';

  /** Visual weight. `'small'` for list-row badges, `'default'` elsewhere. */
  @Input() size: HmisSyncIndicatorSize = 'default';

  get isSynced(): boolean {
    return !!this.hmisId;
  }

  /**
   * Display id — defensive about two storage conventions:
   *   (a) backend stores the full string (e.g. `hmisMlcId = "HMIS-MLC-999"`),
   *       caller passes `prefix="HMIS-MLC"` — we render the id as-is.
   *   (b) backend stores only the numeric suffix (e.g. `"999"`), caller
   *       passes `prefix="HMIS-LAMA"` — we prepend "HMIS-LAMA-".
   *
   * The check is case-insensitive on the prefix boundary.
   */
  get label(): string {
    if (!this.isSynced) return 'Sync pending';
    const id = this.hmisId ?? '';
    const upperPrefix = this.prefix.toUpperCase();
    const alreadyPrefixed = id.toUpperCase().startsWith(upperPrefix);
    return alreadyPrefixed ? `Synced · ${id}` : `Synced · ${this.prefix}-${id}`;
  }
}
