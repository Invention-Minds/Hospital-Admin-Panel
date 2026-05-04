/**
 * Sprint 3g — CriticalValuesService tests.
 *
 * Covers:
 *   - subscribeToCriticalValues opens an EventSource at the correct URL and
 *     pushes parsed `critical-value` events through the returned Observable.
 *   - unsubscribeFromCriticalValues closes the EventSource.
 *   - acknowledgeAlert POSTs to the correct endpoint.
 *   - clearAlert / clearAllAlerts update the BehaviorSubject state.
 *
 * EventSource isn't a standard DOM in Karma/JSDOM-flavoured envs uniformly;
 * we stub the global constructor with a minimal listener-registering double
 * so we can synchronously dispatch events.
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { CriticalValuesService, CriticalValueAlert } from './critical-values.service';
import { environment } from '../../environment/environment.prod';
import { installHttpVerify } from '../shared/testing/test-utils';

interface StubEventSource {
  url: string;
  close: jasmine.Spy;
  listeners: Record<string, Array<(e: MessageEvent) => void>>;
  onerror: ((e: Event) => void) | null;
  dispatch: (type: string, data: unknown) => void;
  instance: number;
}

let openedSources: StubEventSource[] = [];

const makeStubEventSource = () => {
  class StubCtor {
    url: string;
    close = jasmine.createSpy('close');
    listeners: Record<string, Array<(e: MessageEvent) => void>> = {};
    onerror: ((e: Event) => void) | null = null;
    instance: number;
    constructor(url: string) {
      this.url = url;
      this.instance = openedSources.length;
      openedSources.push(this as unknown as StubEventSource);
    }
    addEventListener(type: string, cb: unknown): void {
      if (!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(cb as (e: MessageEvent) => void);
    }
    dispatch(type: string, data: unknown): void {
      (this.listeners[type] ?? []).forEach((cb) =>
        cb({ data: JSON.stringify(data) } as MessageEvent)
      );
    }
  }
  return StubCtor;
};

describe('CriticalValuesService', () => {
  let service: CriticalValuesService;
  let http: HttpTestingController;
  const API = `${environment.apiUrl}/critical-values`;
  let OriginalEventSource: typeof EventSource | undefined;

  beforeEach(() => {
    openedSources = [];
    OriginalEventSource = (window as unknown as { EventSource?: typeof EventSource }).EventSource;
    (window as unknown as { EventSource: unknown }).EventSource = makeStubEventSource();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CriticalValuesService],
    });
    service = TestBed.inject(CriticalValuesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    if (OriginalEventSource !== undefined) {
      (window as unknown as { EventSource: typeof EventSource }).EventSource = OriginalEventSource;
    }
  });

  installHttpVerify(() => http);

  it('subscribeToCriticalValues opens an EventSource at /critical-values/stream?userId=...', (done) => {
    const sub = service.subscribeToCriticalValues('user-99').subscribe({
      next: (alert) => {
        expect(alert.id).toBe('alert-A');
        expect(alert.prn).toBe('1001');
        sub.unsubscribe();
        done();
      },
    });

    expect(openedSources.length).toBe(1);
    expect(openedSources[0].url).toContain(`${API}/stream?userId=user-99`);

    // Push a 'critical-value' event through the stub — service should parse + emit.
    const fakeAlert: CriticalValueAlert = {
      id: 'alert-A',
      timestamp: new Date(),
      prn: '1001',
      testName: 'Glucose',
      result: '450',
      criticalLevel: 'critical',
      type: 'lab',
    };
    openedSources[0].dispatch('critical-value', fakeAlert);
  });

  it('unsubscribeFromCriticalValues closes the active EventSource', () => {
    service.subscribeToCriticalValues('user-99').subscribe();
    expect(openedSources.length).toBe(1);
    const first = openedSources[0];

    service.unsubscribeFromCriticalValues();

    expect(first.close).toHaveBeenCalled();
  });

  it('acknowledgeAlert POSTs to /critical-values/alerts/:id/acknowledge with the expected body', () => {
    service.acknowledgeAlert('alert-A', 'reception-1').subscribe();
    const req = http.expectOne(`${API}/alerts/alert-A/acknowledge`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ acknowledgedBy: 'reception-1' });
    req.flush({ ok: true });
  });

  it('clearAlert removes the alert from the BehaviorSubject snapshot', (done) => {
    service['criticalAlertsSource'].next([
      { id: 'a', timestamp: new Date(), prn: '1', testName: 't', result: 'r',
        criticalLevel: 'critical', type: 'lab' } as CriticalValueAlert,
      { id: 'b', timestamp: new Date(), prn: '2', testName: 't', result: 'r',
        criticalLevel: 'high', type: 'lab' } as CriticalValueAlert,
    ]);

    service.clearAlert('a');

    service.criticalAlerts$.subscribe((list) => {
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('b');
      done();
    });
  });

  it('clearAllAlerts empties the BehaviorSubject snapshot', (done) => {
    service['criticalAlertsSource'].next([
      { id: 'a', timestamp: new Date(), prn: '1', testName: 't', result: 'r',
        criticalLevel: 'critical', type: 'lab' } as CriticalValueAlert,
    ]);

    service.clearAllAlerts();

    service.criticalAlerts$.subscribe((list) => {
      expect(list.length).toBe(0);
      done();
    });
  });
});
