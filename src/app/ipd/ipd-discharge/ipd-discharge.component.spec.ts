/**
 * Sprint 3b — IpdDischargeComponent tests.
 *
 * Covers brief requirements:
 *   1. Renders form with 4 discharge-type options + required markers
 *   2. Form validation: invalid disables submit; valid enables
 *   3. Submit opens ConfirmDialog; no POST until confirmed
 *   4. Confirmed → service called with admissionId + full payload incl.
 *      medications array; success toast; navigates away
 *   5. Backend error → toast; form preserved (not reset)
 *   6. canDeactivate: pristine → true; dirty + cancel → false
 */

import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { IpdDischargeComponent } from './ipd-discharge.component';
import { IpdDischarge, IpdService } from '../../services/ipd.service';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

class IpdServiceStub {
  createDischargeSpy = jasmine.createSpy('createDischarge');
  getDischargeSpy = jasmine.createSpy('getDischarge');

  createDischarge(admissionId: string, data: IpdDischarge): Observable<unknown> {
    return this.createDischargeSpy(admissionId, data);
  }
  getDischarge(admissionId: string): Observable<IpdDischarge> {
    return this.getDischargeSpy(admissionId);
  }
}

describe('IpdDischargeComponent', () => {
  let fixture: ComponentFixture<IpdDischargeComponent>;
  let component: IpdDischargeComponent;
  let ipdService: IpdServiceStub;
  let messageServiceAdd: jasmine.Spy;
  let router: Router;

  const fillRequired = () => {
    component.form.patchValue({
      dischargeType: 'regular',
      finalDiagnosis: 'Community-acquired pneumonia — resolved.',
      conditionAtDischarge: 'Stable',
      dischargeSummary: 'Responded to IV antibiotics; discharged home on oral step-down.',
    });
    component.form.markAsDirty();
  };

  beforeEach(async () => {
    ipdService = new IpdServiceStub();

    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterTestingModule,
        BrowserAnimationsModule,
        DropdownModule,
        CalendarModule,
        InputTextModule,
      ],
      declarations: [IpdDischargeComponent, ConfirmDialogComponent, PageHeaderComponent],
      providers: [
        { provide: IpdService, useValue: ipdService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'admissionId' ? 'adm-42' : null) } } },
        },
        MessageService,
      ],
      // PrimeNG p-dropdown / p-calendar are not in play during logic tests —
      // NO_ERRORS_SCHEMA keeps the test focused on component behaviour
      // rather than PrimeNG integration (which is a smoke-level concern).
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const ms = TestBed.inject(MessageService);
    messageServiceAdd = spyOn(ms, 'add');
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(IpdDischargeComponent);
    component = fixture.componentInstance;
  });

  it('renders the form with the 4 backend-supported discharge types', () => {
    fixture.detectChanges();
    expect(component.dischargeTypes.map((t) => t.value)).toEqual([
      'regular',
      'LAMA',
      'transfer',
      'expired',
    ]);
    // DAMA is intentionally excluded — its own flow.
    expect(component.dischargeTypes.find((t) => t.value === ('DAMA' as unknown))).toBeUndefined();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="discharge-form"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="btn-discharge"]')).not.toBeNull();
  });

  it('disables the submit button while required fields are missing and enables once they are all filled', () => {
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[data-testid="btn-discharge"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    fillRequired();
    fixture.detectChanges();
    expect(btn.disabled).toBe(false);
  });

  it('opens the ConfirmDialog on submit-click and does NOT call the service until confirmed', () => {
    fixture.detectChanges();
    fillRequired();
    fixture.detectChanges();

    component.attemptDischarge();
    expect(component.confirmDischargeVisible).toBe(true);
    expect(ipdService.createDischargeSpy).not.toHaveBeenCalled();

    // Simulate the user clicking cancel instead of confirm.
    component.onDischargeCancel();
    expect(component.confirmDischargeVisible).toBe(false);
    expect(ipdService.createDischargeSpy).not.toHaveBeenCalled();
  });

  it('on confirm, dispatches the full payload, shows success toast, and navigates to /ipd', () => {
    const navigateSpy = spyOn(router, 'navigate');
    ipdService.createDischargeSpy.and.returnValue(
      of({
        message: 'Discharge recorded',
        data: { id: 'd-1', admissionId: 'adm-42', hmisDischargeId: 'HMIS-D-100' },
      })
    );

    fixture.detectChanges();
    fillRequired();
    // Add one medication row to verify it's serialised
    component.addMedicationRow();
    component.medications.at(0).patchValue({
      name: 'Ceftriaxone', dose: '1 g', frequency: 'q12h', duration: '5 days',
    });
    fixture.detectChanges();

    component.attemptDischarge();
    component.onDischargeConfirm();

    expect(ipdService.createDischargeSpy).toHaveBeenCalledTimes(1);
    const [admissionId, payload] = ipdService.createDischargeSpy.calls.mostRecent().args;
    expect(admissionId).toBe('adm-42');
    expect(payload).toEqual(jasmine.objectContaining({
      admissionId: 'adm-42',
      dischargeType: 'regular',
      finalDiagnosis: 'Community-acquired pneumonia — resolved.',
      conditionAtDischarge: 'Stable',
    }));
    expect(payload.medications).toEqual([
      { name: 'Ceftriaxone', dose: '1 g', frequency: 'q12h', duration: '5 days' },
    ]);

    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'success',
      detail: jasmine.stringContaining('HMIS-D-100'),
    }));
    expect(navigateSpy).toHaveBeenCalledWith(['/ipd']);
  });

  it('on backend 409 error, shows an error toast, does not navigate, and preserves the form', () => {
    const navigateSpy = spyOn(router, 'navigate');
    ipdService.createDischargeSpy.and.returnValue(
      throwError(() => ({ status: 409, error: { message: 'Admission is already discharged' } }))
    );

    fixture.detectChanges();
    fillRequired();
    fixture.detectChanges();

    component.attemptDischarge();
    component.onDischargeConfirm();

    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'Could not discharge patient',
      detail: jasmine.stringContaining('already discharged'),
    }));
    expect(navigateSpy).not.toHaveBeenCalled();
    // Form values preserved — user can retry after investigating
    expect(component.form.value.dischargeType).toBe('regular');
    expect(component.form.value.finalDiagnosis).toContain('Community-acquired pneumonia');
  });

  it('canDeactivate: pristine → true; dirty + cancel → false', fakeAsync(() => {
    fixture.detectChanges();

    expect(component.canDeactivate()).toBe(true);
    expect(component.confirmDiscardVisible).toBe(false);

    fillRequired();
    const result = component.canDeactivate();
    expect(component.confirmDiscardVisible).toBe(true);

    let decision: boolean | undefined;
    (result as Observable<boolean>).subscribe((v) => (decision = v));

    component.onDiscardCancel();
    tick();
    expect(decision).toBe(false);
    expect(component.confirmDiscardVisible).toBe(false);
  }));
});
