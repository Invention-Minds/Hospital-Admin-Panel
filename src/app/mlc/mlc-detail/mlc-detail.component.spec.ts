/**
 * Sprint 3d — MlcDetailComponent tests (6).
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { MlcDetailComponent } from './mlc-detail.component';
import { MlcCase, MlcService } from '../../services/mlc.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { HmisSyncIndicatorComponent } from '../../shared/ui/hmis-sync-indicator/hmis-sync-indicator.component';

// `MlcCase.id` is typed `string?` on the frontend interface but the backend
// returns `number`. We stamp mocks with `number` to match runtime; the
// component never narrows on `id` so widening is harmless. Declared as a
// separate type (not `extends Partial<MlcCase>`) to avoid the id variance.
type MlcCaseMock = Omit<Partial<MlcCase>, 'id'> & {
  id?: number | string;
  hmisMlcId?: string | null;
  emergency?: { id?: number; prn?: string; patientName?: string; age?: number };
  firstExaminationDone?: boolean;
  firstExaminationTime?: string | Date;
  submissionDate?: string | Date;
};

class MlcServiceStub {
  getSpy = jasmine.createSpy('getMlcCase').and.returnValue(of({ data: null }));
  examSpy = jasmine.createSpy('recordExamination');
  sampleSpy = jasmine.createSpy('recordSampleCollection');
  reportSpy = jasmine.createSpy('submitFinalReport');

  getMlcCase(id: string): Observable<unknown> { return this.getSpy(id); }
  recordExamination(id: string, body: unknown): Observable<unknown> { return this.examSpy(id, body); }
  recordSampleCollection(id: string, body: unknown): Observable<unknown> { return this.sampleSpy(id, body); }
  submitFinalReport(id: string, body: unknown): Observable<unknown> { return this.reportSpy(id, body); }
}

class PatientLookupStub {
  getDetailsByPRN(): Observable<unknown> { return of({ name: 'Meera Joshi', prn: 'ER-7' }); }
}

describe('MlcDetailComponent', () => {
  let fixture: ComponentFixture<MlcDetailComponent>;
  let component: MlcDetailComponent;
  let mlcService: MlcServiceStub;
  let messageServiceAdd: jasmine.Spy;

  const mlcWithNoHmis: MlcCaseMock = {
    id: 42,
    mlcNo: 'MLC-2026-042',
    caseType: 'accident',
    status: 'documented',
    hmisMlcId: null,
    firstExaminationDone: false,
    emergency: { id: 7, prn: 'ER-7', patientName: 'Meera Joshi' },
    examinerName: null as unknown as string,
    injuries: '',
  };
  const mlcWithHmis: MlcCaseMock = { ...mlcWithNoHmis, hmisMlcId: 'HMIS-MLC-999' };

  beforeEach(async () => {
    mlcService = new MlcServiceStub();
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterTestingModule,
        BrowserAnimationsModule,
        InputTextModule,
      ],
      declarations: [MlcDetailComponent, ConfirmDialogComponent, PageHeaderComponent, HmisSyncIndicatorComponent],
      providers: [
        { provide: MlcService, useValue: mlcService },
        { provide: AppointmentConfirmService, useValue: new PatientLookupStub() },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'id' ? '42' : null) } } },
        },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const ms = TestBed.inject(MessageService);
    messageServiceAdd = spyOn(ms, 'add');

    fixture = TestBed.createComponent(MlcDetailComponent);
    component = fixture.componentInstance;
  });

  it('renders "Sync pending" when hmisMlcId is null', () => {
    mlcService.getSpy.and.returnValue(of({ data: mlcWithNoHmis }));
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const indicator = host.querySelector('[data-testid="sync-indicator"]');
    expect(indicator?.textContent).toContain('Sync pending');
    expect(component.hmisSyncIsSynced).toBe(false);
  });

  it('renders "Synced · HMIS-MLC-xxx" when hmisMlcId is populated', () => {
    mlcService.getSpy.and.returnValue(of({ data: mlcWithHmis }));
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const indicator = host.querySelector('[data-testid="sync-indicator"]');
    expect(indicator?.textContent).toContain('Synced');
    expect(indicator?.textContent).toContain('HMIS-MLC-999');
    expect(component.hmisSyncIsSynced).toBe(true);
  });

  it('sync indicator updates after a lifecycle push (opportunistic backfill)', () => {
    // First load: no HMIS id. Second load (after examination): HMIS id populated.
    mlcService.getSpy.and.returnValues(of({ data: mlcWithNoHmis }), of({ data: mlcWithHmis }));
    mlcService.examSpy.and.returnValue(of({ data: mlcWithHmis }));

    fixture.detectChanges();
    expect(component.hmisSyncIsSynced).toBe(false);

    component.examinationForm.patchValue({ examinerName: 'Dr. A', injuries: 'Abrasion left forearm.' });
    component.submitExamination();

    // Reload after success
    expect(mlcService.getSpy).toHaveBeenCalledTimes(2);
    expect(component.hmisSyncIsSynced).toBe(true);
    expect(component.mlc?.hmisMlcId).toBe('HMIS-MLC-999');
  });

  it('pre-hydrates lifecycle forms with any existing case data', () => {
    const hydrated: MlcCaseMock = {
      ...mlcWithNoHmis,
      examinerName: 'Dr. Jacob',
      injuries: 'Pre-existing injury description.',
      samplesCollected: 'Blood',
      sampleStorageInfo: 'Fridge 4C',
      finalReport: '',
    };
    mlcService.getSpy.and.returnValue(of({ data: hydrated }));

    fixture.detectChanges();
    expect(component.examinationForm.value.examinerName).toBe('Dr. Jacob');
    expect(component.examinationForm.value.injuries).toBe('Pre-existing injury description.');
    expect(component.sampleForm.value.samplesCollected).toBe('Blood');
    expect(component.sampleForm.value.sampleStorageInfo).toBe('Fridge 4C');
    expect(component.reportForm.value.finalReport).toBe('');
  });

  it('Final Report opens ConfirmDialog (warning); confirm calls service', () => {
    mlcService.getSpy.and.returnValues(of({ data: mlcWithNoHmis }), of({ data: { ...mlcWithHmis, status: 'report-submitted' } }));
    mlcService.reportSpy.and.returnValue(of({ data: {} }));

    fixture.detectChanges();
    component.reportForm.patchValue({ finalReport: 'Full report text.', reportSubmittedTo: 'Koramangala PS' });

    component.attemptSubmitReport();
    expect(component.reportConfirmVisible).toBe(true);
    expect(mlcService.reportSpy).not.toHaveBeenCalled();

    component.onReportConfirm();
    expect(mlcService.reportSpy).toHaveBeenCalledTimes(1);
    const [id, body] = mlcService.reportSpy.calls.mostRecent().args;
    expect(id).toBe('42');
    expect(body).toEqual({ finalReport: 'Full report text.', reportSubmittedTo: 'Koramangala PS' });
    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
  });

  it('shows error toast and keeps form values on examination failure', () => {
    mlcService.getSpy.and.returnValue(of({ data: mlcWithNoHmis }));
    mlcService.examSpy.and.returnValue(throwError(() => ({ status: 500, error: { message: 'boom' } })));

    fixture.detectChanges();
    component.examinationForm.patchValue({ examinerName: 'Dr. A', injuries: 'Abrasion' });
    component.submitExamination();

    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'Could not record examination',
    }));
    expect(component.examinationForm.value.examinerName).toBe('Dr. A');
    expect(component.submitting.examination).toBe(false);
  });
});
