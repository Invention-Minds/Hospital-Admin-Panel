/**
 * Sprint 3c — IpdPharmacyComponent tests.
 *
 * Seven tests per the brief:
 *   1. Renders both sections with seeded data
 *   2. Empty state when no carryover
 *   3. Empty state when no active
 *   4. Continue action triggers service + success toast + removes carryover row
 *   5. Modify opens modal, submit calls service, refreshes
 *   6. Discontinue opens ConfirmDialog, confirm calls service
 *   7. Error toast on service failure (Continue path)
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { IpdPharmacyComponent } from './ipd-pharmacy.component';
import {
  CarryoverPrescription,
  IpdPrescription,
  IpdPrescriptionService,
} from '../../services/ipd-prescription.service';
import { IpdService } from '../../services/ipd.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

class IpdPrescriptionServiceStub {
  reviewSpy = jasmine.createSpy('reviewCarryoverPrescriptions').and.returnValue(of({ data: [] }));
  continueSpy = jasmine.createSpy('continuePrescription');
  modifySpy = jasmine.createSpy('modifyPrescription');
  discontinueSpy = jasmine.createSpy('discontinuePrescription');
  getActiveSpy = jasmine.createSpy('getAdmissionPrescriptions').and.returnValue(of({ data: [] }));

  reviewCarryoverPrescriptions(id: string): Observable<CarryoverPrescription[]> { return this.reviewSpy(id); }
  continuePrescription(id: string, body: IpdPrescription): Observable<unknown> { return this.continueSpy(id, body); }
  modifyPrescription(pid: string, body: unknown): Observable<unknown> { return this.modifySpy(pid, body); }
  discontinuePrescription(pid: string, reason?: string): Observable<unknown> { return this.discontinueSpy(pid, reason); }
  getAdmissionPrescriptions(id: string): Observable<IpdPrescription[]> { return this.getActiveSpy(id); }
}

class IpdServiceStub {
  getAdmission(): Observable<unknown> { return of({ prn: 9900001 }); }
}
class PatientLookupStub {
  getDetailsByPRN(): Observable<unknown> { return of({ name: 'Ravi Kumar', prn: 9900001 }); }
}

describe('IpdPharmacyComponent', () => {
  let fixture: ComponentFixture<IpdPharmacyComponent>;
  let component: IpdPharmacyComponent;
  let rxService: IpdPrescriptionServiceStub;
  let messageServiceAdd: jasmine.Spy;

  const carryoverFixture: CarryoverPrescription[] = [
    {
      prescriptionId: 'PRE-100',
      prescribedBy: 'Dr. Jacob Ryan',
      prescribedDate: '2026-04-15',
      patientName: 'Ravi Kumar',
      tablets: [
        { id: 1, genericName: 'Amoxicillin', brandName: 'Mox', frequency: 'q8h', duration: '5 days', route: 'oral', quantity: 15, instructions: 'After food' },
      ],
    },
  ];
  const activeFixture: IpdPrescription[] = [
    {
      id: 'rx-1',
      admissionId: 'adm-42',
      prescribedBy: 'Dr. Jacob Ryan',
      genericName: 'Ceftriaxone',
      brandName: 'Rocephin',
      dose: '1 g',
      frequency: 'q12h',
      duration: '5 days',
      route: 'iv',
      quantity: 10,
      isCarryOver: false,
      adminStatus: 'pending',
      status: 'active',
    },
  ];

  beforeEach(async () => {
    rxService = new IpdPrescriptionServiceStub();

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterTestingModule,
        BrowserAnimationsModule,
        DialogModule,
        InputTextModule,
      ],
      declarations: [
        IpdPharmacyComponent,
        ConfirmDialogComponent,
        EmptyStateComponent,
        PageHeaderComponent,
      ],
      providers: [
        { provide: IpdPrescriptionService, useValue: rxService },
        { provide: IpdService, useValue: new IpdServiceStub() },
        { provide: AppointmentConfirmService, useValue: new PatientLookupStub() },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'admissionId' ? 'adm-42' : null) } } },
        },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const ms = TestBed.inject(MessageService);
    messageServiceAdd = spyOn(ms, 'add');

    fixture = TestBed.createComponent(IpdPharmacyComponent);
    component = fixture.componentInstance;
  });

  it('renders both sections with seeded data', () => {
    rxService.reviewSpy.and.returnValue(of({ data: carryoverFixture }));
    rxService.getActiveSpy.and.returnValue(of({ data: activeFixture }));

    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('[data-testid="carryover-rows"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="active-rows"]')).not.toBeNull();
    expect(host.querySelectorAll('[data-testid^="carryover-row-"]').length).toBe(1);
    expect(host.querySelectorAll('[data-testid^="active-row-"]').length).toBe(1);
  });

  it('shows empty state when no carryover prescriptions', () => {
    rxService.reviewSpy.and.returnValue(of({ data: [] }));
    rxService.getActiveSpy.and.returnValue(of({ data: activeFixture }));

    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('[data-testid="carryover-empty"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="carryover-rows"]')).toBeNull();
  });

  it('shows empty state when no active IPD prescriptions', () => {
    rxService.reviewSpy.and.returnValue(of({ data: carryoverFixture }));
    rxService.getActiveSpy.and.returnValue(of({ data: [] }));

    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('[data-testid="active-empty"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="active-rows"]')).toBeNull();
  });

  it('Continue calls service with flattened tablet payload, removes carryover row, refreshes active, shows success toast', () => {
    rxService.reviewSpy.and.returnValue(of({ data: carryoverFixture }));
    rxService.getActiveSpy.and.returnValues(of({ data: [] }), of({ data: activeFixture }));
    rxService.continueSpy.and.returnValue(of({ data: { id: 'rx-new' } }));

    fixture.detectChanges();
    const row = component.carryoverRows[0];
    component.continueCarryover(row);

    const [admissionId, payload] = rxService.continueSpy.calls.mostRecent().args;
    expect(admissionId).toBe('adm-42');
    expect(payload).toEqual(jasmine.objectContaining({
      admissionId: 'adm-42',
      prescriptionId: 'PRE-100',
      genericName: 'Amoxicillin',
      frequency: 'q8h',
      route: 'oral',
      quantity: 15,
      isCarryOver: true,
      status: 'active',
    }));
    expect(component.carryoverRows.length).toBe(0);
    expect(rxService.getActiveSpy).toHaveBeenCalledTimes(2); // initial + reload
    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
  });

  it('Modify opens modal; submit calls service with dose/freq/duration/route/instructions', () => {
    rxService.reviewSpy.and.returnValue(of({ data: [] }));
    rxService.getActiveSpy.and.returnValue(of({ data: activeFixture }));
    rxService.modifySpy.and.returnValue(of({ data: {} }));

    fixture.detectChanges();
    component.openModify(activeFixture[0]);
    expect(component.modifyModalVisible).toBe(true);

    component.modifyForm.patchValue({
      dose: '2 g',
      frequency: 'q8h',
      duration: '7 days',
      route: 'iv',
      instructions: 'Infuse over 30 min',
    });
    component.submitModify();

    const [pid, body] = rxService.modifySpy.calls.mostRecent().args;
    expect(pid).toBe('rx-1');
    expect(body).toEqual({
      dose: '2 g',
      frequency: 'q8h',
      duration: '7 days',
      route: 'iv',
      instructions: 'Infuse over 30 min',
    });
    expect(component.modifyModalVisible).toBe(false);
    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success', summary: 'Prescription modified' }));
  });

  it('Discontinue opens confirm dialog; on confirm calls service with reason', () => {
    rxService.reviewSpy.and.returnValue(of({ data: [] }));
    rxService.getActiveSpy.and.returnValue(of({ data: activeFixture }));
    rxService.discontinueSpy.and.returnValue(of({ data: {} }));

    fixture.detectChanges();
    component.attemptDiscontinue(activeFixture[0]);
    expect(component.discontinueConfirmVisible).toBe(true);

    component.discontinueReason = 'Adverse reaction';
    component.confirmDiscontinue();

    const [pid, reason] = rxService.discontinueSpy.calls.mostRecent().args;
    expect(pid).toBe('rx-1');
    expect(reason).toBe('Adverse reaction');
    expect(component.discontinueConfirmVisible).toBe(false);
    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
  });

  it('shows an error toast when Continue fails; carryover row is NOT removed', () => {
    rxService.reviewSpy.and.returnValue(of({ data: carryoverFixture }));
    rxService.getActiveSpy.and.returnValue(of({ data: [] }));
    rxService.continueSpy.and.returnValue(throwError(() => ({ status: 500, error: { message: 'boom' } })));

    fixture.detectChanges();
    const row = component.carryoverRows[0];
    component.continueCarryover(row);

    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'Could not continue prescription',
    }));
    expect(component.carryoverRows.length).toBe(1); // still present for retry
    expect(component.continuingKey).toBeNull(); // button re-enabled
  });
});
