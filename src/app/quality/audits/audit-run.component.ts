import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { QualityAuditService, AuditRunDetail, AuditResult, AuditFindingAction } from '../../services/quality-audit.service';
import { SchedulingService, SchedulingStaff } from '../../services/scheduling.service';

type Item = AuditRunDetail['items'][number];

/**
 * One audit. Open → tablet-friendly form (Yes / No / N.A. + remark, autosave
 * on Save, Submit when complete). Completed → score, findings (every "No")
 * with corrective actions, and comparison with the previous / next audit of
 * the same checklist + unit. Route: /quality/audits/runs/:id
 */
@Component({
  selector: 'app-audit-run',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './audit-run.component.html',
  styleUrls: ['./audit-run.component.css'],
})
export class AuditRunComponent implements OnInit, OnDestroy {
  run: AuditRunDetail | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';
  saving = false;
  dirty = false;

  /** itemId → answer draft (conduct mode). */
  answers: Record<number, { result: AuditResult | null; remark: string }> = {};
  notes = '';

  staff: SchedulingStaff[] = [];
  newAction: Record<number, { description: string; ownerId: number | null; dueDate: string }> = {};
  closing: { id: string; status: 'done' | 'dropped'; note: string } | null = null;
  busy = false;

  private destroy$ = new Subject<void>();
  readonly RESULT_LABELS: Record<string, string> = { yes: 'Yes', no: 'No', na: 'N.A.' };
  readonly RESULTS: AuditResult[] = ['yes', 'no', 'na'];

  constructor(private route: ActivatedRoute, private svc: QualityAuditService, private scheduling: SchedulingService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  get conducting(): boolean { return !!this.run?.permissions.canConduct; }
  get completed(): boolean { return this.run?.status === 'completed'; }

  private load(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.loading = true;
    this.svc.run(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.run = r.data;
        this.loading = false;
        const byItem = new Map(r.data.responses.map((x) => [x.itemId, x]));
        this.answers = {};
        for (const it of r.data.items) {
          const a = byItem.get(it.id);
          this.answers[it.id] = { result: a?.result ?? null, remark: a?.remark ?? '' };
        }
        this.notes = r.data.notes ?? '';
        this.buildSections();
        this.findings = r.data.items.filter((i) => this.answers[i.id]?.result === 'no');
        this.dirty = false;
        this.closing = null;
        this.newAction = {};
        for (const f of this.findings) this.newAction[f.id] = { description: '', ownerId: null, dueDate: '' };
        if (r.data.permissions.canManageActions && !this.staff.length) {
          this.scheduling.listStaff().pipe(takeUntil(this.destroy$)).subscribe({ next: (s) => (this.staff = s ?? []), error: () => {} });
        }
      },
      error: (e) => { this.loading = false; this.errorMessage = e?.error?.message || 'Failed to load the audit'; },
    });
  }

  private flash(msg: string): void { this.successMessage = msg; setTimeout(() => (this.successMessage = ''), 3500); }

  /**
   * Items grouped by section, in order. Built once per load — a getter that
   * returns new arrays makes *ngFor recreate every ngModel input on each
   * change-detection pass, which schedules another pass (endless loop).
   */
  sections: Array<{ name: string | null; items: Item[] }> = [];
  private buildSections(): void {
    const out: Array<{ name: string | null; items: Item[] }> = [];
    for (const it of this.run?.items ?? []) {
      const last = out[out.length - 1];
      if (last && last.name === it.section) last.items.push(it);
      else out.push({ name: it.section, items: [it] });
    }
    this.sections = out;
  }
  trackItem = (_: number, it: Item) => it.id;

  get answeredCount(): number { return Object.values(this.answers).filter((a) => a.result).length; }
  get totalCount(): number { return this.run?.items.filter((i) => i.isActive || this.answers[i.id]?.result).length ?? 0; }
  get liveScore(): number | null {
    const vals = Object.values(this.answers).filter((a) => a.result && a.result !== 'na');
    return vals.length ? Math.round((vals.filter((a) => a.result === 'yes').length / vals.length) * 1000) / 10 : null;
  }

  setAnswer(itemId: number, result: AuditResult): void { this.answers[itemId].result = result; this.dirty = true; }

  private payload() {
    return {
      responses: Object.entries(this.answers)
        .filter(([, a]) => a.result)
        .map(([itemId, a]) => ({ itemId: Number(itemId), result: a.result as AuditResult, remark: a.remark.trim() || null })),
      notes: this.notes.trim() || null,
    };
  }

  save(then?: () => void): void {
    if (!this.run || this.saving) return;
    this.saving = true;
    this.errorMessage = '';
    this.svc.saveResponses(this.run.id, this.payload()).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.dirty = false; if (then) then(); else this.flash('Saved.'); },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to save'; },
    });
  }

  submit(): void {
    if (!this.run) return;
    const missing = this.run.items.filter((i) => i.isActive && !this.answers[i.id]?.result).length;
    if (missing) { this.errorMessage = `${missing} question(s) are not answered yet.`; return; }
    const noRemark = Object.values(this.answers).filter((a) => a.result === 'no' && !a.remark.trim()).length;
    if (noRemark) { this.errorMessage = `Add a remark to each "No" answer (${noRemark} missing).`; return; }
    if (!confirm('Submit this audit? Answers can no longer be changed afterwards.')) return;
    const id = this.run.id;
    this.save(() => {
      this.svc.submit(id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.flash(`Submitted — compliance ${r.data.compliancePct ?? '—'}%, ${r.data.ncCount} finding(s).`); this.load(); },
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to submit'; },
      });
    });
  }

  // ── Results ──
  /** Set on load (completed audits are read-only, so it can't change in between). */
  findings: Item[] = [];
  actionsFor(itemId: number): AuditFindingAction[] { return (this.run?.actions ?? []).filter((a) => a.itemId === itemId); }
  remarkFor(itemId: number): string { return this.answers[itemId]?.remark ?? ''; }
  isOverdue(a: AuditFindingAction): boolean { return a.status === 'open' && !!a.dueDate && new Date(a.dueDate).getTime() < Date.now(); }

  private act(obs: ReturnType<QualityAuditService['addAction']>, msg: string): void {
    this.busy = true;
    this.errorMessage = '';
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.busy = false; this.flash(msg); this.load(); },
      error: (e) => { this.busy = false; this.errorMessage = e?.error?.message || 'Failed to update the action'; },
    });
  }

  addAction(itemId: number): void {
    const d = this.newAction[itemId];
    if (!this.run || !d) return;
    if (d.description.trim().length < 3) { this.errorMessage = 'Describe the action (min 3 chars).'; return; }
    this.act(this.svc.addAction(this.run.id, {
      itemId, description: d.description.trim(), ownerId: d.ownerId,
      dueDate: d.dueDate ? new Date(`${d.dueDate}T18:00:00`).toISOString() : null,
    }), 'Action added.');
  }

  startClose(a: AuditFindingAction, status: 'done' | 'dropped'): void { this.closing = { id: a.id, status, note: '' }; }
  confirmClose(): void {
    const c = this.closing;
    if (!this.run || !c) return;
    if (!c.note.trim()) { this.errorMessage = c.status === 'done' ? 'Add a note on what was done.' : 'Add a note on why it is dropped.'; return; }
    this.act(this.svc.updateAction(this.run.id, c.id, { status: c.status, completionNote: c.note.trim() }), c.status === 'done' ? 'Action marked done.' : 'Action dropped.');
  }
  reopen(a: AuditFindingAction): void {
    if (!this.run) return;
    this.act(this.svc.updateAction(this.run.id, a.id, { status: 'open' }), 'Action reopened.');
  }

  effectLabel(it: Item): { text: string; cls: string } | null {
    if (it.nextResult === 'yes') return { text: 'Fixed at next audit', cls: 'ar-ok' };
    if (it.nextResult === 'no') return { text: 'Still non-compliant at next audit', cls: 'ar-bad' };
    if (it.previousResult === 'no') return { text: 'Repeat finding (also NC last audit)', cls: 'ar-bad' };
    return null;
  }
  pctClass(p: number | null | undefined): string { return p == null ? '' : p >= 90 ? 'ar-ok' : p >= 75 ? 'ar-mid' : 'ar-bad'; }
}
