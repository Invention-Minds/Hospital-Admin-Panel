/**
 * Sprint 3d — MlcCasesComponent list-enhancement tests (3).
 *
 * Covers only the Sprint 3d additions: pending-reports badge, New-MLC-Case
 * button, row-click navigation. Existing list behavior (filters, stats,
 * download) is left untested here — not a Sprint 3d addition.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { MlcCasesComponent } from './mlc-cases.component';
import { MlcCase, MlcService } from '../services/mlc.service';
import { ConfirmDialogComponent } from '../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../shared/ui/empty-state/empty-state.component';

class MlcServiceStub {
  getAllSpy = jasmine.createSpy('getAllMlcCases').and.returnValue(of({ data: [] }));
  statsSpy = jasmine.createSpy('getMlcStats').and.returnValue(of({ data: {} }));
  pendingSpy = jasmine.createSpy('getPendingReports').and.returnValue(of({ data: [], count: 0 }));

  getAllMlcCases(): Observable<MlcCase[]> { return this.getAllSpy(); }
  getMlcStats(): Observable<unknown> { return this.statsSpy(); }
  getPendingReports(): Observable<unknown> { return this.pendingSpy(); }
  closeMlcCase(): Observable<unknown> { return of({}); }
  generateMlcReport(): Observable<Blob> { return of(new Blob()); }
}

describe('MlcCasesComponent — Sprint 3d enhancements', () => {
  let fixture: ComponentFixture<MlcCasesComponent>;
  let component: MlcCasesComponent;
  let mlcService: MlcServiceStub;
  let router: Router;

  beforeEach(async () => {
    mlcService = new MlcServiceStub();
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, RouterTestingModule, BrowserAnimationsModule],
      declarations: [MlcCasesComponent, ConfirmDialogComponent, EmptyStateComponent],
      providers: [
        { provide: MlcService, useValue: mlcService },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(MlcCasesComponent);
    component = fixture.componentInstance;
  });

  it('renders pending-reports badge with the count from the backend', () => {
    mlcService.pendingSpy.and.returnValue(of({ data: [{ id: 1 }, { id: 2 }, { id: 3 }], count: 3 }));
    fixture.detectChanges();
    expect(component.pendingReportsCount).toBe(3);
    const host = fixture.nativeElement as HTMLElement;
    const badge = host.querySelector('[data-testid="pending-badge"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('3');
  });

  it('"New MLC Case" button navigates to /mlc/new', () => {
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();
    component.goToRegister();
    expect(navigateSpy).toHaveBeenCalledWith(['/mlc/new']);
  });

  it('row click navigates to /mlc/:id', () => {
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();
    component.openDetail('42');
    expect(navigateSpy).toHaveBeenCalledWith(['/mlc', '42']);

    component.openDetail(99);
    expect(navigateSpy).toHaveBeenCalledWith(['/mlc', 99]);

    // null / undefined is a no-op
    navigateSpy.calls.reset();
    component.openDetail(undefined);
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
