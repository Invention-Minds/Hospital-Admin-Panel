/**
 * Sprint 3f — AdmitToIpdModalComponent tests (5).
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import {
  AdmitToIpdModalComponent,
  AdmitContext,
} from './admit-to-ipd-modal.component';
import { OpdAssessmentsService } from '../../../services/opd-assessment/opd-assessments.service';
import { EmergencyService } from '../../../services/emergency.service';
import { DoctorServiceService } from '../../../services/doctor-details/doctor-service.service';
import { WardManagementService } from '../../../services/ward-management.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

class OpdStub {
  admitSpy = jasmine.createSpy('admitToIpd');
  admitToIpd(payload: unknown): Observable<unknown> { return this.admitSpy(payload); }
}
class EmergencyStub {
  convertSpy = jasmine.createSpy('convertToIPD');
  convertToIPD(id: string, payload: unknown): Observable<unknown> { return this.convertSpy(id, payload); }
}
class WardStub {
  getAllWards(): Observable<unknown> {
    return of([
      { id: 'W1', wardName: 'Ward A', wardCode: 'A', floor: '1', department: 'General', totalBeds: 10 },
    ]);
  }
  getBedsByWard(_wardId: string): Observable<unknown> {
    return of([
      { id: 'B1', bedNumber: 'B-01', wardId: 'W1', bedType: 'general', status: 'available' },
      { id: 'B2', bedNumber: 'B-02', wardId: 'W1', bedType: 'ICU', status: 'occupied' },
    ]);
  }
}
class DoctorStub {
  getAllDoctors(): Observable<unknown> {
    return of([{ id: 7, name: 'Dr. Meera Joshi', departmentName: 'General Medicine' }]);
  }
}

describe('AdmitToIpdModalComponent', () => {
  let fixture: ComponentFixture<AdmitToIpdModalComponent>;
  let component: AdmitToIpdModalComponent;
  let opd: OpdStub;
  let emergency: EmergencyStub;
  let messageServiceAdd: jasmine.Spy;

  const setup = async () => {
    opd = new OpdStub();
    emergency = new EmergencyStub();
    await TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule, FormsModule, BrowserAnimationsModule],
      declarations: [AdmitToIpdModalComponent, ConfirmDialogComponent, EmptyStateComponent],
      providers: [
        { provide: OpdAssessmentsService, useValue: opd },
        { provide: EmergencyService, useValue: emergency },
        { provide: DoctorServiceService, useValue: new DoctorStub() },
        { provide: WardManagementService, useValue: new WardStub() },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const ms = TestBed.inject(MessageService);
    messageServiceAdd = spyOn(ms, 'add');

    fixture = TestBed.createComponent(AdmitToIpdModalComponent);
    component = fixture.componentInstance;
  };

  const opdContext: AdmitContext = {
    sourceId: 42,
    prn: '1001',
    patientName: 'Asha Kumari',
    referringDoctor: 'Dr. Ravi',
    summary: 'Hypertension — requires IPD observation',
    suggestedAdmissionType: 'elective',
  };

  const emergencyContext: AdmitContext = {
    sourceId: '9',
    prn: 'JMRH-ER-9',
    patientName: 'Rajesh Kumar',
    referringDoctor: 'Emergency Department',
    summary: 'Chest pain',
    suggestedAdmissionType: 'emergency',
  };

  const flipVisibleWith = (source: 'opd' | 'emergency', ctx: AdmitContext) => {
    component.source = source;
    component.context = ctx;
    component.visible = true;
    component.ngOnChanges({
      visible: { currentValue: true, previousValue: false, firstChange: true, isFirstChange: () => true },
    });
  };

  it('opens with OPD source — admissionType defaults to elective, prefills doctor name', async () => {
    await setup();
    flipVisibleWith('opd', opdContext);
    fixture.detectChanges();

    expect(component.admitForm.value.admissionType).toBe('elective');
    expect(component.admitForm.value.admittingDoctorName).toBe('Dr. Ravi');
  });

  it('opens with Emergency source — admissionType defaults to emergency', async () => {
    await setup();
    flipVisibleWith('emergency', emergencyContext);
    fixture.detectChanges();

    expect(component.admitForm.value.admissionType).toBe('emergency');
  });

  it('invalid submit does not open the confirm dialog', async () => {
    await setup();
    flipVisibleWith('opd', opdContext);
    fixture.detectChanges();

    component.admitForm.patchValue({ wardId: '', bedId: '' });
    component.attemptSubmit();

    expect(component.confirmVisible).toBe(false);
  });

  it('OPD valid submit → ConfirmDialog → OpdService.admitToIpd → admitted event + close', async () => {
    await setup();
    opd.admitSpy.and.returnValue(of({
      message: 'ok',
      data: { ipdAdmission: { id: 'adm-7', admissionNo: 'JMRH-IPD-0007' } },
    }));
    flipVisibleWith('opd', opdContext);
    fixture.detectChanges();

    // Select ward first so the bed list is populated.
    component.onWardChange('W1');
    component.admitForm.patchValue({
      wardId: 'W1',
      bedId: 'B1',
      admittingDoctorName: 'Dr. Meera Joshi',
      admissionType: 'elective',
    });

    const emitted: Array<{ admissionId: string; admissionNo: string }> = [];
    component.admitted.subscribe((e) => emitted.push(e));

    component.attemptSubmit();
    expect(component.confirmVisible).toBe(true);
    component.onConfirm();

    expect(opd.admitSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      appointmentId: 42,
      wardId: 'W1',
      bedId: 'B1',
      admittingDoctorName: 'Dr. Meera Joshi',
      admissionType: 'elective',
    }));
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual({ admissionId: 'adm-7', admissionNo: 'JMRH-IPD-0007' });
    expect(component.visible).toBe(false);
    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
  });

  it('Emergency submit error keeps the form populated and surfaces an error toast', async () => {
    await setup();
    emergency.convertSpy.and.returnValue(throwError(() => ({ status: 500, error: { message: 'oops' } })));
    flipVisibleWith('emergency', emergencyContext);
    fixture.detectChanges();

    component.onWardChange('W1');
    component.admitForm.patchValue({
      wardId: 'W1',
      bedId: 'B1',
      admittingDoctorName: 'Dr. Surgeon',
      admissionType: 'emergency',
    });

    component.attemptSubmit();
    component.onConfirm();

    expect(emergency.convertSpy).toHaveBeenCalledWith('9', jasmine.objectContaining({
      wardId: 'W1',
      bedId: 'B1',
      admittingDoctorName: 'Dr. Surgeon',
      admissionType: 'emergency',
    }));
    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'Could not create admission',
    }));
    // Form + modal stay open so user can retry.
    expect(component.visible).toBe(true);
    expect(component.admitForm.value.wardId).toBe('W1');
  });
});
