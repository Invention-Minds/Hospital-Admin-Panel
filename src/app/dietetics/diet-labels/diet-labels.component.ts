import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  DieteticsService,
  LabelSheet,
  MealTimeSlot,
  localDateString,
} from '../../services/dietetics.service';
import { DownloadOtpService } from '../../shared/download-otp/download-otp.service';
import { currentDownloadRef } from '../../shared/download-otp/download-stamp';

/** Smallest text a sticker may shrink to (points). */
const MIN_PT = 5.5;
const PAGE_STYLE_ID = 'dl-page-style';

/**
 * Diet labels — `/dietetics/labels`. Replaces the hand-written stickers:
 * one label per tray (and per extra-food order) for the chosen meal, with
 * bed, patient name, PRN, diet code, food allergy / avoid, the dishes and a QR
 * code for bedside identification.
 *
 * Sticker size and labels per row come from Setup → Sheet & labels:
 *   • 1 per row  → label-printer roll: the printed page IS one sticker
 *   • 2+ per row → A4 sticker sheet
 * Each sticker's text starts as large as its height allows and shrinks only as
 * far as needed for its own content (lunch with 4 dishes vs. a juice), so
 * nothing is cut off and short labels stay big.
 */
@Component({
  selector: 'app-diet-labels',
  templateUrl: './diet-labels.component.html',
  styleUrls: ['../dietetics-shared.css', './diet-labels.component.css'],
})
export class DietLabelsComponent implements OnInit, OnDestroy {
  date = localDateString();
  slotId = '';
  wardId = '';
  slots: MealTimeSlot[] = [];
  wards: Array<{ id: string; wardName: string }> = [];
  sheet: LabelSheet | null = null;
  loading = false;
  errorMessage = '';
  /** Stickers whose content only fits at the smallest text size. */
  tightCount = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private svc: DieteticsService,
    private downloadOtp: DownloadOtpService,
    private host: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.svc.listMealTimeSlots().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.slots = r.filter((s) => s.isActive);
        // Default to the next meal that hasn't ended yet.
        const now = new Date();
        const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const next = this.slots.find((s) => s.endTime > hhmm) ?? this.slots[0];
        if (next) { this.slotId = next.id; this.load(); }
      },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load meal times'; },
    });
    this.svc.listCensusWards().pipe(takeUntil(this.destroy$)).subscribe({
      next: (w) => { this.wards = w; },
      error: () => { /* swallow */ },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.getElementById(PAGE_STYLE_ID)?.remove();
  }

  load(): void {
    if (!this.slotId) return;
    this.loading = true;
    this.errorMessage = '';
    this.svc.getLabels({ date: this.date, mealTimeSlotId: this.slotId, wardId: this.wardId || undefined })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (s) => {
          this.sheet = s;
          this.loading = false;
          this.setPageStyle();
          // After Angular has drawn the stickers, and again once the QR
          // images have rendered (they draw asynchronously).
          setTimeout(() => this.fitLabels());
          setTimeout(() => this.fitLabels(), 400);
        },
        error: (e) => { this.errorMessage = e?.error?.error || 'Failed to build labels'; this.loading = false; },
      });
  }

  /** One sticker per row = label-printer roll. */
  get isRoll(): boolean { return (this.sheet?.layout.columns ?? 1) <= 1; }

  get gridStyle(): Record<string, string> {
    const l = this.sheet?.layout;
    if (!l) return {};
    return {
      'grid-template-columns': `repeat(${Math.max(1, l.columns)}, ${l.widthMm}mm)`,
      'grid-auto-rows': `${l.heightMm}mm`,
    };
  }

  /** Exact sticker size. Roll printers keep a wider side margin (printer can drift sideways). */
  get labelStyle(): Record<string, string> {
    const l = this.sheet?.layout;
    if (!l) return {};
    return {
      width: `${l.widthMm}mm`,
      height: `${l.heightMm}mm`,
      padding: this.isRoll ? '1.5mm 3.5mm 1.5mm' : '1.5mm 2mm',
    };
  }

  /** QR beside the name: about a third of the sticker height, 9–14 mm. */
  get qrStyle(): Record<string, string> {
    const h = this.sheet?.layout.heightMm ?? 30;
    const mm = Math.min(14, Math.max(9, Math.round(h * 0.36 * 2) / 2));
    return { width: `${mm}mm`, height: `${mm}mm` };
  }

  /** Starting text size: as large as the sticker height comfortably allows. */
  private get basePt(): number {
    const h = this.sheet?.layout.heightMm ?? 30;
    return Math.min(12, Math.max(7, Math.round(h * 0.36 * 4) / 4));
  }

  /**
   * Shrink each sticker's text step by step until its content fits. A sticker
   * that would go below 7 pt (a long lunch) drops its QR to give the dishes
   * the full width — the food must be readable; nothing scans the QR yet.
   */
  fitLabels(): void {
    const labels = this.host.nativeElement.querySelectorAll<HTMLElement>('.dl-label');
    let tight = 0;
    const fit = (el: HTMLElement): number => {
      let pt = this.basePt;
      el.style.fontSize = `${pt}pt`;
      while (el.scrollHeight > el.clientHeight + 1 && pt > MIN_PT) {
        pt = Math.max(MIN_PT, pt - 0.25);
        el.style.fontSize = `${pt}pt`;
      }
      return pt;
    };
    labels.forEach((el) => {
      el.classList.remove('dl-noqr');
      let pt = fit(el);
      if (pt < 7 && el.querySelector('.dl-qr')) {
        el.classList.add('dl-noqr');
        pt = fit(el);
      }
      if (pt <= MIN_PT + 0.5) tight++;
    });
    this.tightCount = tight;
  }

  /** Let long dish names break at "(" and "/" instead of jumping to a new line whole. */
  dishText(s: string): string {
    return s.replace(/(\S)\(/g, '$1 (').replace(/\//g, '/​');
  }

  /**
   * Printed page size, only while this page is open: the sticker itself for a
   * roll printer, A4 for sticker sheets. (A global @page would shrink every
   * other print in the app.)
   */
  private setPageStyle(): void {
    const l = this.sheet?.layout;
    if (!l) return;
    let el = document.getElementById(PAGE_STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = PAGE_STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = this.isRoll
      ? `@media print { @page { size: ${l.widthMm}mm ${l.heightMm}mm; margin: 0; } html, body { margin: 0 !important; padding: 0 !important; } }`
      : '@media print { @page { size: A4; margin: 6mm; } }';
  }

  /** Download ID of the current print, shown as the last line of every sticker. */
  downloadRef: string | null = null;

  async print(): Promise<void> {
    const granted = await this.downloadOtp.verify('Diet labels print');
    if (!granted) return;
    if (typeof window === 'undefined') return;
    // The ID goes INSIDE each sticker (small last line) instead of the page
    // footer, so the size-fitting below makes room for it and nothing spills.
    this.downloadRef = currentDownloadRef() ?? (typeof granted === 'string' ? granted : null);
    this.cdr.detectChanges();
    this.fitLabels();
    document.body.dataset['printStamp'] = 'off'; // no second, page-level footer
    try {
      window.print();
    } finally {
      delete document.body.dataset['printStamp'];
    }
  }
}
