import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QRCodeModule } from 'angularx-qrcode';

import { DieteticsService } from '../../services/dietetics.service';

interface Poster { key: string; caption: string; url: string }

/**
 * Printable "Scan to see the menu" QR posters for rooms, wards and the canteen.
 * The QR opens /menu (public, no login, no patient data). A diet poster opens
 * the menu with that diet already selected.
 * Route: /dietetics/menu-poster.
 */
@Component({
  selector: 'app-menu-poster',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, QRCodeModule],
  templateUrl: './menu-poster.component.html',
  styleUrls: ['./menu-poster.component.css'],
})
export class MenuPosterComponent implements OnInit {
  diets: Array<{ id: string; name: string; code: string }> = [];
  general = true;
  selected = new Set<string>();
  /** Optional line printed under the QR, e.g. "Ward 3 · Second floor". */
  caption = '';
  private readonly origin: string;
  private cache: { sig: string; list: Poster[] } = { sig: '', list: [] };

  constructor(private svc: DieteticsService, @Inject(PLATFORM_ID) platformId: object) {
    this.origin = isPlatformBrowser(platformId) ? window.location.origin : '';
  }

  ngOnInit(): void {
    // Only diets that actually have a published menu are worth a poster.
    this.svc.getPublicMenu().subscribe({
      next: (m) => (this.diets = m.diets.map((d) => ({ id: d.id, name: d.name, code: d.code }))),
      error: () => {},
    });
  }

  get menuUrl(): string { return `${this.origin}/menu`; }

  toggle(id: string): void { if (this.selected.has(id)) this.selected.delete(id); else this.selected.add(id); }

  /** Stable list for *ngFor — rebuilt only when the choice changes. */
  get posters(): Poster[] {
    const sig = `${this.general}|${[...this.selected].sort().join(',')}|${this.diets.length}|${this.caption}`;
    if (sig === this.cache.sig) return this.cache.list;
    const list: Poster[] = [];
    if (this.general) list.push({ key: 'all', caption: this.caption.trim(), url: this.menuUrl });
    for (const d of this.diets) {
      if (!this.selected.has(d.id)) continue;
      list.push({ key: d.id, caption: [d.name, this.caption.trim()].filter(Boolean).join(' · '), url: `${this.menuUrl}?diet=${encodeURIComponent(d.code)}` });
    }
    this.cache = { sig, list };
    return list;
  }

  print(): void { window.print(); }
}
