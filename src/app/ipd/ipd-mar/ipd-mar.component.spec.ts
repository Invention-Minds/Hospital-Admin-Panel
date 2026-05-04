/**
 * Sprint 3c — IpdMarComponent tests.
 *
 * Six tests per the brief:
 *   1. Renders pending + administered sections with data
 *   2. Empty state when no pending
 *   3. Empty state when no administered
 *   4. Administer opens modal pre-filled from prescription
 *   5. Administer submit calls service + success toast, reloads both sections
 *   6. Error toast on administer failure, modal stays open
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

import { IpdMarComponent } from './ipd-mar.component';
import {
  IpdPrescription,
  IpdPrescriptionService,
  MarLogEntry,
  MedicationAdminLog,
} from '../../services/ipd-prescription.service';
import { IpdService } from '../../services/ipd.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

class IpdPrescriptionServiceStub {
  pendingSpy = jasmine.createSpy('getPendingMedications').and.returnValue(of({ data: [] }));
  marSpy = jasmine.createSpy('getMedicationAdministrationRecord').and.returnValue(of({ data: [] }));
  administerSpy = jasmine.createSpy('administerMedication');

  getPendingMedications(id: string): Observable<IpdPrescription[]> { return this.pendingSpy(id); }
  getMedicationAdministrationRecord(id: string): Observable<MarLogEntry[]> { return this.marSpy(id); }
  administerMedication(pid: string, log: MedicationAdminLog): Observable<unknown> { return this.administerSpy(pid, log); }
}

class IpdServiceStub {
  getAdmission(): Observable<unknown> { return of({ prn: 9900001 }); }
}
class PatientLookupStub {
  getDetailsByPRN(): Observable<unknown> { return of({ name: 'Ravi Kumar', prn: 9900001 }); }
}

describe('IpdMarComponent', () => {
  let fixture: ComponentFixture<IpdMarComponent>;
  let component: IpdMarComponent;
  let rxService: IpdPrescriptionServiceStub;
  let messageServiceAdd: jasmine.Spy;

  const pendingFixture: IpdPrescription[] = [
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
      quantity: 1,
      isCarryOver: false,
      adminStatus: 'pending',
      status: 'active',
    },
  ];

  const marFixture: MarLogEntry[] = [
    {
      id: 'log-1',
      prescriptionId: 'rx-1',
      admissionId: 'adm-42',
      administeredAt: '2026-04-19T10:00:00Z',
      administeredBy: 'Nurse Kavya',
      quantity: 1,
      route: 'iv',
      remarks: null,
      createdAt: '2026-04-19T10:00:00Z',
      prescription: { id: 'rx-1', genericName: 'Ceftriaxone', brandName: 'Rocephin', frequency: 'q12h', route: 'iv' },
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
      declarations: [IpdMarComponent, EmptyStateComponent, PageHeaderComponent],
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

    fixture = TestBed.createComponent(IpdMarComponent);
    component = fixture.componentInstance;
  });

  it('renders pending + administered sections with data', () => {
    rxService.pendingSpy.and.returnValue(of({ data: pendingFixture }));
    rxService.marSpy.and.returnValue(of({ data: marFixture }));

    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('[data-testid="pending-rows"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="administered-rows"]')).not.toBeNull();
    expect(host.querySelectorAll('[data-testid^="pending-row-"]').length).toBe(1);
    expect(host.querySelectorAll('[data-testid^="administered-row-"]').length).toBe(1);
  });

  it('shows empty state when no pending medications', () => {
    rxService.pendingSpy.and.returnValue(of({ data: [] }));
    rxService.marSpy.and.returnValue(of({ data: marFixture }));

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="pending-empty"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="pending-rows"]')).toBeNull();
  });

  it('shows empty state when no administered logs', () => {
    rxService.pendingSpy.and.returnValue(of({ data: pendingFixture }));
    rxService.marSpy.and.returnValue(of({ data: [] }));

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="administered-empty"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="administered-rows"]')).toBeNull();
  });

  it('Administer opens modal pre-filled with prescription quantity and route', () => {
    rxService.pendingSpy.and.returnValue(of({ data: pendingFixture }));
    rxService.marSpy.and.returnValue(of({ data: [] }));

    fixture.detectChanges();
    component.openAdminister(pendingFixture[0]);

    expect(component.administerModalVisible).toBe(true);
    expect(component.administerForm.value).toEqual({
      quantity: 1,
      route: 'iv',
      remarks: '',
    });
  });

  it('Administer submit calls service with payload + success toast + reloads both sections', () => {
    rxService.pendingSpy.and.returnValues(of({ data: pendingFixture }), of({ data: [] }));
    rxService.marSpy.and.returnValues(of({ data: [] }), of({ data: marFixture }));
    rxService.administerSpy.and.returnValue(of({ data: {} }));

    fixture.detectChanges();
    component.openAdminister(pendingFixture[0]);
    component.administerForm.patchValue({ quantity: 2, route: 'iv', remarks: 'Patient stable' });
    component.submitAdminister();

    const [pid, log] = rxService.administerSpy.calls.mostRecent().args;
    expect(pid).toBe('rx-1');
    expect(log).toEqual(jasmine.objectContaining({
      prescriptionId: 'rx-1',
      dose: '2',
      route: 'iv',
      notes: 'Patient stable',
    }));
    expect(component.administerModalVisible).toBe(false);
    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'success',
      summary: 'Medication administered',
    }));
    // Both sections reloaded after success (initial load + post-admin load = 2 each)
    expect(rxService.pendingSpy).toHaveBeenCalledTimes(2);
    expect(rxService.marSpy).toHaveBeenCalledTimes(2);
  });

  it('shows error toast on administer failure; modal stays open for retry', () => {
    rxService.pendingSpy.and.returnValue(of({ data: pendingFixture }));
    rxService.marSpy.and.returnValue(of({ data: [] }));
    rxService.administerSpy.and.returnValue(throwError(() => ({ status: 500, error: { message: 'boom' } })));

    fixture.detectChanges();
    component.openAdminister(pendingFixture[0]);
    component.administerForm.patchValue({ quantity: 1, route: 'iv', remarks: '' });
    component.submitAdminister();

    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'Could not administer medication',
    }));
    expect(component.administerModalVisible).toBe(true); // stays open
    expect(component.administerSubmitting).toBe(false); // reset so button re-enabled
  });
});
