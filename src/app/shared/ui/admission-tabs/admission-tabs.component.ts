import { Component, Input } from '@angular/core';

/**
 * Tab bar for admission-scoped screens. Surfaces the four sub-pages of an
 * IPD admission so doctors and nurses can move between them without going
 * back to the admission list:
 *
 *   Progress Note  ·  Pharmacy  ·  MAR  ·  Discharge
 *
 * Drop in just below `<app-page-header>` on each of the four sub-page
 * templates. Pure presentation: no service injection, no HTTP. Active
 * highlighting handled by `routerLinkActive`.
 *
 * Example:
 *   <app-admission-tabs [admissionId]="admissionId"></app-admission-tabs>
 */
@Component({
  selector: 'app-admission-tabs',
  templateUrl: './admission-tabs.component.html',
  styleUrls: ['./admission-tabs.component.css'],
})
export class AdmissionTabsComponent {
  /** Required. The four tabs route under `/ipd/admission/:admissionId/*`. */
  @Input() admissionId = '';
}
