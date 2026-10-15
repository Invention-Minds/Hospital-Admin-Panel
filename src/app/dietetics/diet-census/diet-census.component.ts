import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  DieteticsService,
  CensusPrefill,
  CensusLineDraft,
  CensusSummary,
  CensusDetail,
  DietMaster,
  localDateString,
  toDateTimeLocal,
  fromDateTimeLocal,
} from '../../services/dietetics.service';
import { SignatureCreateResponse } from '../../services/signature.service';

/** A census line being edited, plus what it looked like when pre-filled. */
type CensusRow = CensusLineDraft & {
  npoFromLocal: string;
  orig: { dietText: string; dietMasterId: string | null; npo: boolean; npoFromLocal: string; feedText: string; disposablePlate: boolean };
};

/**
 * Nursing daily census → Dietary — `/dietetics/census`.
 *
 *   Nurse ("Send census"): pick the ward → list pre-filled from the IP list and
 *   current diets → mark NPO (with time), RT feed, disposable plate, remarks,
 *   diet for new patients → sign and send.
 *   Dietary ("Inbox"): opening a census marks it RECEIVED; the differences vs
 *   the current diets are listed; ACKNOWLEDGE applies NPO holds and interim
 *   diets for new patients and updates the kitchen.
 */
@Component({
  selector: 'app-diet-census',
  templateUrl: './diet-census.component.html',
  styleUrls: ['../dietetics-shared.css', './diet-census.component.css'],
})
export class DietCensusComponent implements OnInit, OnDestroy {
  tab: 'send' | 'inbox' = 'send';

  // Send (nurse).
  wards: Array<{ id: string; wardName: string }> = [];
  wardId = '';
  prefill: CensusPrefill | null = null;
  lines: CensusRow[] = [];
  /** Nurse view: only the patients she has marked. */
  onlyMarked = false;
  /** Inbox detail: expand the "no change" group. */
  showUnchanged = false;
  diets: DietMaster[] = [];
  notes = '';
  signing = false;
  myHistory: CensusSummary[] = [];

  // Inbox (dietary).
  inboxDate = localDateString();
  inbox: CensusSummary[] = [];
  detail: CensusDetail | null = null;
  applyNpo = true;
  createInterim = true;
  acknowledging = false;

  loading = false;
  errorMessage = '';
  successMessage = '';

  readonly role = typeof localStorage !== 'undefined' ? (localStorage.getItem('role') ?? '') : '';
  readonly subAdminType = typeof localStorage !== 'undefined' ? (localStorage.getItem('subAdminType') ?? '') : '';
  readonly username = typeof localStorage !== 'undefined' ? (localStorage.getItem('username') ?? '') : '';

  private destroy$ = new Subject<void>();

  constructor(private svc: DieteticsService) {}

  get isNurse(): boolean {
    return this.role === 'super_admin'
      || ['Nurse', 'Nursing', 'IPD Nurse', 'ICU Nurse', 'Ward Coordinator', 'nurse', 'Nursing Superintendent'].includes(this.subAdminType);
  }
  get isDietary(): boolean {
    return this.role === 'super_admin' || ['Canteen Staff', 'Dietician', 'Diet'].includes(this.subAdminType);
  }

  ngOnInit(): void {
    this.tab = this.isNurse ? 'send' : 'inbox';
    if (this.isNurse) {
      this.svc.listCensusWards().pipe(takeUntil(this.destroy$)).subscribe({
        next: (w) => {
          this.wards = w;
          if (w.length === 1) { this.wardId = w[0].id; this.loadPrefill(); }
        },
        error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load wards'; },
      });
      this.svc.listDiets({ activeOnly: true }).pipe(takeUntil(this.destroy$)).subscribe({
        next: (d) => { this.diets = d; },
        error: () => { /* swallow */ },
      });
    }
    if (this.isDietary) this.loadInbox();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Send (nurse) ───────────────────────────────────────────────────
  loadPrefill(): void {
    if (!this.wardId) return;
    this.loading = true;
    this.errorMessage = '';
    this.svc.getCensusPrefill(this.wardId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (p) => {
        this.prefill = p;
        this.lines = p.lines.map((l) => {
          const npoFromLocal = toDateTimeLocal(l.npoFrom);
          return {
            ...l, npoFromLocal,
            orig: {
              dietText: l.dietText, dietMasterId: l.dietMasterId, npo: l.npo, npoFromLocal,
              feedText: l.feedText, disposablePlate: l.disposablePlate,
            },
          };
        });
        this.onlyMarked = false;
        this.loading = false;
      },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to prepare census'; this.loading = false; },
    });
    this.svc.listCensus({ wardId: this.wardId }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.myHistory = r.slice(0, 10); },
      error: () => { /* swallow */ },
    });
  }

  /** The nurse changed something on this row (vs what was pre-filled). */
  isMarked(l: CensusRow): boolean {
    const o = l.orig;
    return l.dietText !== o.dietText || l.dietMasterId !== o.dietMasterId || l.npo !== o.npo
      || (l.npo && l.npoFromLocal !== o.npoFromLocal) || l.feedText !== o.feedText
      || l.disposablePlate !== o.disposablePlate || !!l.remarks.trim();
  }
  get markedCount(): number { return this.lines.filter((l) => this.isMarked(l)).length; }
  get newCount(): number { return this.lines.filter((l) => l.isNew).length; }
  get npoCount(): number { return this.lines.filter((l) => l.npo).length; }
  get visibleLines(): CensusRow[] {
    return this.onlyMarked ? this.lines.filter((l) => this.isMarked(l) || l.isNew) : this.lines;
  }

  // ─── Inbox detail grouping ──────────────────────────────────────────
  get actionLines(): CensusDetail['lines'] { return this.detail?.lines.filter((l) => l.needsAction) ?? []; }
  get unchangedLines(): CensusDetail['lines'] { return this.detail?.lines.filter((l) => !l.needsAction) ?? []; }

  onDietPick(line: CensusRow): void {
    const d = this.diets.find((x) => x.id === line.dietMasterId);
    if (d && (!line.dietText || line.isNew)) line.dietText = d.code;
  }

  onSigned(sig: SignatureCreateResponse): void {
    if (!this.prefill) return;
    this.svc.submitCensus({
      wardId: this.prefill.wardId,
      censusDate: this.prefill.censusDate,
      notes: this.notes,
      signatureId: sig.id,
      lines: this.lines.map((l) => ({
        admissionId: l.admissionId,
        dietText: l.dietText,
        dietMasterId: l.dietMasterId,
        npo: l.npo,
        npoFrom: l.npo ? fromDateTimeLocal(l.npoFromLocal) : null,
        feedText: l.feedText,
        disposablePlate: l.disposablePlate,
        remarks: l.remarks,
      })),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.signing = false;
        this.successMessage = `Census sent to Dietary (${r.lines} patients) at ${new Date(r.submittedAt).toLocaleTimeString()}.`;
        this.notes = '';
        this.loadPrefill();
      },
      error: (e) => { this.signing = false; this.errorMessage = e?.error?.error || 'Send failed'; },
    });
  }

  // ─── Inbox (dietary) ────────────────────────────────────────────────
  loadInbox(): void {
    this.svc.listCensus({ date: this.inboxDate }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.inbox = r; },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load census inbox'; },
    });
  }

  openCensus(c: CensusSummary): void {
    const show = () => this.svc.getCensus(c.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (d) => { this.detail = d; this.showUnchanged = false; },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to open census'; },
    });
    // Opening it = Dietary has received it (closed-loop step 2).
    if (c.status === 'SUBMITTED') {
      this.svc.receiveCensus(c.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { show(); this.loadInbox(); },
        error: () => show(),
      });
    } else {
      show();
    }
  }

  acknowledge(): void {
    if (!this.detail) return;
    this.acknowledging = true;
    this.svc.acknowledgeCensus(this.detail.id, { applyNpo: this.applyNpo, createInterim: this.createInterim })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.acknowledging = false;
          this.successMessage = `Census acknowledged — ${r.holdsCreated} NPO hold(s) applied, ${r.interimCreated} interim diet(s) created. Kitchen updated.`;
          this.detail = null;
          this.loadInbox();
        },
        error: (e) => { this.acknowledging = false; this.errorMessage = e?.error?.error || 'Acknowledge failed'; },
      });
  }

  statusClass(s: string): string {
    return s === 'ACKNOWLEDGED' ? 'dx-pill-ok' : s === 'RECEIVED' ? 'dx-pill-info' : s === 'REPLACED' ? '' : 'dx-pill-warn';
  }
  statusLabel(s: string): string {
    return s === 'ACKNOWLEDGED' ? 'Acknowledged' : s === 'RECEIVED' ? 'Received'
      : s === 'REPLACED' ? 'Replaced by a newer census' : 'Waiting for Dietary';
  }
}
