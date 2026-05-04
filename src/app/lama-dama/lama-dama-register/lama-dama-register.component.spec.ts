/**
 * Sprint 3e — LamaDamaRegisterComponent tests.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';

import { LamaDamaRegisterComponent } from './lama-dama-register.component';
import { LamaDamaService, LamaRecord, DamaRecord } from '../../services/lama-dama.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';

class LamaDamaServiceStub {
  createLamaSpy = jasmine.createSpy('createLamaRecord');
  createDamaSpy = jasmine.createSpy('createDamaRecord');
  createLamaRecord(body: LamaRecord): Observable<unknown> { return this.createLamaSpy(body); }
  createDamaRecord(body: DamaRecord): Observable<unknown> { return this.createDamaSpy(body); }
}

describe('LamaDamaRegisterComponent', () => {
  let fixture: ComponentFixture<LamaDamaRegisterComponent>;
  let component: LamaDamaRegisterComponent;
  let svc: LamaDamaServiceStub;
  let messageServiceAdd: jasmine.Spy;
  let router: Router;
  let http: HttpTestingController;

  const setup = async (queryMap: Record<string, string>) => {
    svc = new LamaDamaServiceStub();
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        HttpClientTestingModule,
        RouterTestingModule,
        BrowserAnimationsModule,
        DropdownModule,
        CalendarModule,
        InputTextModule,
        CheckboxModule,
      ],
      declarations: [LamaDamaRegisterComponent, PageHeaderComponent, ConfirmDialogComponent],
      providers: [
        { provide: LamaDamaService, useValue: svc },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryMap) } },
        },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const ms = TestBed.inject(MessageService);
    messageServiceAdd = spyOn(ms, 'add');
    router = TestBed.inject(Router);
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(LamaDamaRegisterComponent);
    component = fixture.componentInstance;
  };

  it('defaults to LAMA when no type query param is present', async () => {
    await setup({});
    fixture.detectChanges();
    expect(component.type).toBe('lama');
  });

  it('honors ?type=dama query param', async () => {
    await setup({ type: 'dama' });
    fixture.detectChanges();
    expect(component.type).toBe('dama');
  });

  it('pre-fills emergency context when ?emergencyId is supplied', async () => {
    await setup({ type: 'lama', emergencyId: '9' });
    fixture.detectChanges();
    expect(component.sharedForm.value.emergencyId).toBe('9');

    const req = http.expectOne((r) => r.url.endsWith('/emergency/9'));
    req.flush({ data: { id: 9, prn: 'ER-9', patientName: 'Asha Kumari', age: 52 } });
    fixture.detectChanges();

    expect(component.emergency?.patientName).toBe('Asha Kumari');
    expect(component.emergency?.prn).toBe('ER-9');
    http.verify();
  });

  it('attemptSubmit with invalid form does not open confirm dialog', async () => {
    await setup({});
    fixture.detectChanges();
    component.attemptSubmit();
    expect(component.confirmVisible).toBe(false);
  });

  it('LAMA submit → service.createLama, success toast, navigates to /lama-dama/lama/:id', async () => {
    await setup({ type: 'lama' });
    svc.createLamaSpy.and.returnValue(of({ data: { id: 'L77', hmisLamaId: 'HMIS-LAMA-501' } }));
    const navigateSpy = spyOn(router, 'navigate');

    fixture.detectChanges();
    component.sharedForm.patchValue({
      emergencyId: '9',
      timestamp: new Date('2026-04-01T10:00:00Z'),
      witnessName: 'Ravi',
    });
    component.lamaForm.patchValue({
      doctorAdvice: 'Admit for observation',
      riskExplained: true,
      reasonForLama: 'Patient refused admission',
    });
    component.attemptSubmit();
    expect(component.confirmVisible).toBe(true);
    component.onConfirm();

    const [body] = svc.createLamaSpy.calls.mostRecent().args;
    expect(body).toEqual(jasmine.objectContaining({
      emergencyId: '9',
      doctorAdvice: 'Admit for observation',
      riskExplained: true,
      reasonForLama: 'Patient refused admission',
      witnessName: 'Ravi',
    }));
    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    expect(navigateSpy).toHaveBeenCalledWith(['/lama-dama', 'lama', 'L77']);
  });

  it('DAMA submit → service.createDama, success toast, navigates to /lama-dama/dama/:id', async () => {
    await setup({ type: 'dama' });
    svc.createDamaSpy.and.returnValue(of({ data: { id: 'D44' } }));
    const navigateSpy = spyOn(router, 'navigate');

    fixture.detectChanges();
    component.sharedForm.patchValue({
      emergencyId: '11',
      timestamp: new Date('2026-04-01T12:00:00Z'),
      witnessName: 'Priya',
    });
    component.damaForm.patchValue({
      doctorRecommendation: 'Continue IV antibiotics',
      patientDeclinesAdvice: true,
      followUpAdvice: 'OPD review in 3 days',
    });
    component.attemptSubmit();
    component.onConfirm();

    const [body] = svc.createDamaSpy.calls.mostRecent().args;
    expect(body).toEqual(jasmine.objectContaining({
      emergencyId: '11',
      doctorRecommendation: 'Continue IV antibiotics',
      patientDeclinesAdvice: true,
      followUpAdvice: 'OPD review in 3 days',
      witnessName: 'Priya',
    }));
    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    expect(navigateSpy).toHaveBeenCalledWith(['/lama-dama', 'dama', 'D44']);
  });

  it('backend error surfaces toast and preserves form values', async () => {
    await setup({ type: 'lama' });
    svc.createLamaSpy.and.returnValue(throwError(() => ({ status: 400, error: { message: 'duplicate' } })));
    const navigateSpy = spyOn(router, 'navigate');

    fixture.detectChanges();
    component.sharedForm.patchValue({
      emergencyId: '9',
      timestamp: new Date('2026-04-01T10:00:00Z'),
      witnessName: 'Ravi',
    });
    component.lamaForm.patchValue({
      doctorAdvice: 'Admit',
      riskExplained: true,
      reasonForLama: 'Refused',
    });
    component.attemptSubmit();
    component.onConfirm();

    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'Could not record LAMA',
    }));
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(component.sharedForm.value.emergencyId).toBe('9');
    expect(component.lamaForm.value.doctorAdvice).toBe('Admit');
  });
});
