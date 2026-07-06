import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DashboardAlert } from '../../services/dashboard.service';

/**
 * One row in the alerts rail — severity-coded left bar + icon + title +
 * one-line message + optional action link. Severity controls accent color
 * AND icon, so alerts remain legible even in greyscale.
 */
@Component({
  selector: 'app-alert-row',
  templateUrl: './alert-row.component.html',
  styleUrls: ['./alert-row.component.css'],
})
export class AlertRowComponent {
  @Input() alert!: DashboardAlert;
  @Output() openAlert = new EventEmitter<DashboardAlert>();

  iconFor(): string {
    switch (this.alert.type) {
      case 'critical-result':
        return 'pi pi-exclamation-triangle';
      case 'pending-consent':
        return 'pi pi-file-edit';
      case 'pending-discharge':
        return 'pi pi-file-edit';
      default:
        return 'pi pi-info-circle';
    }
  }

  /** Relative time: "5m ago" / "2h ago" / "Yesterday". */
  relativeTime(): string {
    const at = new Date(this.alert.at);
    if (Number.isNaN(at.getTime())) return '';
    const mins = Math.floor((Date.now() - at.getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return at.toLocaleDateString();
  }

  onClick(): void {
    this.openAlert.emit(this.alert);
  }
}
