import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Severity affects the header-bar colour and the confirm-button colour.
 *
 *  - 'default' — neutral/informational confirm (navy header, orange confirm)
 *  - 'warning' — soft reversible action (yellow header + yellow confirm)
 *  - 'danger'  — destructive / irreversible action (red header + red confirm)
 *
 * Tokens consumed:
 *   header bg    — --color-brand-navy-700 / --color-warning-strong / --color-danger-strong
 *   confirm bg   — --color-brand-primary / --color-warning-strong / --color-danger-strong
 *   scrim        — --color-surface-overlay
 *   shell        — --color-surface-card + --radius-xl
 *   typography   — --font-family-primary + --font-size-* + --font-weight-*
 */
export type ConfirmDialogSeverity = 'default' | 'warning' | 'danger';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css'],
})
export class ConfirmDialogComponent {
  /** Controls visibility. Two-way bindable via `visibleChange`. */
  @Input() visible = false;

  /** Header title text. */
  @Input() title = '';

  /** Body message. */
  @Input() message = '';

  /** Confirm button label. */
  @Input() confirmLabel = 'Confirm';

  /** Cancel button label. */
  @Input() cancelLabel = 'Cancel';

  /** Severity — picks header-bar + confirm-button color. */
  @Input() severity: ConfirmDialogSeverity = 'default';

  /** When true, the Cancel button is hidden — single-button informational
   * mode used by AlertService.show() to replace browser-native alert(). */
  @Input() alertOnly = false;

  /** When true, a text/password input renders between the message and the
   * footer. Used by AlertService.prompt() to replace browser-native prompt().
   * The confirm event emits the entered value; cancel emits null. */
  @Input() promptMode = false;
  @Input() inputType: 'text' | 'password' | 'number' = 'text';
  @Input() inputPlaceholder = '';
  @Input() inputValue = '';

  @Output() promptConfirm = new EventEmitter<string>();

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm(): void {
    if (this.promptMode) this.promptConfirm.emit(this.inputValue ?? '');
    this.confirm.emit();
    this.hide();
  }

  onCancel(): void {
    this.cancel.emit();
    this.hide();
  }

  onClose(): void {
    // The X button and scrim click both route through cancel so callers only
    // need to listen to one event for "user backed out".
    this.onCancel();
  }

  private hide(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
