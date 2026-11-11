import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QRCodeModule } from 'angularx-qrcode';

import { QualityUnitService, HospitalUnit } from '../../services/quality-unit.service';

/**
 * Printable "Report a safety incident" QR posters — one for the whole
 * hospital or one per unit (the QR pre-selects the unit on the form).
 * Route: /incidents/report-poster (incident managers).
 */
@Component({
  selector: 'app-incident-report-poster',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, QRCodeModule],
  templateUrl: './incident-report-poster.component.html',
  styleUrls: ['./incident-report-poster.component.css'],
})
export class IncidentReportPosterComponent implements OnInit {
  units: HospitalUnit[] = [];
  /** null = general poster; otherwise unit ids to print (one poster each). */
  selected = new Set<number>();
  general = true;
  private readonly origin: string;

  constructor(private unitSvc: QualityUnitService, @Inject(PLATFORM_ID) platformId: object) {
    this.origin = isPlatformBrowser(platformId) ? window.location.origin : '';
  }

  ngOnInit(): void {
    this.unitSvc.list(true).subscribe({ next: (r) => (this.units = r.data ?? []), error: () => {} });
  }

  toggle(id: number): void { if (this.selected.has(id)) this.selected.delete(id); else this.selected.add(id); }

  get posters(): Array<{ key: string; title: string; url: string }> {
    const out: Array<{ key: string; title: string; url: string }> = [];
    if (this.general) out.push({ key: 'all', title: '', url: `${this.origin}/report-incident` });
    for (const u of this.units) if (this.selected.has(u.id)) out.push({ key: String(u.id), title: u.name, url: `${this.origin}/report-incident?u=${u.id}` });
    return out;
  }
  private postersCache: { sig: string; list: Array<{ key: string; title: string; url: string }> } = { sig: '', list: [] };
  /** Stable list for *ngFor (rebuilt only when the selection changes). */
  get posterList(): Array<{ key: string; title: string; url: string }> {
    const sig = `${this.general}|${[...this.selected].sort().join(',')}|${this.units.length}`;
    if (sig !== this.postersCache.sig) this.postersCache = { sig, list: this.posters };
    return this.postersCache.list;
  }

  print(): void { window.print(); }
}
