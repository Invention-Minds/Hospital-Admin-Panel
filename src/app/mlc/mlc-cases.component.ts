import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { MlcService, MlcCase } from '../services/mlc.service';

@Component({
  selector: 'app-mlc-cases',
  templateUrl: './mlc-cases.component.html',
  styleUrls: ['./mlc-cases.component.css']
})
export class MlcCasesComponent implements OnInit, OnDestroy {
  loading = false;
  mlcCases: MlcCase[] = [];
  filteredCases: MlcCase[] = [];
  pendingReportsCount = 0;             // Sprint 3d: badge near heading
  closeConfirmVisible = false;         // Sprint 3d: replaces prompt()
  pendingCloseId: string | null = null;
  pendingCloseNotes = '';
  stats: any = {
    total: 0,
    byStatus: { documented: 0, examined: 0, samplesCollected: 0, submitted: 0, closed: 0 },
    byCaseType: { accident: 0, assault: 0, poison: 0, burn: 0, other: 0 }
  };

  selectedStatus: string = 'all';
  selectedCaseType: string = 'all';
  searchTerm: string = '';

  // A doctor sees only MLC cases whose emergency was referred/assigned to them.
  private isDoctor = false;

  private destroy$ = new Subject<void>();

  statusOptions = [
    { label: 'All', value: 'all' },
    { label: 'Documented', value: 'documented' },
    { label: 'Examination Done', value: 'examination-done' },
    { label: 'Samples Collected', value: 'samples-collected' },
    { label: 'Report Submitted', value: 'report-submitted' },
    { label: 'Closed', value: 'closed' }
  ];

  caseTypeOptions = [
    { label: 'All', value: 'all' },
    { label: 'Accident', value: 'accident' },
    { label: 'Assault', value: 'assault' },
    { label: 'Poison', value: 'poison' },
    { label: 'Burn', value: 'burn' },
    { label: 'Other', value: 'other' }
  ];

  constructor(
    private mlcService: MlcService,
    private router: Router,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      this.isDoctor = (localStorage.getItem('role') || '') === 'doctor';
    }
    this.loadCases();
    this.loadStats();
    this.loadPendingCount();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCases(): void {
    this.loading = true;
    const source$: Observable<MlcCase[]> = this.isDoctor
      ? this.mlcService.getMyMlcCases().pipe(map((r) => r?.data ?? []))
      : this.mlcService.getAllMlcCases();
    source$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res || [];
          this.mlcCases = Array.isArray(data) ? data : [];
          this.applyFilters();
          this.loading = false;
        },
        error: (err) => {
          console.error('MLC load failed', err);
          this.loading = false;
        }
      });
  }

  loadStats(): void {
    this.mlcService.getMlcStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => { this.stats = res?.data || res; },
        error: (err) => console.error('Stats load failed', err)
      });
  }

  applyFilters(): void {
    let list = [...this.mlcCases];
    if (this.selectedStatus !== 'all') {
      list = list.filter(c => c.status === this.selectedStatus);
    }
    if (this.selectedCaseType !== 'all') {
      list = list.filter(c => c.caseType === this.selectedCaseType);
    }
    if (this.searchTerm) {
      const q = this.searchTerm.toLowerCase();
      list = list.filter(c =>
        (c.mlcNo || '').toLowerCase().includes(q) ||
        (c.policeStationName || '').toLowerCase().includes(q) ||
        (c.fir_No || '').toLowerCase().includes(q)
      );
    }
    this.filteredCases = list;
  }

  downloadReport(id?: string): void {
    if (!id) return;
    this.mlcService.generateMlcReport(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `MLC-Report-${id}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: (err) => console.error('Download failed', err)
      });
  }

  closeCase(id?: string): void {
    if (!id) return;
    // Sprint 3d: replace prompt() with P1 ConfirmDialog flow. The dialog
    // collects a single optional notes value via `pendingCloseNotes` bound
    // to a textarea rendered alongside the ConfirmDialog.
    this.pendingCloseId = id;
    this.pendingCloseNotes = '';
    this.closeConfirmVisible = true;
  }

  confirmClose(): void {
    const id = this.pendingCloseId;
    if (!id) return;
    const notes = this.pendingCloseNotes;
    this.closeConfirmVisible = false;
    this.pendingCloseId = null;
    this.mlcService.closeMlcCase(id, notes)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'MLC case closed', life: 3000 });
          this.loadCases();
          this.loadStats();
          this.loadPendingCount();
        },
        error: (err) => {
          console.error('Close failed', err);
          this.messageService.add({ severity: 'error', summary: 'Could not close case', life: 5000 });
        }
      });
  }

  cancelClose(): void {
    this.closeConfirmVisible = false;
    this.pendingCloseId = null;
    this.pendingCloseNotes = '';
  }

  // Sprint 3d: route to Register form.
  goToRegister(): void {
    this.router.navigate(['/mlc/new']);
  }

  // Sprint 3d: row click opens the detail / lifecycle view.
  openDetail(id?: string | number): void {
    if (id == null) return;
    this.router.navigate(['/mlc', id]);
  }

  // Sprint 3d: load the pending-reports count badge.
  loadPendingCount(): void {
    this.mlcService.getPendingReports()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: unknown) => { this.pendingReportsCount = extractCount(res); },
        error: (err) => console.error('Pending count load failed', err)
      });
  }

  refresh(): void {
    this.loadCases();
    this.loadStats();
    this.loadPendingCount();
  }

  getStatusClass(status: string): string {
    const map: { [k: string]: string } = {
      'documented': 'status-info',
      'examination-done': 'status-progress',
      'samples-collected': 'status-progress',
      'report-submitted': 'status-success',
      'closed': 'status-closed'
    };
    return map[status] || 'status-info';
  }
}

// Sprint 3d helper: backend returns `{ data: [...], count: N }` for
// /mlc/pending-reports. Fall back to data.length if `count` is absent.
function extractCount(res: unknown): number {
  if (!res || typeof res !== 'object') return 0;
  const maybe = res as { count?: number; data?: unknown[] };
  if (typeof maybe.count === 'number') return maybe.count;
  if (Array.isArray(maybe.data)) return maybe.data.length;
  return 0;
}
