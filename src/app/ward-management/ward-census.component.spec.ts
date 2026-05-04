/**
 * Sprint 4a Phase 1e — WardCensusComponent tests (4).
 *
 * Covers date-driven mode switching between live census and historical snapshot.
 *  1. Default mode — today selected → live mode, calls getBedCensus + getWardStats.
 *  2. Past date selected → snapshot mode, calls getWardCensusSnapshot, renders snapshotTime.
 *  3. 404 snapshot response → surfaces snapshotMissing banner.
 *  4. Auto-refresh is suppressed in snapshot mode (only refreshes when mode === 'live').
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { WardCensusComponent } from './ward-census.component';
import { WardManagementService } from '../services/ward-management.service';

class WardServiceStub {
  getBedCensusSpy = jasmine.createSpy('getBedCensus').and.returnValue(of({ data: [] }));
  getWardStatsSpy = jasmine.createSpy('getWardStats').and.returnValue(of({ data: {} }));
  getSnapshotSpy = jasmine.createSpy('getWardCensusSnapshot').and.returnValue(
    of({
      data: {
        date: '2026-04-15',
        snapshotTime: '2026-04-15T00:05:30.000Z',
        snapshotReason: 'cron',
        wards: [
          { wardId: 'w1', wardName: 'ICU', wardCode: 'ICU-01', department: 'CC', totalBeds: 10,
            occupiedBeds: 7, availableBeds: 3, maintenanceBeds: 0, reservedBeds: 0,
            generalBeds: 0, icuBeds: 10, hduBeds: 0, isolationBeds: 0, occupancyRate: 70 },
        ],
      },
    })
  );
  downloadSpy = jasmine.createSpy('downloadBedCensusReport').and.returnValue(of(new Blob()));

  getBedCensus(): Observable<unknown> { return this.getBedCensusSpy(); }
  getWardStats(): Observable<unknown> { return this.getWardStatsSpy(); }
  getWardCensusSnapshot(d: string): Observable<unknown> { return this.getSnapshotSpy(d); }
  downloadBedCensusReport(): Observable<Blob> { return this.downloadSpy(); }
}

describe('WardCensusComponent (Phase 1e)', () => {
  let fixture: ComponentFixture<WardCensusComponent>;
  let component: WardCensusComponent;
  let svc: WardServiceStub;

  beforeEach(async () => {
    svc = new WardServiceStub();
    await TestBed.configureTestingModule({
      imports: [FormsModule, CalendarModule],
      declarations: [WardCensusComponent],
      providers: [{ provide: WardManagementService, useValue: svc }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(WardCensusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('defaults to live mode on init — calls getBedCensus + getWardStats, not snapshot', () => {
    expect(component.mode).toBe('live');
    expect(svc.getBedCensusSpy).toHaveBeenCalled();
    expect(svc.getWardStatsSpy).toHaveBeenCalled();
    expect(svc.getSnapshotSpy).not.toHaveBeenCalled();
  });

  it('selecting a past date switches to snapshot mode and calls getWardCensusSnapshot', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    component.selectedDate = past;
    component.onDateChange();

    expect(component.mode).toBe('snapshot');
    expect(svc.getSnapshotSpy).toHaveBeenCalledTimes(1);
    const ymdArg = svc.getSnapshotSpy.calls.mostRecent().args[0];
    expect(ymdArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(component.snapshotTime).toBeTruthy();
    expect(component.snapshotReason).toBe('cron');
    expect(component.census.length).toBe(1);
    expect(component.snapshotMissing).toBeFalse();
  });

  it('404 snapshot response surfaces snapshotMissing banner', () => {
    svc.getSnapshotSpy.and.returnValue(throwError(() => ({ status: 404 })));
    const past = new Date();
    past.setDate(past.getDate() - 3);
    component.selectedDate = past;
    component.onDateChange();

    expect(component.mode).toBe('snapshot');
    expect(component.snapshotMissing).toBeTrue();
    expect(component.census.length).toBe(0);
  });

  it('auto-refresh tick is suppressed in snapshot mode', fakeAsync(() => {
    // Switch to snapshot mode
    const past = new Date();
    past.setDate(past.getDate() - 2);
    component.selectedDate = past;
    component.onDateChange();
    const snapshotCallsBefore = svc.getSnapshotSpy.calls.count();
    const liveCallsBefore = svc.getBedCensusSpy.calls.count();

    // Advance 60s — interval fires, but refresh() gate blocks because mode !== 'live'
    tick(61000);

    // No additional live fetch, no additional snapshot fetch.
    expect(svc.getBedCensusSpy.calls.count()).toBe(liveCallsBefore);
    expect(svc.getSnapshotSpy.calls.count()).toBe(snapshotCallsBefore);

    // Cleanup so fakeAsync doesn't complain about pending timers.
    component.ngOnDestroy();
    tick(61000);
  }));
});
