/**
 * Sprint 3e — LamaDamaDetailComponent tests.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { LamaDamaDetailComponent } from './lama-dama-detail.component';
import { LamaDamaService, LamaRecord, DamaRecord } from '../../services/lama-dama.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { HmisSyncIndicatorComponent } from '../../shared/ui/hmis-sync-indicator/hmis-sync-indicator.component';

class LamaDamaServiceStub {
  getLamaSpy = jasmine.createSpy('getLamaRecord');
  getDamaSpy = jasmine.createSpy('getDamaRecord');
  updateLamaSpy = jasmine.createSpy('updateLamaRecord');
  updateDamaSpy = jasmine.createSpy('updateDamaRecord');
  getLamaRecord(id: string): Observable<unknown> { return this.getLamaSpy(id); }
  getDamaRecord(id: string): Observable<unknown> { return this.getDamaSpy(id); }
  updateLamaRecord(id: string, body: Partial<LamaRecord>): Observable<unknown> { return this.updateLamaSpy(id, body); }
  updateDamaRecord(id: string, body: Partial<DamaRecord>): Observable<unknown> { return this.updateDamaSpy(id, body); }
}

class AppointmentConfirmStub {
  getDetailsByPRN(_prn: string): Observable<unknown> { return of({ name: 'Asha Kumari', prn: 'ER-9' }); }
}

describe('LamaDamaDetailComponent', () => {
  let fixture: ComponentFixture<LamaDamaDetailComponent>;
  let component: LamaDamaDetailComponent;
  let svc: LamaDamaServiceStub;
  let messageServiceAdd: jasmine.Spy;

  const setup = async (paramMap: Record<string, string>) => {
    svc = new LamaDamaServiceStub();
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ReactiveFormsModule,
        HttpClientTestingModule,
        RouterTestingModule,
        BrowserAnimationsModule,
      ],
      declarations: [LamaDamaDetailComponent, HmisSyncIndicatorComponent],
      providers: [
        { provide: LamaDamaService, useValue: svc },
        { provide: AppointmentConfirmService, useValue: new AppointmentConfirmStub() },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(paramMap) } },
        },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const ms = TestBed.inject(MessageService);
    messageServiceAdd = spyOn(ms, 'add');

    fixture = TestBed.createComponent(LamaDamaDetailComponent);
    component = fixture.componentInstance;
  };

  it('loads LAMA record on init and exposes hmisPrefix=HMIS-LAMA', async () => {
    await setup({ type: 'lama', id: 'L1' });
    svc.getLamaSpy.and.returnValue(of({
      data: {
        id: 'L1',
        emergencyId: '9',
        lamaTime: '2026-04-01T10:00:00Z',
        doctorAdvice: 'Admit',
        riskExplained: true,
        reasonForLama: 'Refused',
        hmisLamaId: 'HMIS-LAMA-501',
      } as unknown as LamaRecord,
    }));

    fixture.detectChanges();
    expect(svc.getLamaSpy).toHaveBeenCalledWith('L1');
    expect(component.record).toBeTruthy();
    expect(component.type).toBe('lama');
    expect(component.hmisPrefix).toBe('HMIS-LAMA');
    expect(component.hmisId).toBe('HMIS-LAMA-501');
  });

  it('loads DAMA record when type=dama and exposes hmisPrefix=HMIS-DAMA', async () => {
    await setup({ type: 'dama', id: 'D1' });
    svc.getDamaSpy.and.returnValue(of({
      data: {
        id: 'D1',
        emergencyId: '11',
        dischargeTime: '2026-04-01T12:00:00Z',
        doctorRecommendation: 'Continue',
        patientDeclinesAdvice: true,
        hmisDamaId: null,
      } as unknown as DamaRecord,
    }));

    fixture.detectChanges();
    expect(svc.getDamaSpy).toHaveBeenCalledWith('D1');
    expect(component.type).toBe('dama');
    expect(component.hmisPrefix).toBe('HMIS-DAMA');
    expect(component.hmisId).toBeNull();
  });

  it('enterEdit + saveEdit calls updateLamaRecord and reloads record (opportunistic backfill)', async () => {
    await setup({ type: 'lama', id: 'L1' });
    const initial = {
      data: {
        id: 'L1', emergencyId: '9', lamaTime: '2026-04-01T10:00:00Z',
        doctorAdvice: 'Admit', riskExplained: true, reasonForLama: 'Refused',
        witnessName: 'Ravi', hmisLamaId: null,
      } as unknown as LamaRecord,
    };
    const backfilled = {
      data: {
        id: 'L1', emergencyId: '9', lamaTime: '2026-04-01T10:00:00Z',
        doctorAdvice: 'Admit and monitor', riskExplained: true, reasonForLama: 'Refused',
        witnessName: 'Ravi', hmisLamaId: 'HMIS-LAMA-777',
      } as unknown as LamaRecord,
    };
    svc.getLamaSpy.and.returnValues(of(initial), of(backfilled));
    svc.updateLamaSpy.and.returnValue(of({ data: { id: 'L1', hmisLamaId: 'HMIS-LAMA-777' } }));

    fixture.detectChanges();
    expect(component.hmisId).toBeNull();

    component.enterEdit();
    component.editForm.patchValue({ doctorAdvice: 'Admit and monitor' });
    component.saveEdit();

    expect(svc.updateLamaSpy).toHaveBeenCalled();
    const [id, patch] = svc.updateLamaSpy.calls.mostRecent().args;
    expect(id).toBe('L1');
    expect(patch).toEqual(jasmine.objectContaining({ doctorAdvice: 'Admit and monitor' }));

    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    expect(component.editing).toBe(false);
    expect(svc.getLamaSpy).toHaveBeenCalledTimes(2);
    expect(component.hmisId).toBe('HMIS-LAMA-777');
  });

  it('saveEdit error preserves editing state and shows error toast', async () => {
    await setup({ type: 'dama', id: 'D1' });
    svc.getDamaSpy.and.returnValue(of({
      data: {
        id: 'D1', emergencyId: '11', dischargeTime: '2026-04-01T12:00:00Z',
        doctorRecommendation: 'Continue', patientDeclinesAdvice: true,
        witnessName: 'Priya', hmisDamaId: null,
      } as unknown as DamaRecord,
    }));
    svc.updateDamaSpy.and.returnValue(throwError(() => ({ status: 500, error: { message: 'oops' } })));

    fixture.detectChanges();
    component.enterEdit();
    component.editForm.patchValue({ doctorRecommendation: 'New plan' });
    component.saveEdit();

    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'Could not update DAMA record',
    }));
    expect(component.editing).toBe(true);
    expect(component.submitting).toBe(false);
  });

  it('cancelEdit reverts changes to last-loaded values', async () => {
    await setup({ type: 'lama', id: 'L1' });
    svc.getLamaSpy.and.returnValue(of({
      data: {
        id: 'L1', emergencyId: '9', lamaTime: '2026-04-01T10:00:00Z',
        doctorAdvice: 'Admit', riskExplained: true, reasonForLama: 'Refused',
        witnessName: 'Ravi', hmisLamaId: 'HMIS-LAMA-501',
      } as unknown as LamaRecord,
    }));

    fixture.detectChanges();
    component.enterEdit();
    component.editForm.patchValue({ doctorAdvice: 'Totally different' });
    component.cancelEdit();

    expect(component.editing).toBe(false);
    expect(component.editForm.value.doctorAdvice).toBe('Admit');
  });
});
