import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  WhatsappQuery,
  WhatsappQueryMessage,
  WhatsappQueryService,
} from '../services/whatsapp-query.service';

/**
 * WhatsApp patient-query inbox (doctor side).
 * Route: /whatsapp-queries
 * Left: query list (filter by status). Right: full message thread with patient
 * attachments (report PDFs/images), plus a reply box that pushes back to WhatsApp.
 */
@Component({
  selector: 'app-whatsapp-queries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './whatsapp-queries.component.html',
  styleUrls: ['./whatsapp-queries.component.css'],
})
export class WhatsappQueriesComponent implements OnInit, OnDestroy {
  rows: WhatsappQuery[] = [];
  selected: WhatsappQuery | null = null;

  statusFilter = 'open';
  readonly STATUSES = ['open', 'answered', 'closed', ''];

  loading = false;
  threadLoading = false;
  errorMessage = '';

  replyText = '';
  sending = false;
  closing = false;

  private destroy$ = new Subject<void>();
  constructor(private svc: WhatsappQueryService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true; this.errorMessage = '';
    this.svc.inbox(this.statusFilter || undefined).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.rows = r.data ?? [];
        this.loading = false;
        // Keep the open thread in sync if it's still in the list.
        if (this.selected) {
          const stillThere = this.rows.find((q) => q.id === this.selected!.id);
          if (!stillThere) this.selected = null;
        }
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load queries'; this.loading = false; },
    });
  }

  open(q: WhatsappQuery): void {
    this.threadLoading = true; this.replyText = '';
    this.svc.get(q.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.selected = r.data; this.threadLoading = false; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to open thread'; this.threadLoading = false; },
    });
  }

  send(): void {
    if (!this.selected || !this.replyText.trim()) return;
    this.sending = true;
    this.svc.reply(this.selected.id, this.replyText.trim()).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.sending = false; this.replyText = '';
        this.selected = r.data;
        this.load();
      },
      error: (e) => { this.sending = false; this.errorMessage = e?.error?.message || 'Failed to send reply'; },
    });
  }

  closeThread(): void {
    if (!this.selected) return;
    this.closing = true;
    this.svc.close(this.selected.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.closing = false; this.selected = { ...this.selected!, status: r.data.status }; this.load(); },
      error: (e) => { this.closing = false; this.errorMessage = e?.error?.message || 'Failed to close'; },
    });
  }

  mediaSrc(m: WhatsappQueryMessage): string { return this.svc.mediaSrc(m.mediaUrl); }
  isImage(m: WhatsappQueryMessage): boolean { return m.mediaType === 'image'; }
}
