import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { DischargeClearanceBoardComponent } from '../discharge-clearance-board/discharge-clearance-board.component';
import { IpdService, IpdAdmission } from '../../services/ipd.service';

/**
 * Phase D — Route wrapper around the clearance board so it's accessible
 * directly at /ipd/admission/:admissionId/discharge-clearance without having
 * to embed the board into the existing admission-detail component first.
 */
@Component({
  selector: 'app-discharge-clearance-page',
  standalone: true,
  imports: [CommonModule, DischargeClearanceBoardComponent],
  template: `
    <div class="page">
      <div class="dcp-head">
        <button class="dcp-back" (click)="back()">← Back</button>
        <div class="dcp-titlewrap">
          <h2 class="dcp-title">
            Discharge —
            <span *ngIf="admission?.admissionNo">Admission {{ admission?.admissionNo }}</span>
            <span class="dcp-muted" *ngIf="!admission?.admissionNo">loading…</span>
          </h2>
          <div class="dcp-meta" *ngIf="admission">
            <span class="dcp-chip">PRN {{ admission.prn }}</span>
            <span class="dcp-chip" *ngIf="admission.department">{{ admission.department }}</span>
            <span class="dcp-chip" *ngIf="admission.ward?.wardName">
              {{ admission.ward?.wardName }}<span *ngIf="admission.bed?.bedNumber"> · Bed {{ admission.bed?.bedNumber }}</span>
            </span>
            <span class="dcp-chip dcp-chip-status dcp-st-{{ admission.status }}">{{ admission.status }}</span>
          </div>
        </div>
      </div>
      <app-discharge-clearance-board
        [admissionId]="admissionId"
        [admissionNo]="admission?.admissionNo || ''">
      </app-discharge-clearance-board>
    </div>
  `,
  styles: [`
    .dcp-head {
      display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px;
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px 16px;
    }
    .dcp-back {
      padding: 7px 14px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff;
      color: #271e4a; cursor: pointer; font-family: Kanit, sans-serif; font-size: 13px; white-space: nowrap;
    }
    .dcp-back:hover { background: #f3f4f6; }
    .dcp-titlewrap { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .dcp-title { font-size: 18px; font-weight: 600; color: #271e4a; margin: 0; }
    .dcp-muted { color: #9ca3af; font-weight: 400; font-size: 14px; }
    .dcp-meta { display: flex; flex-wrap: wrap; gap: 8px; }
    .dcp-chip {
      display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 500;
      background: #eef0ff; color: #4f46e5;
    }
    .dcp-chip-status { text-transform: capitalize; }
    .dcp-st-admitted { background: #dcfce7; color: #166534; }
    .dcp-st-LAMA, .dcp-st-DAMA, .dcp-st-expired { background: #fee2e2; color: #b91c1c; }
    .dcp-st-discharged, .dcp-st-transferred { background: #e5e7eb; color: #4b5563; }
  `],
})
export class DischargeClearancePageComponent implements OnInit {
  admissionId = '';
  admission: IpdAdmission | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ipd: IpdService,
  ) {}

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    // Resolve the human-readable admission context (no, PRN, ward/bed) so the
    // header isn't just the raw DB id.
    if (this.admissionId) {
      this.ipd.getAdmission(this.admissionId).subscribe({
        // Backend wraps the row as { data: admission } despite the service's typing.
        next: (a: any) => { this.admission = a?.data ?? a; },
        error: () => { /* header falls back to "loading…"; the board still works */ },
      });
    }
  }

  back(): void { this.router.navigate(['/ipd', this.admissionId]); }
}
