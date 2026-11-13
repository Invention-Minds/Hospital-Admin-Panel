import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DieteticsService, DietMaster, NightAckList, NightAckRow } from '../../services/dietetics.service';

interface AckDraft { dietMasterId: string | null; note: string; saving: boolean }

/**
 * Night diet acknowledgement — `/dietetics/night-ack`.
 *
 * The dietitian works 07:00–19:00 (window in Dietetics settings). At night any
 * doctor acknowledges new admissions and ward-reported diet changes here:
 *   • no diet yet  → pick a diet; an interim diet starts and trays follow
 *   • interim diet → confirm it (or change the diet)
 *   • ward change  → acknowledge, optionally change the diet
 * The dietitian sees "Night ack" on the patient next morning and signs the diet.
 */
@Component({
  selector: 'app-diet-night-ack',
  templateUrl: './diet-night-ack.component.html',
  styleUrls: ['../dietetics-shared.css', './diet-night-ack.component.css'],
})
export class DietNightAckComponent implements OnInit, OnDestroy {
  data: NightAckList | null = null;
  diets: DietMaster[] = [];
  drafts = new Map<string, AckDraft>();
  loading = false;
  errorMessage = '';
  successMessage = '';

  readonly role = typeof localStorage !== 'undefined' ? (localStorage.getItem('role') ?? '') : '';
  private destroy$ = new Subject<void>();

  constructor(private svc: DieteticsService) {}

  /** Only doctors (and super admin) can acknowledge. */
  get canAck(): boolean { return this.role === 'doctor' || this.role === 'super_admin'; }

  ngOnInit(): void {
    this.load();
    this.svc.listDiets({ activeOnly: true }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => { this.diets = d.filter((x) => x.isActive); },
      error: () => { /* the list still works without diets */ },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.svc.getNightAck().pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => { this.data = d; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load'; this.loading = false; },
    });
  }

  draft(r: NightAckRow): AckDraft {
    let d = this.drafts.get(r.admissionId);
    if (!d) { d = { dietMasterId: null, note: '', saving: false }; this.drafts.set(r.admissionId, d); }
    return d;
  }

  acknowledge(r: NightAckRow): void {
    const d = this.draft(r);
    this.errorMessage = '';
    this.successMessage = '';
    if (!r.currentDiet && !d.dietMasterId) {
      this.errorMessage = `${r.patientName || r.admissionNo}: no diet yet — pick a diet to start.`;
      return;
    }
    d.saving = true;
    this.svc.acknowledgeNight(r.admissionId, { dietMasterId: d.dietMasterId, note: d.note.trim() || null })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = `Acknowledged ${r.patientName || r.admissionNo} (bed ${r.bedNumber || '—'}). The kitchen has been updated.`;
          this.drafts.delete(r.admissionId);
          this.load();
        },
        error: (e) => { d.saving = false; this.errorMessage = e?.error?.error || 'Acknowledge failed'; },
      });
  }

  trackRow(_: number, r: NightAckRow): string { return r.admissionId; }
}
