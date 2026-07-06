import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IpdService, IpdAdmission } from '../services/ipd.service';
import { DoctorServiceService } from '../services/doctor-details/doctor-service.service';
import { NursingStationService, NursingStationRow, StationWardRef } from '../services/nursing-station.service';

@Component({
  selector: 'app-ipd-overview',
  templateUrl: './ipd-overview.component.html',
  styleUrls: ['./ipd-overview.component.css']
})
export class IpdOverviewComponent implements OnInit, OnDestroy {
  activeComponent: string = 'treatment';
  loading = false;

  stats: any = {
    total: 0,
    byStatus: { admitted: 0, discharged: 0, lama: 0, dama: 0, expired: 0, transferred: 0 },
    byType: { elective: 0, emergency: 0, direct: 0 },
    averageLengthOfStay: 0
  };

  admissions: IpdAdmission[] = [];
  wards: any[] = [];
  bedCensus: any[] = [];

  // When a doctor opens this page, scope Active Admissions + Discharges to their
  // own patients. Match is by name — IpdAdmission stores `admittingDoctor` as a
  // name string (no admittingDoctorId on the model).
  isDoctor = false;
  doctorName = '';
  private allAdmissions: IpdAdmission[] = [];

  // NS — Active Admissions filter by nursing station + ward. Stations drive the
  // ward dropdown (selecting a station limits wards to that station's wards).
  stations: NursingStationRow[] = [];
  selectedStationId = '';
  selectedWardId = '';

  // Phase 9.15 — Discharges tab
  discharges: IpdAdmission[] = [];
  dischargesLoaded = false;
  dischargeSearch = '';
  dischargeFrom = '';
  dischargeTo = '';

  private destroy$ = new Subject<void>();

  constructor(
    private ipdService: IpdService,
    private router: Router,
    private doctorService: DoctorServiceService,
    private stationSvc: NursingStationService
  ) { }

  ngOnInit(): void {
    this.resolveDoctorScope();
    this.loadStats();
    this.loadActiveAdmissions();
    this.loadBedCensus();
    this.loadStations();
  }

  /** Nursing stations for the admissions filter. A privileged user (super_admin
   *  / Nursing Superintendent) sees every IPD station; a scoped nurse sees only
   *  the station(s) actually allotted to them. */
  loadStations(): void {
    const role = (typeof window !== 'undefined' && localStorage.getItem('role')) || '';
    const sub = (typeof window !== 'undefined' && localStorage.getItem('subAdminType')) || '';
    const privileged = role === 'super_admin' || sub === 'Nursing Superintendent';
    const source$ = privileged ? this.stationSvc.list() : this.stationSvc.listMine();
    source$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => { this.stations = (res.data || []).filter((s) => s.type !== 'OPD'); },
        error: () => { /* filter is optional — leave empty on failure */ },
      });
  }

  /** Wards of the currently-selected station (drives the ward dropdown). */
  get selectedStationWards(): StationWardRef[] {
    const s = this.stations.find((x) => x.id === this.selectedStationId);
    return s ? s.wards : [];
  }

  onStationChange(): void {
    // Reset the ward when the station changes so a stale ward isn't applied.
    this.selectedWardId = '';
    this.applyFilters();
  }

  onWardChange(): void {
    this.applyFilters();
  }

  /** If a doctor is viewing, resolve their name so we can filter to their patients. */
  private resolveDoctorScope(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    this.isDoctor = (localStorage.getItem('role') || '') === 'doctor';
    if (!this.isDoctor) return;
    // Doctors land on their own admissions, not the hospital-wide watchboard.
    this.activeComponent = 'admissions';
    const userId = Number(localStorage.getItem('userid') || '0');
    if (!userId) return;
    this.doctorService.getDoctorByUserId(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (doc: any) => { this.doctorName = doc?.name ?? ''; this.applyFilters(); },
        error: () => { /* leave unfiltered on lookup failure */ },
      });
  }

  /** Re-derive the visible admissions list from the raw list + doctor scope +
   *  the nursing-station / ward filter. */
  private applyFilters(): void {
    let list = this.allAdmissions;

    // Doctor scope — doctors only see their own admitted patients.
    if (this.isDoctor && this.doctorName) {
      const n = this.doctorName.trim().toLowerCase();
      list = list.filter((a) => (a.admittingDoctor || '').trim().toLowerCase() === n);
    }

    // Ward filter wins; otherwise fall back to the whole selected station.
    if (this.selectedWardId) {
      list = list.filter((a) => a.wardId === this.selectedWardId);
    } else if (this.selectedStationId) {
      const wardIds = new Set(this.selectedStationWards.map((w) => w.id));
      list = list.filter((a) => !!a.wardId && wardIds.has(a.wardId));
    }

    this.admissions = list;
  }

  /**
   * Bed census scoped to the doctor — only the wards where they currently have
   * admitted patients. Hospital-wide for everyone else.
   */
  get visibleBedCensus(): any[] {
    if (!this.isDoctor || !this.doctorName) return this.bedCensus;
    const n = this.doctorName.trim().toLowerCase();
    const myWards = new Set(
      this.allAdmissions
        .filter((a) => (a.admittingDoctor || '').trim().toLowerCase() === n)
        .map((a) => (a.ward?.wardName || '').trim().toLowerCase())
        .filter(Boolean),
    );
    return this.bedCensus.filter((w) => myWards.has((w.wardName || '').trim().toLowerCase()));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStats(): void {
    this.ipdService.getIPDStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => { this.stats = res?.data || res; },
        error: (err) => console.error('IPD stats failed', err)
      });
  }

  loadActiveAdmissions(): void {
    this.loading = true;
    this.ipdService.getActiveAdmissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res || [];
          this.allAdmissions = Array.isArray(data) ? data : [];
          this.applyFilters();
          this.loading = false;
        },
        error: (err) => {
          console.error('Admissions load failed', err);
          this.loading = false;
        }
      });
  }

  loadBedCensus(): void {
    this.ipdService.getBedCensus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res || [];
          this.bedCensus = Array.isArray(data) ? data : [];
        },
        error: (err) => console.error('Bed census failed', err)
      });
  }

  showAdmissions(): void { this.activeComponent = 'admissions'; }
  showBedManagement(): void { this.activeComponent = 'beds'; }
  showTreatment(): void { this.activeComponent = 'treatment'; }
  showDischarges(): void {
    this.activeComponent = 'discharges';
    if (!this.dischargesLoaded) this.loadDischarges();
  }

  // ─── Phase 9.15 — Discharges ─────────────────────────────────────────

  loadDischarges(): void {
    this.loading = true;
    this.ipdService.getDischargedAdmissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res || [];
          this.discharges = Array.isArray(data) ? data : [];
          this.dischargesLoaded = true;
          this.loading = false;
        },
        error: (err) => { console.error('Discharges load failed', err); this.loading = false; },
      });
  }

  get filteredDischarges(): IpdAdmission[] {
    const q = this.dischargeSearch.trim().toLowerCase();
    const from = this.dischargeFrom ? new Date(this.dischargeFrom).getTime() : null;
    const to = this.dischargeTo ? new Date(this.dischargeTo).getTime() + 86_399_000 : null;
    const docName = this.isDoctor && this.doctorName ? this.doctorName.trim().toLowerCase() : null;
    return this.discharges
      .filter((a) => {
        if (docName && (a.admittingDoctor || '').trim().toLowerCase() !== docName) return false;
        const dd = a.discharge?.dischargeDate ? new Date(a.discharge.dischargeDate).getTime() : null;
        if (from && (dd == null || dd < from)) return false;
        if (to && (dd == null || dd > to)) return false;
        if (q && !`${a.admissionNo ?? ''} ${a.prn ?? ''} ${a.admittingDoctor ?? ''}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const da = a.discharge?.dischargeDate ? new Date(a.discharge.dischargeDate).getTime() : 0;
        const db = b.discharge?.dischargeDate ? new Date(b.discharge.dischargeDate).getTime() : 0;
        return db - da;
      });
  }

  /** Open the assembled, printable full discharge summary (paper layout). */
  printDischarge(id?: string): void {
    if (id) this.router.navigate(['/ipd/admission', id, 'discharge-summary']);
  }

  /** Export the filtered discharge list as CSV (a discharge register). */
  exportDischarges(): void {
    if (typeof document === 'undefined') return;
    const rows = this.filteredDischarges;
    const header = ['Admission No', 'PRN', 'Discharge Date', 'Type', 'Condition', 'Consultant', 'Ward', 'Summary Status'];
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [header.map(esc).join(',')];
    for (const a of rows) {
      lines.push([
        a.admissionNo, a.prn,
        a.discharge?.dischargeDate ? new Date(a.discharge.dischargeDate).toLocaleString() : '',
        a.discharge?.dischargeType ?? '',
        a.discharge?.conditionAtDischarge ?? '',
        a.admittingDoctor, a.ward?.wardName ?? '',
        a.discharge?.summaryStatus ?? '',
      ].map(esc).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `discharges-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  newAdmission(): void {
    this.router.navigate(['/ipd/admission']);
  }

  viewAdmission(id?: string): void {
    // No standalone /ipd/admission/:id detail route exists; the daily-work
    // entry point for an admission is the progress-note page. From there the
    // user has nav links to discharge / pharmacy / MAR.
    if (id) this.router.navigate(['/ipd/admission', id, 'progress-note']);
  }

  refresh(): void {
    this.loadStats();
    this.loadActiveAdmissions();
    this.loadBedCensus();
  }

  getOccupancyClass(rate: number): string {
    if (rate >= 90) return 'high';
    if (rate >= 70) return 'medium';
    return 'low';
  }

  /**
   * Derived patient severity for the admissions table colour code.
   * No explicit severity column exists on IpdAdmission, so it's inferred
   * from acuity proxies already on the row:
   *   critical — currently in ICU, or an ICU room
   *   moderate — HDU room, or an emergency admission
   *   stable   — everything else
   */
  severityOf(a: IpdAdmission): 'critical' | 'moderate' | 'stable' {
    const inIcu = !!(a.icuAdmittedAt && !a.icuDischargedAt);
    if (inIcu || a.roomType === 'ICU') return 'critical';
    if (a.roomType === 'HDU' || a.admissionType === 'emergency') return 'moderate';
    return 'stable';
  }

  severityLabel(a: IpdAdmission): string {
    const s = this.severityOf(a);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
