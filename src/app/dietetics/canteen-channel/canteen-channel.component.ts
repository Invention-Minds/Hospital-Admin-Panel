import { Component, ElementRef, HostListener, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DieteticsService, CanteenTvSnapshot, localDateString } from '../../services/dietetics.service';

type TvRow = CanteenTvSnapshot['groups'][number]['rows'][number];

interface WardCounts { total: number; toPrepare: number; prepared: number; served: number }

/** One ward column on the pass; big wards continue in a second column. */
interface Lane {
  wardName: string;
  part: string;          // "1/2" when the ward continues in the next column
  counts: WardCounts;
  tickets: TvRow[];
}

/** Summary mode: one card per ward, counts only. */
interface WardCard {
  wardName: string;
  counts: WardCounts;
}

const PAGE_SECONDS = 15;
/** A ticket whose status changed on the last refresh gets the stamp animation for this long. */
const STAMP_MS = 8_000;
/** Service clock turns urgent when this little time is left and trays are still pending. */
const URGENT_MINUTES = 15;

/** Layout metrics (px) used to pack tickets into the measured board area. */
const LANE_MIN_W = 300;
const LANE_GAP = 18;
const LANE_HEAD_H = 98;
const TICKET_H = 164;        // open ticket incl. gap (diet + meal may take 2 lines)
const TICKET_SERVED_H = 54;  // served tickets collapse to one line
const PAGER_H = 34;
const CARD_MIN_W = 280;
const CARD_H = 132;
const CARD_GAP = 16;

const STATUS_ORDER: Record<string, number> = { ORDERED: 0, PLATED: 1, DELIVERED: 2 };

/**
 * Canteen TV channel — `/canteen-channel/:channelId`.
 *
 * "The pass": each ward is a ticket rail, each tray an order slip hanging
 * from it (bed, adm no., diet, meal). Slips still to prepare sit on top with
 * a saffron tag; prepared slips get stamped; served slips drop to a one-line
 * "sent" row. A service clock tracks the meal window. Columns and pages are
 * sized from the measured screen and rotate when everything doesn't fit.
 * Runs unattended (exempt from the inactivity logout); polls every 30s.
 *
 * The channel's setup picks its wards and mode: "tickets" (above) for the
 * plating line, or "summary" — one count card per ward — for the supervisor.
 * `?ward=<id>` narrows any channel to one ward (pantry tablet).
 */
@Component({
  selector: 'app-canteen-channel',
  templateUrl: './canteen-channel.component.html',
  styleUrls: ['./canteen-channel.component.css'],
})
export class CanteenChannelComponent implements OnInit, OnDestroy {
  channelId = '';
  wardId: string | null = null;
  snapshot: CanteenTvSnapshot | null = null;
  errorMessage = '';
  now = new Date();
  currentYear = new Date().getFullYear();

  pages: Lane[][] = [];
  cardPages: WardCard[][] = [];
  pageIndex = 0;
  lanesPerPage = 5;
  cardsPerRow = 6;
  totals: WardCounts = { total: 0, toPrepare: 0, prepared: 0, served: 0 };

  /** The board area — measured to decide how many columns / tickets fit. */
  @ViewChild('stage', { static: true }) stage?: ElementRef<HTMLElement>;

  private destroy$ = new Subject<void>();
  private secondsOnPage = 0;
  private readonly isBrowser: boolean;
  /** Last known status per tray, and when it last changed (for the stamp). */
  private lastStatus = new Map<string, string>();
  private changedAt = new Map<string, number>();

  constructor(
    private route: ActivatedRoute,
    private svc: DieteticsService,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.channelId = this.route.snapshot.paramMap.get('channelId') ?? '';
    this.wardId = this.route.snapshot.queryParamMap.get('ward');
    this.refresh();
    interval(30_000).pipe(takeUntil(this.destroy$)).subscribe(() => this.refresh());
    interval(1_000).pipe(takeUntil(this.destroy$)).subscribe(() => this.tick());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.snapshot) this.build(this.snapshot);
  }

  refresh(): void {
    if (!this.channelId) return;
    this.svc.getTvSnapshot(this.channelId, this.wardId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => { this.noteChanges(s); this.snapshot = s; this.errorMessage = ''; this.build(s); },
      // Keep showing the last good board; just flag the connection problem.
      error: (e) => { this.errorMessage = e?.error?.error || 'Connection lost — showing the last update'; },
    });
  }

  // ── Meal / service clock ──────────────────────────────────────────────

  /** NOW / NEXT / TOMORROW — falls back to the date when the backend is older. */
  get phase(): 'NOW' | 'NEXT' | 'TOMORROW' {
    const s = this.snapshot;
    if (s?.phase) return s.phase;
    return s?.serviceDate && s.serviceDate !== localDateString(new Date()) ? 'TOMORROW' : 'NOW';
  }

  /** Share of the meal window already gone (0–100), for the service clock. */
  get windowPct(): number {
    const w = this.window();
    if (!w || this.phase !== 'NOW') return 0;
    const pct = ((this.now.getTime() - w.start) / (w.end - w.start)) * 100;
    return Math.min(100, Math.max(0, pct));
  }

  /** "42 min left" / "starts in 2h 26m" / "tomorrow 07:30". */
  get clockText(): string {
    const w = this.window();
    const slot = this.snapshot?.slot;
    if (!w || !slot) return '';
    if (this.phase === 'TOMORROW') return `Tomorrow ${slot.startTime}`;
    if (this.phase === 'NEXT') return `Starts in ${this.duration(w.start - this.now.getTime())}`;
    return `${this.duration(w.end - this.now.getTime())} left`;
  }

  /** Little time left and trays still waiting for the kitchen. */
  get isUrgent(): boolean {
    const w = this.window();
    if (!w || this.phase !== 'NOW' || this.totals.toPrepare === 0) return false;
    return w.end - this.now.getTime() <= URGENT_MINUTES * 60_000;
  }

  // ── Board helpers ─────────────────────────────────────────────────────

  /** A pantry tablet (`?ward=`) always gets tickets, even on a summary channel. */
  get isSummary(): boolean {
    return !this.wardId && this.snapshot?.view?.mode === 'summary';
  }

  /** Header line under the hospital name: channel · wards it covers. */
  get subtitle(): string {
    const name = this.snapshot?.channel?.name || 'Canteen';
    const wards = this.snapshot?.view?.wardNames ?? [];
    const scope = wards.length ? wards.join(', ') : this.isSummary ? 'All wards' : 'Kitchen pass';
    return `${name} · ${scope}`;
  }

  get pageCount(): number {
    return this.isSummary ? this.cardPages.length : this.pages.length;
  }

  get currentLanes(): Lane[] {
    return this.pages[this.pageIndex] ?? [];
  }

  get currentCards(): WardCard[] {
    return this.cardPages[this.pageIndex] ?? [];
  }

  trackCard(_: number, c: WardCard): string { return c.wardName; }

  /** Width share of each status in a status bar. */
  pct(part: number, c: WardCounts): number {
    return c.total ? (part / c.total) * 100 : 0;
  }

  /** What the trolley for this ward can do right now. */
  laneState(c: WardCounts): 'served' | 'ready' | 'working' {
    if (c.total > 0 && c.served === c.total) return 'served';
    if (c.toPrepare === 0 && c.prepared > 0) return 'ready';
    return 'working';
  }

  statusClass(status: string): string {
    return status === 'DELIVERED' ? 'served' : status === 'PLATED' ? 'prepared' : 'pending';
  }

  /** Status changed on a recent refresh → play the stamp animation. */
  isFresh(r: TvRow): boolean {
    const at = this.changedAt.get(r.admissionNo);
    return !!at && this.now.getTime() - at < STAMP_MS;
  }

  /** A slight, stable tilt so slips look hand-hung, not printed in a grid. */
  tilt(i: number, r: TvRow): string {
    let h = i;
    for (const ch of r.admissionNo) h = (h * 31 + ch.charCodeAt(0)) % 997;
    return `${((h % 7) - 3) * 0.22}deg`;
  }

  trackLane(_: number, l: Lane): string { return `${l.wardName}|${l.part}`; }
  trackTicket(_: number, r: TvRow): string { return r.admissionNo; }

  // ── Internals ─────────────────────────────────────────────────────────

  private tick(): void {
    this.now = new Date();
    if (this.pageCount > 1 && ++this.secondsOnPage >= PAGE_SECONDS) {
      this.secondsOnPage = 0;
      this.pageIndex = (this.pageIndex + 1) % this.pageCount;
    }
  }

  private window(): { start: number; end: number } | null {
    const slot = this.snapshot?.slot;
    if (!slot) return null;
    const at = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      const d = new Date(this.now); d.setHours(h, m, 0, 0);
      if (this.phase === 'TOMORROW') d.setDate(d.getDate() + 1);
      return d.getTime();
    };
    return { start: at(slot.startTime), end: at(slot.endTime) };
  }

  private duration(ms: number): string {
    const mins = Math.max(0, Math.round(ms / 60_000));
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
  }

  /** Remember which trays moved since the last refresh (first load stamps nothing). */
  private noteChanges(s: CanteenTvSnapshot): void {
    const firstLoad = this.lastStatus.size === 0;
    const stamp = Date.now();
    for (const g of s.groups) {
      for (const r of g.rows) {
        const prev = this.lastStatus.get(r.admissionNo);
        if (!firstLoad && prev && prev !== r.status) this.changedAt.set(r.admissionNo, stamp);
        this.lastStatus.set(r.admissionNo, r.status);
      }
    }
  }

  private measure(): { width: number; height: number } {
    const el = this.isBrowser ? this.stage?.nativeElement : undefined;
    return { width: el?.clientWidth || 1880, height: el?.clientHeight || 760 };
  }

  private build(s: CanteenTvSnapshot): void {
    const { width, height } = this.measure();
    this.lanesPerPage = Math.min(6, Math.max(1, Math.floor((width + LANE_GAP) / (LANE_MIN_W + LANE_GAP))));
    const laneBudget = Math.max(TICKET_H, height - LANE_HEAD_H - PAGER_H);

    const totals: WardCounts = { total: 0, toPrepare: 0, prepared: 0, served: 0 };
    const lanes: Lane[] = [];
    const groups = [...s.groups].sort((a, b) => a.wardName.localeCompare(b.wardName));

    for (const g of groups) {
      // Work first: to prepare → prepared → served, then by bed.
      const rows = [...g.rows].sort((a, b) =>
        (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
        || (a.bedNumber ?? '').localeCompare(b.bedNumber ?? '', undefined, { numeric: true }));
      const count = (st: string) => rows.filter((r) => r.status === st).length;
      const counts: WardCounts = {
        total: rows.length, toPrepare: count('ORDERED'), prepared: count('PLATED'), served: count('DELIVERED'),
      };
      totals.total += counts.total;
      totals.toPrepare += counts.toPrepare;
      totals.prepared += counts.prepared;
      totals.served += counts.served;

      // Pack tickets into columns that fit the screen height.
      const chunks: TvRow[][] = [];
      let chunk: TvRow[] = [];
      let used = 0;
      for (const r of rows) {
        const h = r.status === 'DELIVERED' ? TICKET_SERVED_H : TICKET_H;
        if (chunk.length && used + h > laneBudget) { chunks.push(chunk); chunk = []; used = 0; }
        chunk.push(r);
        used += h;
      }
      if (chunk.length) chunks.push(chunk);
      chunks.forEach((tickets, i) => lanes.push({
        wardName: g.wardName,
        part: chunks.length > 1 ? `${i + 1}/${chunks.length}` : '',
        counts,
        tickets,
      }));
    }

    const pages: Lane[][] = [];
    for (let i = 0; i < lanes.length; i += this.lanesPerPage) pages.push(lanes.slice(i, i + this.lanesPerPage));

    // Summary: the same ward counts as a grid of cards sized to the screen.
    const cards: WardCard[] = [];
    for (const l of lanes) if (!l.part || l.part.startsWith('1/')) cards.push({ wardName: l.wardName, counts: l.counts });
    this.cardsPerRow = Math.max(1, Math.floor((width + CARD_GAP) / (CARD_MIN_W + CARD_GAP)));
    const rows = Math.max(1, Math.floor((height - PAGER_H + CARD_GAP) / (CARD_H + CARD_GAP)));
    const perPage = this.cardsPerRow * rows;
    const cardPages: WardCard[][] = [];
    for (let i = 0; i < cards.length; i += perPage) cardPages.push(cards.slice(i, i + perPage));

    this.pages = pages;
    this.cardPages = cardPages;
    this.totals = totals;
    if (this.pageIndex >= this.pageCount) { this.pageIndex = 0; this.secondsOnPage = 0; }
  }
}
