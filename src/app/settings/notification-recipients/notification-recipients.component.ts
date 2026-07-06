import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationRecipientService, NotificationRecipient } from '../../services/notification-recipient.service';

/**
 * Admin screen: manage message recipient phone numbers per group.
 * Route: /settings/notification-recipients (authGuard + roleGuard, admin).
 */
@Component({
  selector: 'app-notification-recipients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-recipients.component.html',
  styleUrl: './notification-recipients.component.css',
})
export class NotificationRecipientsComponent implements OnInit {
  groups: string[] = [];
  recipients: NotificationRecipient[] = [];
  filterGroup = ''; // '' = all
  search = '';
  loading = false;
  message = '';
  error = '';

  /** Client-side text filter over the loaded rows (group/phone/label). */
  get displayed(): NotificationRecipient[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.recipients;
    return this.recipients.filter(
      (r) =>
        r.phone.toLowerCase().includes(q) ||
        (r.label || '').toLowerCase().includes(q) ||
        r.groupKey.toLowerCase().includes(q)
    );
  }

  // Add / edit form
  editingId: string | null = null;
  formGroup = '';
  formPhone = '';
  formLabel = '';

  constructor(private svc: NotificationRecipientService) {}

  ngOnInit(): void {
    this.svc.groups().subscribe({
      next: (res) => {
        this.groups = res.groups;
        if (!this.formGroup && this.groups.length) this.formGroup = this.groups[0];
      },
      error: () => {},
    });
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.error = '';
    this.svc.list(this.filterGroup || undefined).subscribe({
      next: (res) => {
        this.recipients = res.recipients;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'Failed to load recipients';
        this.loading = false;
      },
    });
  }

  startEdit(r: NotificationRecipient): void {
    this.editingId = r.id;
    this.formGroup = r.groupKey;
    this.formPhone = r.phone;
    this.formLabel = r.label || '';
    this.message = '';
    this.error = '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.formPhone = '';
    this.formLabel = '';
  }

  save(): void {
    const phone = this.formPhone.replace(/[^0-9]/g, '');
    if (phone.length < 10) {
      this.error = 'Phone must be at least 10 digits (country-coded, e.g. 9198...)';
      return;
    }
    const done = () => {
      this.message = this.editingId ? 'Recipient updated' : 'Recipient added';
      this.cancelEdit();
      this.refresh();
    };
    const fail = (err: any) => (this.error = err?.error?.error || 'Save failed');

    if (this.editingId) {
      this.svc.update(this.editingId, { phone, label: this.formLabel.trim() || null }).subscribe({ next: done, error: fail });
    } else {
      if (!this.formGroup) {
        this.error = 'Pick a group';
        return;
      }
      this.svc.create(this.formGroup, phone, this.formLabel.trim() || undefined).subscribe({ next: done, error: fail });
    }
  }

  toggleActive(r: NotificationRecipient): void {
    this.svc.update(r.id, { isActive: !r.isActive }).subscribe({
      next: () => this.refresh(),
      error: (err) => (this.error = err?.error?.error || 'Failed to update'),
    });
  }

  remove(r: NotificationRecipient): void {
    if (typeof window !== 'undefined' && !window.confirm(`Delete ${r.phone} from ${r.groupKey}?`)) return;
    this.svc.remove(r.id).subscribe({
      next: () => {
        this.message = 'Recipient deleted';
        this.refresh();
      },
      error: (err) => (this.error = err?.error?.error || 'Failed to delete'),
    });
  }
}
