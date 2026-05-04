/**
 * Sprint 3e — LamaDamaComponent list-enhancement tests.
 *
 * Covers only the Sprint 3e additions: type-aware create nav, row-click
 * nav, verify-toast (replaces alert), has-records helpers, hmisId helpers.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { LamaDamaComponent } from './lama-dama.component';
import { LamaDamaService, LamaRecord, DamaRecord } from '../services/lama-dama.service';
import { EmptyStateComponent } from '../shared/ui/empty-state/empty-state.component';
import { HmisSyncIndicatorComponent } from '../shared/ui/hmis-sync-indicator/hmis-sync-indicator.component';

class LamaDamaServiceStub {
  lamaSpy = jasmine.createSpy('getAllLamaRecords').and.returnValue(of({ data: [] }));
  damaSpy = jasmine.createSpy('getAllDamaRecords').and.returnValue(of({ data: [] }));
  statsSpy = jasmine.createSpy('getStats').and.returnValue(of({ data: { total: 0, lamaTotal: 0, damaTotal: 0 } }));
  complianceSpy = jasmine.createSpy('getComplianceReport').and.returnValue(of({ data: null }));
  verifySpy = jasmine.createSpy('verifyDocumentation');

  getAllLamaRecords(): Observable<unknown> { return this.lamaSpy(); }
  getAllDamaRecords(): Observable<unknown> { return this.damaSpy(); }
  getStats(): Observable<unknown> { return this.statsSpy(); }
  getComplianceReport(): Observable<unknown> { return this.complianceSpy(); }
  verifyDocumentation(type: 'lama' | 'dama', id: string): Observable<unknown> { return this.verifySpy(type, id); }
  generateLamaReport(_id: string): Observable<Blob> { return of(new Blob()); }
  generateDamaReport(_id: string): Observable<Blob> { return of(new Blob()); }
}

describe('LamaDamaComponent — Sprint 3e enhancements', () => {
  let fixture: ComponentFixture<LamaDamaComponent>;
  let component: LamaDamaComponent;
  let svc: LamaDamaServiceStub;
  let router: Router;
  let messageServiceAdd: jasmine.Spy;

  beforeEach(async () => {
    svc = new LamaDamaServiceStub();
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, RouterTestingModule, BrowserAnimationsModule],
      declarations: [LamaDamaComponent, EmptyStateComponent, HmisSyncIndicatorComponent],
      providers: [
        { provide: LamaDamaService, useValue: svc },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    router = TestBed.inject(Router);
    const ms = TestBed.inject(MessageService);
    messageServiceAdd = spyOn(ms, 'add');

    fixture = TestBed.createComponent(LamaDamaComponent);
    component = fixture.componentInstance;
  });

  it('"New LAMA" / "New DAMA" buttons navigate to /lama-dama/new with type query param', () => {
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();

    component.createRecord('lama');
    expect(navigateSpy).toHaveBeenCalledWith(['/lama-dama/new'], { queryParams: { type: 'lama' } });

    component.createRecord('dama');
    expect(navigateSpy).toHaveBeenCalledWith(['/lama-dama/new'], { queryParams: { type: 'dama' } });
  });

  it('row click navigates to /lama-dama/:type/:id (both types)', () => {
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();

    component.openDetail('lama', 'L1');
    expect(navigateSpy).toHaveBeenCalledWith(['/lama-dama', 'lama', 'L1']);

    component.openDetail('dama', 'D1');
    expect(navigateSpy).toHaveBeenCalledWith(['/lama-dama', 'dama', 'D1']);

    navigateSpy.calls.reset();
    component.openDetail('lama', undefined);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('verifyRecord success surfaces a success toast (no alert)', () => {
    svc.verifySpy.and.returnValue(of({ data: { compliant: true, issues: [] } }));
    fixture.detectChanges();
    component.verifyRecord('lama', 'L1');
    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'success',
      summary: 'Documentation compliant',
    }));
  });

  it('verifyRecord non-compliant surfaces warn toast with joined issues', () => {
    svc.verifySpy.and.returnValue(of({ data: { compliant: false, issues: ['Witness missing', 'Signature missing'] } }));
    fixture.detectChanges();
    component.verifyRecord('dama', 'D1');
    expect(messageServiceAdd).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'warn',
      detail: jasmine.stringContaining('Witness missing'),
    }));
  });

  it('hasLama / hasDama reflect record counts', () => {
    fixture.detectChanges();
    expect(component.hasLama()).toBe(false);
    expect(component.hasDama()).toBe(false);

    component.lamaRecords = [{ id: 'L1' } as LamaRecord];
    component.damaRecords = [{ id: 'D1' } as DamaRecord];
    expect(component.hasLama()).toBe(true);
    expect(component.hasDama()).toBe(true);
  });

  it('lamaHmisId / damaHmisId surface the HMIS id or null', () => {
    fixture.detectChanges();
    expect(component.lamaHmisId({ hmisLamaId: 'HMIS-LAMA-501' } as LamaRecord)).toBe('HMIS-LAMA-501');
    expect(component.lamaHmisId({} as LamaRecord)).toBeNull();
    expect(component.damaHmisId({ hmisDamaId: 'HMIS-DAMA-700' } as DamaRecord)).toBe('HMIS-DAMA-700');
    expect(component.damaHmisId({} as DamaRecord)).toBeNull();
  });
});
