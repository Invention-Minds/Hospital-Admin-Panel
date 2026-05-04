import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { EmergencyService, EmergencyCase } from '../services/emergency.service';

@Component({
  selector: 'app-emergency-overview',
  templateUrl: './emergency-overview.component.html',
  styleUrls: ['./emergency-overview.component.css']
})
export class EmergencyOverviewComponent implements OnInit, OnDestroy {
  loading = false;
  stats: any = {
    total: 0,
    byStatus: { arrived: 0, stabilized: 0, admittedIpd: 0, lama: 0, dama: 0, discharged: 0 },
    byTriage: { red: 0, yellow: 0, green: 0, black: 0 }
  };
  queue: EmergencyCase[] = [];
  recentCases: EmergencyCase[] = [];

  private destroy$ = new Subject<void>();

  triageSeverity: { [k: string]: string } = {
    red: 'danger', yellow: 'warning', green: 'success', black: 'info'
  };

  constructor(
    private emergencyService: EmergencyService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadStats();
    this.loadQueue();
    this.loadRecent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadStats(): void {
    this.emergencyService.getEmergencyStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.stats = res?.data || res;
        },
        error: (err) => console.error('Stats load failed', err)
      });
  }

  loadQueue(): void {
    this.emergencyService.getEmergencyQueue()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.queue = res?.data || res || [];
        },
        error: (err) => console.error('Queue load failed', err)
      });
  }

  loadRecent(): void {
    this.loading = true;
    this.emergencyService.getAllEmergencyCases()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res || [];
          this.recentCases = Array.isArray(data) ? data.slice(0, 10) : [];
          this.loading = false;
        },
        error: (err) => {
          console.error('Recent cases load failed', err);
          this.loading = false;
        }
      });
  }

  createNewCase(): void {
    this.router.navigate(['/emergency/intake']);
  }

  openQueue(): void {
    this.router.navigate(['/emergency/list']);
  }

  viewCase(id?: string): void {
    if (id) this.router.navigate(['/emergency', id]);
  }

  refresh(): void {
    this.loadStats();
    this.loadQueue();
    this.loadRecent();
  }
}
