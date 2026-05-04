import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import {
  DamaRecord,
  LamaDamaService,
  LamaRecord,
} from '../../services/lama-dama.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';

/**
 * Sprint 3e — combined LAMA / DAMA detail view.
 *
 * Route: /lama-dama/:type/:id  (type ∈ 'lama' | 'dama')
 *
 * Renders the record as read-only summary + HmisSyncIndicator. Edit mode
 * reveals text-field inputs inline; Save calls the matching update endpoint.
 *
 * The edit flow's primary purpose (beyond occasional clinical edits) is to
 * surface Sprint 2f's opportunistic HMIS backfill: if the create-time push
 * failed (null hmisLamaId/hmisDamaId), a subsequent update can succeed and
 * the indicator flips from "Sync pending" to "Synced".
 */
export type LamaDamaType = 'lama' | 'dama';
type AnyRecord = LamaRecord | DamaRecord;

interface PatientMini {
  name?: string;
  prn?: number | string;
}

interface LamaEditFormValue {
  doctorAdvice: string;
  reasonForLama: string;
  witnessName: string;
  witnessSignature: string;
  patientSignature: string;
}
interface DamaEditFormValue {
  doctorRecommendation: string;
  followUpAdvice: string;
  witnessName: string;
  witnessSignature: string;
  patientSignature: string;
}

interface RecordWithEmergency {
  emergency?: { id?: number; prn?: string; patientName?: string };
}

@Component({
  selector: 'app-lama-dama-detail',
  templateUrl: './lama-dama-detail.component.html',
  styleUrls: ['./lama-dama-detail.component.css'],
})
export class LamaDamaDetailComponent implements OnInit, OnDestroy {
  type: LamaDamaType = 'lama';
  id = '';
  record: AnyRecord | null = null;
  patient: PatientMini | null = null;

  loading = false;
  editing = false;
  submitting = false;

  editForm: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private lamaDamaService: LamaDamaService,
    private patientLookup: AppointmentConfirmService,
    private messageService: MessageService
  ) {
    // Form shape is type-discriminated — we re-build once the route param is known.
    this.editForm = this.fb.group({
      doctorAdvice: [''],
      reasonForLama: [''],
      doctorRecommendation: [''],
      followUpAdvice: [''],
      witnessName: ['', [Validators.required]],
      witnessSignature: [''],
      patientSignature: [''],
    });
  }

  ngOnInit(): void {
    const typeParam = this.route.snapshot.paramMap.get('type');
    this.type = typeParam === 'dama' ? 'dama' : 'lama';
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.id) this.loadRecord();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---- Display helpers ----------------------------------------------------

  get hmisId(): string | null {
    if (!this.record) return null;
    return this.type === 'lama'
      ? (this.record as LamaRecord).hmisLamaId ?? null
      : (this.record as DamaRecord).hmisDamaId ?? null;
  }

  get hmisPrefix(): string {
    return this.type === 'lama' ? 'HMIS-LAMA' : 'HMIS-DAMA';
  }

  get timestamp(): Date | string | null | undefined {
    if (!this.record) return null;
    return this.type === 'lama'
      ? (this.record as LamaRecord).lamaTime
      : (this.record as DamaRecord).dischargeTime;
  }

  get typeLabel(): string {
    return this.type === 'lama' ? 'LAMA' : 'DAMA';
  }

  asLama(r: AnyRecord | null): LamaRecord | null {
    return this.type === 'lama' && r ? (r as LamaRecord) : null;
  }
  asDama(r: AnyRecord | null): DamaRecord | null {
    return this.type === 'dama' && r ? (r as DamaRecord) : null;
  }

  // ---- Data loading -------------------------------------------------------

  loadRecord(): void {
    this.loading = true;
    const req$: Observable<unknown> =
      this.type === 'lama'
        ? this.lamaDamaService.getLamaRecord(this.id)
        : this.lamaDamaService.getDamaRecord(this.id);

    req$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: unknown) => {
          this.record = extractRecord(res);
          this.loading = false;
          this.hydrateEditForm();
          const prn = extractPrnFromRecord(this.record);
          if (prn) this.loadPatient(prn);
        },
        error: (err: unknown) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: `Could not load ${this.typeLabel} record`,
            detail: toErrorMessage(err),
            life: 6000,
          });
        },
      });
  }

  private loadPatient(prn: string | number): void {
    this.patientLookup
      .getDetailsByPRN(String(prn))
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))
      )
      .subscribe((res) => {
        this.patient = extractPatient(res, prn);
      });
  }

  private hydrateEditForm(): void {
    if (!this.record) return;
    if (this.type === 'lama') {
      const r = this.record as LamaRecord;
      this.editForm.patchValue({
        doctorAdvice: r.doctorAdvice ?? '',
        reasonForLama: r.reasonForLama ?? '',
        witnessName: r.witnessName ?? '',
        witnessSignature: r.witnessSignature ?? '',
        patientSignature: r.patientSignature ?? '',
      });
    } else {
      const r = this.record as DamaRecord;
      this.editForm.patchValue({
        doctorRecommendation: r.doctorRecommendation ?? '',
        followUpAdvice: r.followUpAdvice ?? '',
        witnessName: r.witnessName ?? '',
        witnessSignature: r.witnessSignature ?? '',
        patientSignature: r.patientSignature ?? '',
      });
    }
  }

  // ---- Edit flow ----------------------------------------------------------

  enterEdit(): void {
    this.editing = true;
  }

  cancelEdit(): void {
    this.editing = false;
    this.hydrateEditForm(); // revert local changes
  }

  saveEdit(): void {
    if (this.editForm.invalid || !this.id) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.submitting = true;
    const raw = this.editForm.value as LamaEditFormValue & DamaEditFormValue;

    if (this.type === 'lama') {
      const patch: Partial<LamaRecord> = {
        doctorAdvice: raw.doctorAdvice.trim(),
        reasonForLama: raw.reasonForLama.trim(),
        witnessName: raw.witnessName.trim() || undefined,
        witnessSignature: raw.witnessSignature.trim() || undefined,
        patientSignature: raw.patientSignature.trim() || undefined,
      };
      this.lamaDamaService
        .updateLamaRecord(this.id, patch)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.onUpdateSuccess(),
          error: (err) => this.onUpdateError(err),
        });
      return;
    }

    const patch: Partial<DamaRecord> = {
      doctorRecommendation: raw.doctorRecommendation.trim(),
      followUpAdvice: raw.followUpAdvice.trim() || undefined,
      witnessName: raw.witnessName.trim() || undefined,
      witnessSignature: raw.witnessSignature.trim() || undefined,
      patientSignature: raw.patientSignature.trim() || undefined,
    };
    this.lamaDamaService
      .updateDamaRecord(this.id, patch)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.onUpdateSuccess(),
        error: (err) => this.onUpdateError(err),
      });
  }

  private onUpdateSuccess(): void {
    this.submitting = false;
    this.editing = false;
    this.messageService.add({
      severity: 'success',
      summary: `${this.typeLabel} record updated`,
      life: 3000,
    });
    this.loadRecord(); // reload surfaces any opportunistic-backfilled hmis id
  }

  private onUpdateError(err: unknown): void {
    this.submitting = false;
    // Keep editing=true so form values survive for retry.
    this.messageService.add({
      severity: 'error',
      summary: `Could not update ${this.typeLabel} record`,
      detail: toErrorMessage(err),
      life: 6000,
    });
  }
}

// ---- Typed helpers -------------------------------------------------------

function extractRecord(res: unknown): AnyRecord | null {
  if (!res || typeof res !== 'object') return null;
  if ('data' in res) {
    const data = (res as { data: unknown }).data;
    return (data as AnyRecord) ?? null;
  }
  return res as AnyRecord;
}

function extractPrnFromRecord(r: AnyRecord | null): string | number | null {
  if (!r) return null;
  const withEmergency = r as RecordWithEmergency;
  const prn = withEmergency.emergency?.prn;
  if (typeof prn === 'string' || typeof prn === 'number') return prn;
  return null;
}

function extractPatient(res: unknown, fallbackPrn: string | number): PatientMini {
  if (!res || typeof res !== 'object') return { prn: fallbackPrn };
  const maybe = res as {
    data?: { name?: string; prn?: number | string };
    name?: string;
    prn?: number | string;
  };
  const data = maybe.data ?? maybe;
  return {
    name: typeof data.name === 'string' ? data.name : undefined,
    prn: data.prn ?? fallbackPrn,
  };
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const maybe = err as { error?: { message?: string }; message?: string };
    return maybe.error?.message ?? maybe.message ?? 'Unknown error';
  }
  return 'Unknown error';
}
