import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  CriticalValuesService,
  CriticalValueAlert,
} from '../../services/critical-values.service';
import { AuthServiceService } from '../../services/auth/auth-service.service';
import { MessageService } from 'primeng/api';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Sprint 3g — Critical-Values widget. Subscribes to the Sprint 2.5 backend
 * SSE broadcaster via CriticalValuesService and renders a bell + togglable
 * panel in the bottom-right of the authenticated app shell.
 */
@Component({
  selector: 'app-critical-values-alert',
  templateUrl: './critical-values-alert.component.html',
  styleUrls: ['./critical-values-alert.component.css'],
})
export class CriticalValuesAlertComponent implements OnInit, OnDestroy {
  alerts: CriticalValueAlert[] = [];
  isConnected = false;
  unreadCount = 0;
  showPanel = false;
  loading = false;
  muted = false;

  /** Sprint 4a Phase 1d — in-flight ack-request tracking for per-button disable. */
  ackInFlight = new Set<string>();

  @ViewChild('bellBtn', { read: ElementRef }) bellBtn?: ElementRef<HTMLElement>;

  private destroy$ = new Subject<void>();
  private userId = '';
  private readonly muteStorageKey = 'critical-values-muted';

  constructor(
    private criticalValuesService: CriticalValuesService,
    private authService: AuthServiceService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.muted = this.resolveInitialMute();
    this.userId = this.authService.getUserId()?.toString() ?? '';
    if (this.userId) {
      this.connectToAlerts();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.criticalValuesService.unsubscribeFromCriticalValues();
  }

  // ---- SSE subscription -------------------------------------------------

  connectToAlerts(): void {
    this.loading = true;
    this.criticalValuesService
      .subscribeToCriticalValues(this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alert) => {
          this.isConnected = true;
          this.loading = false;
          this.alerts.unshift(alert);
          this.unreadCount += 1;
          this.playAlertSound();
        },
        error: () => {
          this.isConnected = false;
          this.loading = false;
        },
      });
  }

  reconnect(): void {
    this.connectToAlerts();
  }

  // ---- Panel + ack actions ----------------------------------------------

  togglePanel(): void {
    this.showPanel = !this.showPanel;
    if (this.showPanel) {
      this.unreadCount = 0;
    }
  }

  closePanel(): void {
    if (!this.showPanel) return;
    this.showPanel = false;
    // Return focus to the bell for keyboard users.
    queueMicrotask(() => this.bellBtn?.nativeElement?.focus());
  }

  /**
   * Sprint 4a Phase 1d — dismiss a single alert with server-side
   * acknowledgment. Failure policy (approved in Step 0 §0.4): remove
   * locally regardless so the alert doesn't reappear on the user who
   * already decided to dismiss; surface the server failure via toast so
   * the audit-trail gap is explicit.
   *
   * Server-side attribution is derived from `req.user.username` via
   * authenticateToken (Phase 1d backend patch); the body-supplied
   * `acknowledgedBy` is ignored by the server but we still pass the
   * locally-known username for legacy-endpoint compatibility.
   */
  async clearAlert(alertId: string): Promise<void> {
    if (this.ackInFlight.has(alertId)) return; // debounce rapid double-clicks
    this.ackInFlight.add(alertId);

    const acknowledgedBy = this.authService.getUsername() ?? 'unknown';

    try {
      await firstValueFrom(
        this.criticalValuesService.acknowledgeAlert(alertId, acknowledgedBy)
      );
    } catch {
      // Audit gap accepted — tell the user but still dismiss locally.
      this.messageService.add({
        severity: 'warn',
        summary: 'Alert dismissed locally',
        detail: "Server couldn't be reached — acknowledgment not saved.",
        life: 6000,
      });
    } finally {
      this.criticalValuesService.clearAlert(alertId);
      this.alerts = this.alerts.filter((a) => a.id !== alertId);
      this.ackInFlight.delete(alertId);
    }
  }

  /**
   * Sprint 4a Phase 1d — bulk dismiss with per-alert server ack via
   * Promise.allSettled. Partial-success policy (approved in §D2):
   *   · Successful acks: remove from local state.
   *   · Failed acks: keep in state + summary toast naming the count.
   */
  async clearAllAlerts(): Promise<void> {
    if (this.alerts.length === 0) return;

    const acknowledgedBy = this.authService.getUsername() ?? 'unknown';
    const toDismiss = [...this.alerts];
    toDismiss.forEach((a) => this.ackInFlight.add(a.id));

    const results = await Promise.allSettled(
      toDismiss.map((a) =>
        firstValueFrom(
          this.criticalValuesService.acknowledgeAlert(a.id, acknowledgedBy)
        )
      )
    );

    const failedIds = new Set<string>();
    results.forEach((r, i) => {
      if (r.status === 'rejected') failedIds.add(toDismiss[i].id);
    });

    // Remove successfully-ack'd alerts from local state; leave failed ones.
    const succeededIds = toDismiss
      .filter((a) => !failedIds.has(a.id))
      .map((a) => a.id);
    succeededIds.forEach((id) => this.criticalValuesService.clearAlert(id));
    this.alerts = this.alerts.filter((a) => failedIds.has(a.id));
    if (failedIds.size === 0) {
      // All acknowledged — also clear unreadCount and service-side bucket.
      this.criticalValuesService.clearAllAlerts();
      this.unreadCount = 0;
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: `${succeededIds.length} of ${toDismiss.length} alerts acknowledged`,
        detail: `${failedIds.size} failed to save — they remain in the panel.`,
        life: 7000,
      });
    }

    toDismiss.forEach((a) => this.ackInFlight.delete(a.id));
  }

  // ---- Mute toggle ------------------------------------------------------

  toggleMute(): void {
    this.muted = !this.muted;
    try {
      localStorage.setItem(this.muteStorageKey, String(this.muted));
    } catch {
      // Private-mode or quota errors — silently tolerated; in-memory mute still applies.
    }
  }

  private resolveInitialMute(): boolean {
    try {
      const stored = localStorage.getItem(this.muteStorageKey);
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    } catch {
      // Fall through to prefers-reduced-motion check.
    }
    // First-load default: respect user's OS-level reduced-motion preference.
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch {
        return false;
      }
    }
    return false;
  }

  // ---- Severity classes (replaces hex returns) --------------------------

  getCriticalityClass(level: string): string {
    switch (level) {
      case 'critical':
        return 'crit-level-critical';
      case 'high':
        return 'crit-level-high';
      case 'low':
        return 'crit-level-low';
      default:
        return 'crit-level-default';
    }
  }

  getCriticalityIcon(level: string): string {
    switch (level) {
      case 'critical':
        return 'pi pi-times-circle';
      case 'high':
        return 'pi pi-exclamation-circle';
      case 'low':
        return 'pi pi-info-circle';
      default:
        return 'pi pi-question-circle';
    }
  }

  // ---- Helpers ----------------------------------------------------------

  formatTime(date: Date | string): string {
    return new Date(date).toLocaleTimeString();
  }

  /**
   * ESC closes the panel when open. Listening at document scope because the
   * panel is non-modal — focus may be anywhere when ESC is pressed.
   */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closePanel();
  }

  /** Beep via Web Audio API. No-op when muted. */
  playAlertSound(): void {
    if (this.muted) return;
    try {
      const Ctor = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio contexts can fail on some browsers / in tests — sound is non-essential.
    }
  }
}
