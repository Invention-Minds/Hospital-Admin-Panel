import { Component, Input } from '@angular/core';

/**
 * Page header for admission-scoped screens (Sprint 3a-2, 3b, 3c, 3d+).
 *
 * Composes the navy-2xl title + muted-subheading pattern from
 * docs/ui-patterns.md §5c. The subheading assembles optional patient
 * context: patient name (accent-color), PRN, and admission id — whichever
 * inputs are supplied.
 *
 * Example:
 *   <app-page-header
 *     title="Pharmacy Review"
 *     subtitle="MOM.1 — active + carryover"
 *     [patientName]="patient?.name"
 *     [patientPrn]="patient?.prn"
 *     [admissionId]="admissionId">
 *   </app-page-header>
 *
 * Pure presentation: no service injection, no HTTP.
 */
@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.css'],
})
export class PageHeaderComponent {
  /** Main heading text (h1). Required. */
  @Input() title = '';

  /** Optional supporting line shown before the patient context. */
  @Input() subtitle: string | null = null;

  /** Patient display name, e.g. "Ravi Kumar". */
  @Input() patientName: string | null = null;

  /** Patient registration number. */
  @Input() patientPrn: number | string | null = null;

  /** Admission id (uuid) — rendered muted. */
  @Input() admissionId: string | null = null;
}
