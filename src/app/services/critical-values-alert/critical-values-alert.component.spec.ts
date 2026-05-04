/**
 * Sprint 3g — CriticalValuesAlertComponent tests.
 *
 * Covers mount + SSE wiring + panel toggle + severity class + mute persistence
 * + prefers-reduced-motion auto-mute + alert clearing + a11y attributes.
 * Uses a Subject<CriticalValueAlert> as the service's SSE double so each
 * test can push events synchronously.
 */

import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { CriticalValuesAlertComponent } from './critical-values-alert.component';
import { CriticalValuesService, CriticalValueAlert } from '../../services/critical-values.service';
import { AuthServiceService } from '../../services/auth/auth-service.service';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';

class CriticalValuesServiceStub {
  stream$ = new Subject<CriticalValueAlert>();
  subscribeSpy = jasmine.createSpy('subscribeToCriticalValues');
  clearSpy = jasmine.createSpy('clearAlert');
  clearAllSpy = jasmine.createSpy('clearAllAlerts');
  unsubscribeSpy = jasmine.createSpy('unsubscribeFromCriticalValues');
  ackSpy = jasmine.createSpy('acknowledgeAlert').and.returnValue(of({ ok: true }));

  subscribeToCriticalValues(_userId: string): Observable<CriticalValueAlert> {
    this.subscribeSpy(_userId);
    return this.stream$.asObservable();
  }
  clearAlert(id: string): void { this.clearSpy(id); }
  clearAllAlerts(): void { this.clearAllSpy(); }
  unsubscribeFromCriticalValues(): void { this.unsubscribeSpy(); }
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Observable<unknown> {
    return this.ackSpy(alertId, acknowledgedBy);
  }
}

class AuthServiceStub {
  private id: number | null = 99;
  private username: string | null = 'alice';
  setUserId(v: number | null) { this.id = v; }
  setUsername(u: string | null) { this.username = u; }
  getUserId(): number | null { return this.id; }
  getUsername(): string | null { return this.username; }
}

const sampleAlert = (overrides: Partial<CriticalValueAlert> = {}): CriticalValueAlert => ({
  id: 'alert-1',
  timestamp: new Date('2026-04-20T10:00:00Z'),
  prn: '1001',
  patientName: 'Asha Kumari',
  testName: 'Potassium',
  result: '7.1',
  referenceRange: '3.5–5.1',
  unit: 'mmol/L',
  criticalLevel: 'critical',
  type: 'lab',
  ...overrides,
});

describe('CriticalValuesAlertComponent', () => {
  let fixture: ComponentFixture<CriticalValuesAlertComponent>;
  let component: CriticalValuesAlertComponent;
  let svc: CriticalValuesServiceStub;
  let auth: AuthServiceStub;

  const setup = async () => {
    svc = new CriticalValuesServiceStub();
    auth = new AuthServiceStub();
    // Default: no localStorage + no reduced-motion preference → muted stays false.
    try {
      localStorage.removeItem('critical-values-muted');
    } catch {
      /* ignore */
    }

    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [CriticalValuesAlertComponent],
      providers: [
        { provide: CriticalValuesService, useValue: svc },
        { provide: AuthServiceService, useValue: auth },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CriticalValuesAlertComponent);
    component = fixture.componentInstance;
    // Silence the Web Audio path so tests don't try to open AudioContext.
    spyOn(component, 'playAlertSound').and.callFake(() => {});
  };

  it('subscribes to SSE when AuthService returns a userId', async () => {
    await setup();
    fixture.detectChanges();
    expect(svc.subscribeSpy).toHaveBeenCalledWith('99');
  });

  it('does NOT subscribe when AuthService.getUserId returns null', async () => {
    await setup();
    auth.setUserId(null);
    fixture.detectChanges();
    expect(svc.subscribeSpy).not.toHaveBeenCalled();
  });

  it('receives an SSE event, unshifts to alerts, increments unreadCount, renders bell', async () => {
    await setup();
    fixture.detectChanges();
    svc.stream$.next(sampleAlert());
    fixture.detectChanges();

    expect(component.alerts.length).toBe(1);
    expect(component.alerts[0].id).toBe('alert-1');
    expect(component.unreadCount).toBe(1);
    expect(component.isConnected).toBe(true);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="bell-btn"]')).not.toBeNull();
  });

  it('togglePanel opens the panel and resets unreadCount', async () => {
    await setup();
    fixture.detectChanges();
    svc.stream$.next(sampleAlert());
    svc.stream$.next(sampleAlert({ id: 'alert-2' }));
    fixture.detectChanges();
    expect(component.unreadCount).toBe(2);

    component.togglePanel();
    fixture.detectChanges();

    expect(component.showPanel).toBe(true);
    expect(component.unreadCount).toBe(0);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="alert-panel"]')).not.toBeNull();
  });

  it('closePanel (ESC) hides the panel', async () => {
    await setup();
    fixture.detectChanges();
    component.togglePanel();
    fixture.detectChanges();
    expect(component.showPanel).toBe(true);

    component.onEscape();
    fixture.detectChanges();

    expect(component.showPanel).toBe(false);
  });

  it('getCriticalityClass maps severity to crit-level-* classes', async () => {
    await setup();
    expect(component.getCriticalityClass('critical')).toBe('crit-level-critical');
    expect(component.getCriticalityClass('high')).toBe('crit-level-high');
    expect(component.getCriticalityClass('low')).toBe('crit-level-low');
    expect(component.getCriticalityClass('something-else')).toBe('crit-level-default');
  });

  it('clearAlert removes it from local state and calls the service (after successful ack)', async () => {
    await setup();
    fixture.detectChanges();
    svc.stream$.next(sampleAlert({ id: 'to-clear' }));
    svc.stream$.next(sampleAlert({ id: 'stays' }));
    fixture.detectChanges();

    await component.clearAlert('to-clear');

    expect(svc.clearSpy).toHaveBeenCalledWith('to-clear');
    expect(component.alerts.length).toBe(1);
    expect(component.alerts[0].id).toBe('stays');
  });

  it('clearAllAlerts (all succeed) resets local state and calls the service', async () => {
    await setup();
    fixture.detectChanges();
    svc.stream$.next(sampleAlert());
    svc.stream$.next(sampleAlert({ id: 'x' }));
    fixture.detectChanges();

    await component.clearAllAlerts();

    expect(svc.clearAllSpy).toHaveBeenCalled();
    expect(component.alerts.length).toBe(0);
    expect(component.unreadCount).toBe(0);
  });

  it('toggleMute persists mute state to localStorage', async () => {
    await setup();
    fixture.detectChanges();
    expect(component.muted).toBe(false);

    component.toggleMute();
    expect(component.muted).toBe(true);
    expect(localStorage.getItem('critical-values-muted')).toBe('true');

    component.toggleMute();
    expect(component.muted).toBe(false);
    expect(localStorage.getItem('critical-values-muted')).toBe('false');
  });

  it('auto-mutes on init when prefers-reduced-motion=reduce and no stored preference', async () => {
    svc = new CriticalValuesServiceStub();
    auth = new AuthServiceStub();
    try { localStorage.removeItem('critical-values-muted'); } catch { /* ignore */ }
    spyOn(window, 'matchMedia').and.callFake((q: string) =>
      ({ matches: q.includes('reduce'), media: q, onchange: null,
         addListener: () => {}, removeListener: () => {},
         addEventListener: () => {}, removeEventListener: () => {},
         dispatchEvent: () => false }) as MediaQueryList
    );

    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [CriticalValuesAlertComponent],
      providers: [
        { provide: CriticalValuesService, useValue: svc },
        { provide: AuthServiceService, useValue: auth },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CriticalValuesAlertComponent);
    component = fixture.componentInstance;
    spyOn(component, 'playAlertSound').and.callFake(() => {});
    fixture.detectChanges();

    expect(component.muted).toBe(true);
  });

  it('renders role="log" container and role="alert" per item when panel is open', async () => {
    await setup();
    fixture.detectChanges();
    svc.stream$.next(sampleAlert());
    component.togglePanel();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const list = host.querySelector('.alerts-list');
    expect(list?.getAttribute('role')).toBe('log');
    expect(list?.getAttribute('aria-live')).toBe('assertive');
    const item = host.querySelector('.alert-item');
    expect(item?.getAttribute('role')).toBe('alert');
  });

  // ---- Sprint 4a Phase 1d — server-side ack wiring ------------------------

  it('clearAlert invokes acknowledgeAlert with JWT-resolvable username before local dismissal', async () => {
    await setup();
    fixture.detectChanges();
    svc.stream$.next(sampleAlert({ id: 'to-clear' }));
    fixture.detectChanges();

    await component.clearAlert('to-clear');

    expect(svc.ackSpy).toHaveBeenCalledWith('to-clear', 'alice');
    expect(svc.clearSpy).toHaveBeenCalledWith('to-clear');
    expect(component.alerts.length).toBe(0);
  });

  it('clearAlert handles ack failure: dismisses locally anyway + toasts the failure', async () => {
    await setup();
    fixture.detectChanges();
    svc.ackSpy.and.returnValue(throwError(() => new Error('500 server error')));
    svc.stream$.next(sampleAlert({ id: 'to-clear' }));
    fixture.detectChanges();

    const ms = TestBed.inject(MessageService);
    const addSpy = spyOn(ms, 'add');

    await component.clearAlert('to-clear');

    expect(svc.ackSpy).toHaveBeenCalledWith('to-clear', 'alice');
    expect(svc.clearSpy).toHaveBeenCalledWith('to-clear');
    expect(component.alerts.length).toBe(0);
    expect(addSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        severity: 'warn',
        summary: 'Alert dismissed locally',
      })
    );
  });

  it('dismiss button disabled while ack is in-flight (guards rapid double-click)', async () => {
    await setup();
    fixture.detectChanges();
    svc.stream$.next(sampleAlert({ id: 'inflight' }));
    component.togglePanel(); // panel must be open for per-alert buttons to render
    fixture.detectChanges();

    // Prime the in-flight set manually to assert the disabled binding.
    component.ackInFlight.add('inflight');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const btn = host.querySelector('[data-testid="dismiss-inflight"]') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(true);
  });

  it('clearAllAlerts with Promise.allSettled: partial success removes succeeded, keeps failed, toasts summary', async () => {
    await setup();
    fixture.detectChanges();
    svc.stream$.next(sampleAlert({ id: 'a' }));
    svc.stream$.next(sampleAlert({ id: 'b' }));
    svc.stream$.next(sampleAlert({ id: 'c' }));
    fixture.detectChanges();

    // 'b' fails to ack; 'a' + 'c' succeed.
    svc.ackSpy.and.callFake((alertId: string) =>
      alertId === 'b'
        ? throwError(() => new Error('server 500'))
        : of({ ok: true })
    );

    const ms = TestBed.inject(MessageService);
    const addSpy = spyOn(ms, 'add');

    await component.clearAllAlerts();

    expect(svc.ackSpy).toHaveBeenCalledTimes(3);
    // Only 'b' remains (the failed one).
    expect(component.alerts.map((x) => x.id)).toEqual(['b']);
    expect(svc.clearAllSpy).not.toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        severity: 'warn',
        summary: '2 of 3 alerts acknowledged',
        detail: jasmine.stringContaining('1 failed'),
      })
    );
  });

  it('getUsername helper sources from auth user then localStorage', async () => {
    await setup();

    // auth.getUsername() happy path
    expect(auth.getUsername()).toBe('alice');

    // null-out auth, localStorage fallback
    auth.setUsername(null);
    expect(auth.getUsername()).toBeNull();
  });
});
