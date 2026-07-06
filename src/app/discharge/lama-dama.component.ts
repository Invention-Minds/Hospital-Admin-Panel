import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { LamaDamaService, LamaRecord, DamaRecord } from '../services/lama-dama.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-lama-dama',
  templateUrl: './lama-dama.component.html',
  styleUrls: ['./lama-dama.component.css']
})
export class LamaDamaComponent implements OnInit, OnDestroy {
  activeTab: string = 'lama';
  loading = false;

  lamaRecords: LamaRecord[] = [];
  damaRecords: DamaRecord[] = [];

  stats: any = {
    lamaTotal: 0,
    damaTotal: 0,
    total: 0,
    thisMonth: { lama: 0, dama: 0 }
  };

  compliance: any = null;

  private destroy$ = new Subject<void>();

  constructor(
    private lamaDamaService: LamaDamaService,
    private router: Router,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.loadLama();
    this.loadDama();
    this.loadStats();
    this.loadCompliance();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLama(): void {
    this.loading = true;
    this.lamaDamaService.getAllLamaRecords()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res || [];
          this.lamaRecords = Array.isArray(data) ? data : [];
          this.loading = false;
        },
        error: (err) => {
          console.error('LAMA load failed', err);
          this.loading = false;
        }
      });
  }

  loadDama(): void {
    this.lamaDamaService.getAllDamaRecords()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data = res?.data || res || [];
          this.damaRecords = Array.isArray(data) ? data : [];
        },
        error: (err) => console.error('DAMA load failed', err)
      });
  }

  loadStats(): void {
    this.lamaDamaService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => { this.stats = res?.data || res; },
        error: (err) => console.error('Stats load failed', err)
      });
  }

  loadCompliance(): void {
    this.lamaDamaService.getComplianceReport()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => { this.compliance = res?.data || res; },
        error: (err) => console.error('Compliance load failed', err)
      });
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
  }

  downloadReport(type: 'lama' | 'dama', id?: string): void {
    if (!id) return;
    const obs = type === 'lama'
      ? this.lamaDamaService.generateLamaReport(id)
      : this.lamaDamaService.generateDamaReport(id);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type.toUpperCase()}-Report-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Download failed', err)
    });
  }

  verifyRecord(type: 'lama' | 'dama', id?: string): void {
    if (!id) return;
    // Sprint 3e: replace alert() with MessageService toast.
    this.lamaDamaService.verifyDocumentation(type, id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: unknown) => {
          const data = extractVerifyData(res);
          const issues = data?.issues ?? [];
          // NABH ACC.6 documentation-completeness check: confirms every
          // mandatory element of the AMA record is present. Show the itemised
          // result so the coordinator knows exactly what's complete / missing.
          const required =
            type === 'lama'
              ? ['Patient signature', 'Witness name', 'Witness signature', 'Risk explained to patient', 'Reason for LAMA']
              : ['Patient signature', 'Witness name', 'Witness signature', "Doctor's recommendation"];
          const isMissing = (label: string) =>
            issues.some((i) => i.toLowerCase().includes(label.toLowerCase().split(' ')[0]));
          const rows = required
            .map((label) => {
              const ok = !isMissing(label);
              return `<li style="text-align:left;list-style:none;margin:4px 0">
                ${ok ? '✅' : '❌'} ${label} ${ok ? '' : '<span style="color:#b91c1c">— missing</span>'}
              </li>`;
            })
            .join('');
          Swal.fire({
            icon: data?.compliant ? 'success' : 'warning',
            title: data?.compliant ? 'Documentation complete' : 'Incomplete documentation',
            html: `<p style="margin:0 0 8px">${type.toUpperCase()} ${id} — NABH ACC.6 required elements:</p>
                   <ul style="margin:0;padding:0">${rows}</ul>
                   ${data?.compliant ? '' : '<p style="margin:10px 0 0;color:#b91c1c">Complete the missing items, then verify again.</p>'}`,
            confirmButtonColor: '#1d4ed8',
          });
        },
        error: (err) => {
          console.error('Verify failed', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Could not verify documentation',
            life: 5000,
          });
        },
      });
  }

  // Sprint 3e: Create action — the header can fire either LAMA or DAMA path.
  createRecord(type: 'lama' | 'dama'): void {
    this.router.navigate(['/lama-dama/new'], { queryParams: { type } });
  }

  // Sprint 3e: row click → detail view. Works for either record type.
  openDetail(type: 'lama' | 'dama', id?: string | number): void {
    if (id == null) return;
    this.router.navigate(['/lama-dama', type, id]);
  }

  // Expose records.length tests + template logic without null guards.
  hasLama(): boolean { return (this.lamaRecords?.length ?? 0) > 0; }
  hasDama(): boolean { return (this.damaRecords?.length ?? 0) > 0; }

  // Helpers used by the sync-indicator in each row.
  lamaHmisId(r: LamaRecord): string | null {
    return r.hmisLamaId ?? null;
  }
  damaHmisId(r: DamaRecord): string | null {
    return r.hmisDamaId ?? null;
  }

  refresh(): void {
    this.loadLama();
    this.loadDama();
    this.loadStats();
    this.loadCompliance();
  }
}

// Narrowing helper so verifyRecord's `res` stays non-`any`.
function extractVerifyData(res: unknown): { compliant?: boolean; issues?: string[] } | null {
  if (!res || typeof res !== 'object') return null;
  const maybe = res as { data?: { compliant?: boolean; issues?: string[] }; compliant?: boolean; issues?: string[] };
  return maybe.data ?? maybe;
}
