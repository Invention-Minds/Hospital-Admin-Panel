import { Component, OnInit } from '@angular/core';
import { TherapyService } from '../../services/therapy/therapy.service';
import { MessageService } from 'primeng/api';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-therapy-courses',
  templateUrl: './therapy-courses.component.html',
  styleUrl: './therapy-courses.component.css',
  providers: [MessageService],
})
export class TherapyCoursesComponent implements OnInit {
  courses: any[] = [];
  filtered: any[] = [];
  selectedCourse: any = null;

  isLoading = false;
  search = '';
  statusFilter = '';

  // Reschedule state
  reschedulingDay: any = null; // the plan day being moved
  newDate = '';
  preview: any = null;
  previewLoading = false;
  applyLoading = false;

  // Conflict popup (MHC-style) for tentative/planned clashes on reschedule.
  displayConflictDialog = false;
  conflictMessage = '';
  private pendingProceed: (() => void) | null = null;

  minDate = '';
  username = '';

  constructor(
    private therapyService: TherapyService,
    private messageService: MessageService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.username = localStorage.getItem('username') || '';
    const t = new Date();
    this.minDate = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    this.loadCourses();
  }

  // ---------------- List ----------------
  loadCourses(): void {
    this.isLoading = true;
    this.therapyService.getTherapyCourses(this.statusFilter || undefined).subscribe({
      next: (res) => {
        this.courses = res || [];
        this.applySearch();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading courses', err);
        this.isLoading = false;
      },
    });
  }

  applySearch(): void {
    const q = this.search.trim().toLowerCase();
    this.filtered = !q
      ? [...this.courses]
      : this.courses.filter(
          (c) =>
            c.name?.toLowerCase().includes(q) ||
            String(c.prn).includes(q)
        );
  }

  // ---------------- Detail ----------------
  openCourse(id: number): void {
    this.isLoading = true;
    this.cancelReschedule();
    this.therapyService.getTherapyCourseById(id).subscribe({
      next: (res) => {
        this.selectedCourse = res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading course', err);
        this.isLoading = false;
      },
    });
  }

  reloadSelected(): void {
    if (this.selectedCourse?.id) this.openCourse(this.selectedCourse.id);
  }

  backToList(): void {
    this.selectedCourse = null;
    this.cancelReschedule();
    this.loadCourses();
  }

  progressLabel(c: any): string {
    const p = c.progress;
    if (!p) return '';
    return `${p.completed}/${p.total} done${p.cancelled ? `, ${p.cancelled} cancelled` : ''}`;
  }

  /** A day can be rescheduled only while it's still pending (not done/cancelled). */
  canReschedule(day: any): boolean {
    return this.selectedCourse?.status === 'active' &&
      day.status !== 'completed' && day.status !== 'cancelled';
  }

  // ---------------- Reschedule ----------------
  startReschedule(day: any): void {
    this.reschedulingDay = day;
    this.newDate = '';
    this.preview = null;
  }

  cancelReschedule(): void {
    this.reschedulingDay = null;
    this.newDate = '';
    this.preview = null;
    this.previewLoading = false;
  }

  runPreview(): void {
    if (!this.newDate) {
      this.messageService.add({ severity: 'warn', summary: 'Pick a date', detail: 'Choose the new date first.' });
      return;
    }
    this.previewLoading = true;
    this.preview = null;
    this.therapyService
      .previewCourseReschedule(this.selectedCourse.id, this.reschedulingDay.dayNumber, this.newDate)
      .subscribe({
        next: (res) => {
          this.preview = res;
          this.previewLoading = false;
        },
        error: (err) => {
          this.previewLoading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Cannot preview',
            detail: err.error?.reason || err.error?.message || 'Preview failed',
          });
        },
      });
  }

  confirmReschedule(force = false): void {
    this.applyLoading = true;
    this.therapyService
      .applyCourseReschedule(this.selectedCourse.id, this.reschedulingDay.dayNumber, this.newDate, this.username, force)
      .subscribe({
        next: (res) => {
          this.applyLoading = false;
          this.messageService.add({ severity: 'success', summary: 'Rescheduled', detail: res.message });
          this.cancelReschedule();
          this.reloadSelected();
        },
        error: (err) => {
          this.applyLoading = false;
          // Planned (tentative) clash → MHC-style popup, proceed with force.
          if (err.status === 409 && err.error?.warning && !force) {
            this.conflictMessage = err.error.message || 'A tentative session is already planned. Proceed anyway?';
            this.pendingProceed = () => {
              this.applyLoading = true;
              this.confirmReschedule(true);
            };
            this.displayConflictDialog = true;
            return;
          }
          this.messageService.add({
            severity: 'error',
            summary: 'Reschedule failed',
            detail: err.error?.message || err.error?.reason || 'Failed to reschedule',
          });
        },
      });
  }

  /** True when any shifted day has a real (hard-block) clash — confirm would be rejected. */
  targetBlocked(): boolean {
    if (!this.preview?.affected) return false;
    return this.preview.affected.some((a: any) => a.realConflict || a.outsideHours);
  }

  onConflictAccept(): void {
    this.displayConflictDialog = false;
    const proceed = this.pendingProceed;
    this.pendingProceed = null;
    if (proceed) proceed();
  }

  onConflictReject(): void {
    this.displayConflictDialog = false;
    this.pendingProceed = null;
  }

  // ---------------- Cancel course ----------------
  async cancelCourse(): Promise<void> {
    if (!this.selectedCourse?.id) return;
    if (!await this.alertSvc.confirm(`Cancel the whole course for ${this.selectedCourse.name}? Completed days are kept; all upcoming days are cancelled.`, { severity: 'danger', confirmLabel: 'Cancel course' })) {
      return;
    }
    this.isLoading = true;
    this.therapyService.cancelTherapyCourse(this.selectedCourse.id, this.username).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'info',
          summary: 'Course cancelled',
          detail: res.message + (res.cancelledDays != null ? ` (${res.cancelledDays} day(s))` : ''),
        });
        this.reloadSelected();
      },
      error: (err) => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'Failed to cancel course',
        });
      },
    });
  }
}
