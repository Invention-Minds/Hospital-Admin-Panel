import { Component, OnInit, OnDestroy } from '@angular/core';
import { EmergencyService, EmergencyCase } from '../../services/emergency.service';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  AdmitContext,
  AdmittedEvent,
} from '../../shared/ui/admit-to-ipd-modal/admit-to-ipd-modal.component';

@Component({
  selector: 'app-emergency-list',
  templateUrl: './emergency-list.component.html',
  styleUrls: ['./emergency-list.component.css']
})
export class EmergencyListComponent implements OnInit, OnDestroy {
  emergencyCases: EmergencyCase[] = [];
  filteredCases: EmergencyCase[] = [];
  loading = false;
  selectedCases: EmergencyCase[] = [];

  // Search + manual pagination (matches the confirmed-appointment table pattern).
  searchValue = '';
  currentPage = 1;
  pageSize = 10;

  // Sprint 3f — Admit-to-IPD modal wiring.
  admitModalVisible = false;
  admitContext: AdmitContext | null = null;

  private destroy$ = new Subject<void>();

  triageSeverity: { [key: string]: 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' } = {
    'red': 'danger',
    'yellow': 'warning',
    'green': 'success',
    'black': 'info'
  };

  triageLabels: { [key: string]: string } = {
    'red': 'Critical',
    'yellow': 'Urgent',
    'green': 'Stable',
    'black': 'Deceased'
  };

  statusOptions = [
    { label: 'Arrived', value: 'arrived' },
    { label: 'Stabilized', value: 'stabilized' },
    { label: 'Referred', value: 'referred' },
    { label: 'Admitted to IPD', value: 'admitted-ipd' },
    { label: 'Shifted to OT', value: 'shifted-ot' },
    { label: 'LAMA', value: 'LAMA' },
    { label: 'DAMA', value: 'DAMA' },
    { label: 'Discharged', value: 'discharged' },
    { label: 'Expired', value: 'expired' }
  ];

  cols = [
    { field: 'prn', header: 'PRN', width: '10%' },
    { field: 'triageCategory', header: 'Triage', width: '10%' },
    { field: 'presentingComplaint', header: 'Complaint', width: '25%' },
    { field: 'vitalsBP', header: 'BP', width: '10%' },
    { field: 'vitalsHR', header: 'HR', width: '8%' },
    { field: 'status', header: 'Status', width: '12%' },
    { field: 'createdAt', header: 'Time', width: '15%' },
    { field: 'actions', header: 'Actions', width: '10%' }
  ];

  constructor(
    private emergencyService: EmergencyService,
    private messageService: MessageService,
    private router: Router
  ) { }

  // ER Nurse (sub_admin) can view the queue and open cases but must not make
  // clinical decisions — hide status-change + Convert-to-IPD for them.
  get isErNurse(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return localStorage.getItem('role') === 'sub_admin'
      && localStorage.getItem('subAdminType') === 'ER Nurse';
  }

  ngOnInit(): void {
    this.loadEmergencyCases();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEmergencyCases(): void {
    this.loading = true;
    this.emergencyService.getAllEmergencyCases()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cases) => {
          this.emergencyCases = cases;
          this.applyFilter();
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load emergency cases'
          });
          console.error(error);
        },
        complete: () => {
          this.loading = false;
        }
      });
  }

  // ─── Search + pagination ────────────────────────────────────────────────
  applyFilter(): void {
    const q = (this.searchValue || '').trim().toLowerCase();
    this.filteredCases = !q
      ? [...this.emergencyCases]
      : this.emergencyCases.filter((c) =>
          (c.prn || '').toLowerCase().includes(q) ||
          (c.status || '').toLowerCase().includes(q) ||
          (c.triageCategory || '').toLowerCase().includes(q) ||
          (this.getTriageLabel(c.triageCategory) || '').toLowerCase().includes(q) ||
          (c.presentingComplaint || '').toLowerCase().includes(q),
        );
    const pages = this.totalPages;
    if (this.currentPage > pages) this.currentPage = pages || 1;
  }

  onSearch(): void {
    this.currentPage = 1;
    this.applyFilter();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredCases.length / this.pageSize);
  }

  getPaginatedCases(): EmergencyCase[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCases.slice(start, start + this.pageSize);
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  onPageChange(): void {
    if (this.currentPage < 1) this.currentPage = 1;
    else if (this.currentPage > this.totalPages) this.currentPage = this.totalPages || 1;
  }

  viewCase(caseId: string): void {
    this.router.navigate([`/emergency/${caseId}`]);
  }

  editCase(caseId: string): void {
    // No /edit route exists; the detail page is where a case is managed.
    this.router.navigate([`/emergency/${caseId}`]);
  }

  updateStatus(emergencyCase: EmergencyCase, newStatus: string): void {
    this.emergencyService.updateEmergencyCaseStatus(emergencyCase.id!, newStatus)
      .subscribe({
        next: () => {
          emergencyCase.status = newStatus;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Emergency case status updated'
          });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update emergency case status'
          });
        }
      });
  }

  convertToIPD(caseId: string): void {
    // Sprint 3f — replace the dead navigation with the shared admit modal.
    const row = this.emergencyCases.find((c) => c.id === caseId);
    this.admitContext = {
      sourceId: caseId,
      prn: row?.prn ?? null,
      patientName: null,
      referringDoctor: 'Emergency Department',
      summary: row?.presentingComplaint ?? null,
      suggestedAdmissionType: 'emergency',
      suggestedRoomType: row?.triageCategory === 'red' ? 'ICU' : 'general',
    };
    this.admitModalVisible = true;
  }

  onAdmittedToIpd(_event: AdmittedEvent): void {
    this.admitModalVisible = false;
    this.loadEmergencyCases(); // refresh status badge (row flips to admitted-ipd)
  }

  getTriageClass(category: string): string {
    return `status-${category}`;
  }

  getTriageLabel(category: string): string {
    return this.triageLabels[category] || category;
  }

  formatDate(date?: Date | string): string {
    return date ? new Date(date).toLocaleString() : '-';
  }
}
