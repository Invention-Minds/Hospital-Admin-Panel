import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { IncidentService, IncidentTaxonomyCategory, HarmLevel, HARM_OPTIONS } from '../../services/incident.service';

/**
 * Anonymous incident report — public, no login. Opened from the QR poster
 * (/report-incident?u=<unitId>), which pre-selects the area. Nothing that
 * identifies the reporter is collected or stored.
 */
@Component({
  selector: 'app-incident-public-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './incident-public-report.component.html',
  styleUrls: ['./incident-public-report.component.css'],
})
export class IncidentPublicReportComponent implements OnInit {
  taxonomy: IncidentTaxonomyCategory[] = [];
  units: Array<{ id: number; name: string }> = [];
  category = '';
  subCategory: string | null = null;
  reached: 'yes' | 'no' | 'unsure' | null = null;
  harm: HarmLevel | null = null;
  description = '';
  location = '';
  unitId: number | null = null;
  occurredAt = '';
  website = ''; // bot trap — hidden from people
  readonly HARM_OPTIONS = HARM_OPTIONS;
  readonly MIN = 20;

  sending = false;
  errorMessage = '';
  doneCode = '';

  constructor(private route: ActivatedRoute, private svc: IncidentService) {}

  ngOnInit(): void {
    const u = Number(this.route.snapshot.queryParamMap.get('u'));
    this.svc.taxonomy().subscribe({ next: (r) => (this.taxonomy = r.data ?? []), error: () => (this.errorMessage = 'Could not load the form — please refresh.') });
    this.svc.publicUnits().subscribe({
      next: (r) => {
        this.units = r.data ?? [];
        if (u && this.units.some((x) => x.id === u)) this.unitId = u;
      },
      error: () => {},
    });
  }

  get subtypes(): Array<{ key: string; label: string }> {
    return this.taxonomy.find((c) => c.category === this.category)?.subtypes ?? [];
  }
  get unitName(): string { return this.units.find((x) => x.id === this.unitId)?.name ?? ''; }
  pickCategory(c: string): void { this.category = c; this.subCategory = null; }

  private get harmLevel(): HarmLevel | null {
    if (this.reached === 'no') return 'not_reached';
    if (this.reached === 'yes') return this.harm;
    return null; // unsure → Quality triages it
  }

  submit(): void {
    this.errorMessage = '';
    if (!this.category) { this.errorMessage = 'Please choose what kind of incident it was.'; return; }
    if (this.description.trim().length < this.MIN) { this.errorMessage = `Please describe what happened (at least ${this.MIN} characters).`; return; }
    if (this.reached === 'yes' && !this.harm) { this.errorMessage = 'Please choose what harm was caused, or pick "Not sure".'; return; }
    this.sending = true;
    this.svc.publicReport({
      category: this.category, subCategory: this.subCategory, harmLevel: this.harmLevel,
      description: this.description.trim(), location: this.location.trim() || null, unitId: this.unitId,
      occurredAt: this.occurredAt ? new Date(this.occurredAt).toISOString() : null, website: this.website,
    }).subscribe({
      next: (r) => { this.sending = false; this.doneCode = r.data.code; },
      error: (e) => { this.sending = false; this.errorMessage = e?.error?.message || 'Could not send the report — please try again.'; },
    });
  }

  another(): void {
    this.doneCode = '';
    this.category = ''; this.subCategory = null; this.reached = null; this.harm = null;
    this.description = ''; this.location = ''; this.occurredAt = '';
  }
}
