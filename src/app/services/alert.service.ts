import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import type { ConfirmDialogSeverity } from '../shared/ui/confirm-dialog/confirm-dialog.component';

// Phase X — App-wide modal alert / confirm service.
//
// Replaces the browser-native alert() / confirm() primitives with a styled
// modal that matches the rest of the admin panel (TV Control / shared
// ConfirmDialogComponent design language). Promise-returning so call sites
// stay one-liners:
//
//   await this.alert.show('No appointments in current view.');
//   if (await this.alert.confirm('Delete this row?')) { … }
//
// A single <app-confirm-dialog> instance hosted in AppComponent reads
// `state$` and pipes user gestures back via `respond()`.

export interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  severity: ConfirmDialogSeverity;
  alertOnly: boolean;
  // Prompt-mode fields — when promptMode is true the dialog renders an input.
  promptMode: boolean;
  inputType: 'text' | 'password' | 'number';
  inputPlaceholder: string;
  inputValue: string;
}

interface ShowOptions {
  title?: string;
  confirmLabel?: string;
  severity?: ConfirmDialogSeverity;
}

interface ConfirmOptions extends ShowOptions {
  cancelLabel?: string;
}

interface PromptOptions extends ConfirmOptions {
  inputType?: 'text' | 'password' | 'number';
  placeholder?: string;
  defaultValue?: string;
}

const HIDDEN: AlertState = {
  visible: false, title: '', message: '',
  confirmLabel: 'OK', cancelLabel: 'Cancel',
  severity: 'default', alertOnly: false,
  promptMode: false, inputType: 'text', inputPlaceholder: '', inputValue: '',
};

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly _state$ = new BehaviorSubject<AlertState>(HIDDEN);
  /** Pending resolver — there's only ever one dialog open at a time. The new
   * call resolves the previous as `false` to avoid leaking pending promises.
   * The shape changes per-method — `respond()` calls whatever resolver was
   * stored, passing either a boolean (alert/confirm) or string|null (prompt). */
  private pending: ((result: unknown) => void) | null = null;
  private pendingKind: 'boolean' | 'prompt' = 'boolean';

  state$: Observable<AlertState> = this._state$.asObservable();

  /** Single-button informational alert. Resolves when user clicks OK or
   * dismisses via X / scrim. Always resolves true (drop-in for alert()). */
  show(message: string, opts: ShowOptions = {}): Promise<boolean> {
    return this.openBoolean({
      ...HIDDEN,
      visible: true,
      message,
      title: opts.title ?? 'Notice',
      confirmLabel: opts.confirmLabel ?? 'OK',
      severity: opts.severity ?? 'default',
      alertOnly: true,
    });
  }

  /** Two-button yes/no. Resolves true on confirm, false on cancel / X /
   * scrim. Drop-in replacement for confirm() with the same semantics. */
  confirm(message: string, opts: ConfirmOptions = {}): Promise<boolean> {
    return this.openBoolean({
      ...HIDDEN,
      visible: true,
      message,
      title: opts.title ?? 'Confirm',
      confirmLabel: opts.confirmLabel ?? 'Confirm',
      cancelLabel: opts.cancelLabel ?? 'Cancel',
      severity: opts.severity ?? 'default',
    });
  }

  /** Two-button modal with a text input. Resolves to the entered string on
   * confirm or null on cancel / X / scrim — drop-in for prompt(). */
  prompt(message: string, opts: PromptOptions = {}): Promise<string | null> {
    return this.openPrompt({
      ...HIDDEN,
      visible: true,
      message,
      title: opts.title ?? 'Input required',
      confirmLabel: opts.confirmLabel ?? 'OK',
      cancelLabel: opts.cancelLabel ?? 'Cancel',
      severity: opts.severity ?? 'default',
      promptMode: true,
      inputType: opts.inputType ?? 'text',
      inputPlaceholder: opts.placeholder ?? '',
      inputValue: opts.defaultValue ?? '',
    });
  }

  private openBoolean(state: AlertState): Promise<boolean> {
    this.clearPending();
    this.pendingKind = 'boolean';
    this._state$.next(state);
    return new Promise<boolean>((resolve) => { this.pending = resolve as (r: unknown) => void; });
  }

  private openPrompt(state: AlertState): Promise<string | null> {
    this.clearPending();
    this.pendingKind = 'prompt';
    this._state$.next(state);
    return new Promise<string | null>((resolve) => { this.pending = resolve as (r: unknown) => void; });
  }

  private clearPending(): void {
    if (!this.pending) return;
    // Any previously-open dialog gets cancelled when a new one supersedes it.
    if (this.pendingKind === 'boolean') this.pending(false);
    else this.pending(null);
    this.pending = null;
  }

  /** Called by the AppComponent host when the user confirms. For prompt mode
   * the value is the input text; for boolean mode it's true. */
  respondConfirm(value: string | true): void {
    const r = this.pending;
    this.pending = null;
    this._state$.next(HIDDEN);
    if (!r) return;
    if (this.pendingKind === 'prompt') r(typeof value === 'string' ? value : '');
    else r(true);
  }

  /** Called by the AppComponent host when the user cancels or dismisses. */
  respondCancel(): void {
    const r = this.pending;
    this.pending = null;
    this._state$.next(HIDDEN);
    if (!r) return;
    if (this.pendingKind === 'prompt') r(null);
    else r(false);
  }

  /** Legacy single-arg responder — kept for the existing AppComponent wiring
   * during migration. New code should call respondConfirm / respondCancel. */
  respond(result: boolean): void {
    if (result) this.respondConfirm(true);
    else this.respondCancel();
  }
}
