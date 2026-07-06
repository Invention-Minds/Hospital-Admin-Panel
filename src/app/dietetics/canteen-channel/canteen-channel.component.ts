import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DieteticsService, CanteenTvSnapshot } from '../../services/dietetics.service';

/**
 * Canteen TV channel — `/canteen-channel/:channelId`.
 *
 * Designed to run unattended on a kiosk browser. Polls the snapshot
 * endpoint every 30s; the page picks the appropriate meal-time slot based
 * on the kiosk clock. Endpoint is unauthenticated so the kiosk doesn't
 * need a logged-in session.
 */
@Component({
  selector: 'app-canteen-channel',
  templateUrl: './canteen-channel.component.html',
  styleUrls: ['./canteen-channel.component.css'],
})
export class CanteenChannelComponent implements OnInit, OnDestroy {
  channelId = '';
  snapshot: CanteenTvSnapshot | null = null;
  errorMessage = '';
  now = new Date();

  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private svc: DieteticsService) {}

  ngOnInit(): void {
    this.channelId = this.route.snapshot.paramMap.get('channelId') ?? '';
    this.refresh();
    interval(30_000).pipe(takeUntil(this.destroy$)).subscribe(() => this.refresh());
    interval(1_000).pipe(takeUntil(this.destroy$)).subscribe(() => { this.now = new Date(); });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    if (!this.channelId) return;
    this.svc.getTvSnapshot(this.channelId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => { this.snapshot = s; this.errorMessage = ''; },
      error: (e) => { this.errorMessage = e?.error?.error || 'Channel unavailable'; },
    });
  }
}
