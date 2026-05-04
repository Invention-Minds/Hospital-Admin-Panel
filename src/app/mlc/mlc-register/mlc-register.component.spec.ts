/**
 * Sprint 3d — MlcRegisterComponent tests (5).
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { MlcRegisterComponent } from './mlc-register.component';
import { MlcCase, MlcService } from '../../services/mlc.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

class MlcServiceStub {
  registerSpy = jasmine.createSpy('registerMlcCase');
  registerMlcCase(body: MlcCase): Observable<unknown> { return this.registerSpy(body); }
}

describe('MlcRegisterComponent', () => {
  let fixture: ComponentFixture<MlcRegisterComponent>;
  let component: MlcRegisterComponent;
  let mlcService: MlcServiceStub;
  let messageServiceAdd: jasmine.Spy;
  let router: Router;
  let http: HttpTestingController;

  const setup = async (queryMap: Record<string, string>) => {
    mlcService = new MlcServiceStub();
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ReactiveFormsModule,
        HttpClientTestingModule,
        RouterTestingModule,
        BrowserAnimationsModule,
        DropdownModule,
        CalendarModule,
        InputTextModule,
      ],
      declarations: [MlcRegisterComponent, PageHeaderComponent],
      providers: [
        { provide: MlcService, useValue: mlcService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(queryMap) },
          },
        },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const ms = TestBed.inject(MessageService);
    messageServiceAdd = spyOn(ms, 'add');
    router = TestBed.inject(Router);
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(MlcRegisterComponent);
    component = fixture.componentInstance;
  };

  it('renders with empty emergencyId when no query param is present', async () => {
    await setup({});
    fixture.detectChanges();
    expect(component.form.value.emergencyId).toBe('');
    expect(component.emergency).toBeNull();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="emergency-context"]')).toBeNull();
  });

  it('pre-fills emergency context when ?emergencyId is supplied', async () => {
    await setup({ emergencyId: '7' });
    fixture.detectChanges();
    expect(component.form.value.emergencyId).toBe('7');

    // Respond to the by-id emergency lookup
    const req = http.expectOne((r) => r.url.endsWith('/emergency/7'));
    req.flush({ data: { id: 7, prn: 'ER-7', patientName: 'Meera Joshi', age: 45 } });

    fixture.detectChanges();
    expect(component.emergency?.patientName).toBe('Meera Joshi');
    expect(component.emergency?.prn).toBe('ER-7');
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="emergency-context"]')?.textContent).toContain('Meera Joshi');
    http.verify();
  });

  it('disables submit until emergencyId + caseType are provided', async () => {
    await setup({});
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[data-testid="btn-register"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    component.form.patchValue({ emergencyId: '5', caseType: 'accident' });
    fixture.detectChanges();
    expect(btn.disabled).toBe(false);
  });

  it('submit calls service, shows success toast, navigates to /mlc/:id', async () => {
    await setup({});
    mlcService.registerSpy.and.returnValue(of({ data: { id: 999, hmisMlcId: 'HMIS-MLC-100' } }));
    const navigateSpy = spyOn(router, 'navigate');

    fixture.detectChanges();
    component.form.patchValue({
      emergencyId: '7',
      caseType: 'accident',
      policeStationName: 'Koramangala PS',
      fir_No: 'FIR-2026-001',
      fir_Date: null,
    });
    component.submit();

    const [body] = mlcService.registerSpy.calls.mostRecent().args;
    expect(body).toEqual(jasmine.objectContaining({
      emergencyId: '7',
      caseType: 'accident',
      policeStationName: 'Koramangala PS',
      fir_No: 'FIR-2026-001',
    }));
    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    expect(navigateSpy).toHaveBeenCalledWith(['/mlc', 999]);
  });

  it('backend error surfaces toast and preserves form values', async () => {
    await setup({});
    mlcService.registerSpy.and.returnValue(throwError(() => ({ status: 400, error: { message: 'MLC case already exists for this emergency' } })));
    const navigateSpy = spyOn(router, 'navigate');

    fixture.detectChanges();
    component.form.patchValue({
      emergencyId: '7',
      caseType: 'accident',
      policeStationName: 'Koramangala PS',
    });
    component.submit();

    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'Could not register MLC case',
      detail: jasmine.stringContaining('already exists'),
    }));
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(component.form.value.emergencyId).toBe('7');
    expect(component.form.value.caseType).toBe('accident');
    expect(component.form.value.policeStationName).toBe('Koramangala PS');
  });
});
