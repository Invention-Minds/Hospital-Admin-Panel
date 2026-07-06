import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { DischargeSummaryService, DischargeContext } from '../../services/discharge-summary.service';

/**
 * Phase 9.17 — Full Discharge Summary (UHJ paper layout, printable).
 *
 * Read-only assembly of the discharge from every module: patient header,
 * diagnosis + condition + advice (discharge row), clinical findings & history
 * (initial assessment), operative notes + surgeon/anaesthetist (OT), and
 * investigations (lab/radiology results). Standalone — route-loaded.
 *
 * Route: /ipd/admission/:admissionId/discharge-summary
 */
@Component({
  selector: 'app-ipd-discharge-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ipd-discharge-summary.component.html',
  styleUrls: ['./ipd-discharge-summary.component.css'],
})
export class IpdDischargeSummaryComponent implements OnInit {
  admissionId = '';
  ctx: DischargeContext | null = null;
  loading = false;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private svc: DischargeSummaryService,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    if (this.admissionId) this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.context(this.admissionId).subscribe({
      next: (r) => { this.ctx = r.data; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.message ?? 'Failed to load discharge summary'; this.loading = false; },
    });
  }

  print(): void { if (typeof window !== 'undefined') window.print(); }
  goBack(): void { this.location.back(); }

  // ─── Derived views over the loose records ──────────────────────────────

  get ia(): Record<string, any> | null { return (this.ctx?.initialAssessment as Record<string, any>) ?? null; }
  get dc(): Record<string, any> | null { return (this.ctx?.discharge as Record<string, any>) ?? null; }

  /** Co-morbidities present in the initial assessment, as readable lines. */
  get comorbidities(): string[] {
    const a = this.ia;
    if (!a) return [];
    const map: Array<[string, string, string]> = [
      ['hasHypertension', 'Hypertension', 'hypertensionSince'],
      ['hasDiabetes', 'Diabetes', 'diabetesSince'],
      ['hasCardiacDisease', 'Cardiac disease', 'cardiacDiseaseSince'],
      ['hasCopd', 'COPD', 'copdSince'],
      ['hasThyroidDisorder', 'Thyroid disorder', 'thyroidDisorderSince'],
      ['hasCva', 'CVA', 'cvaSince'],
    ];
    return map.filter(([flag]) => a[flag]).map(([, label, since]) => a[since] ? `${label} (since ${a[since]})` : label);
  }

  /** Abnormal general-exam findings (the paper's Pallor/Icterus/Cyanosis/Oedema row). */
  get generalExam(): { label: string; present: boolean }[] {
    const a = this.ia;
    return [
      { label: 'Pallor', present: !!a?.['examPallor'] },
      { label: 'Icterus', present: !!a?.['examIcterus'] },
      { label: 'Cyanosis', present: !!a?.['examCyanosis'] },
      { label: 'Oedema', present: !!a?.['examEdema'] },
      { label: 'Clubbing', present: !!a?.['examClubbing'] },
    ];
  }

  /** Systemic exam lines (system: finding / NAD). */
  get systemicExam(): { sys: string; text: string }[] {
    const a = this.ia;
    if (!a) return [];
    const sys: Array<[string, string, string]> = [
      ['CVS', 'cvsNad', 'cvsFindings'],
      ['RS', 'respNad', 'respFindings'],
      ['CNS', 'cnsNad', 'cnsFindings'],
      ['GI / P/A', 'giNad', 'giFindings'],
      ['GU / P/V', 'guNad', 'guFindings'],
    ];
    return sys.map(([label, nad, findings]) => ({
      sys: label,
      text: a[findings] || (a[nad] ? 'NAD' : '—'),
    })).filter((r) => r.text !== '—');
  }

  parseMedications(json: unknown): Array<Record<string, any>> {
    if (!json) return [];
    if (Array.isArray(json)) return json;
    try { const p = JSON.parse(json as string); return Array.isArray(p) ? p : []; } catch { return []; }
  }
}
