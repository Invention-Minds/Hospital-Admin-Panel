/**
 * Sprint 3f — EmergencyListComponent admit-wiring tests (2).
 *
 * Narrow focus: the un-stubbed convertToIPD opens the admit modal with
 * the correct emergency context; onAdmittedToIpd reloads the list.
 */

import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { EmergencyListComponent } from './emergency-list.component';
import { EmergencyService, EmergencyCase } from '../../services/emergency.service';

class EmergencyServiceStub {
  listSpy = jasmine.createSpy('getAllEmergencyCases').and.returnValue(of([] as EmergencyCase[]));
  getAllEmergencyCases() { return this.listSpy(); }
  updateEmergencyCaseStatus(_id: string, _s: string) { return of({}); }
  convertToIPD(_id: string, _data: unknown) { return of({}); }
}

function buildComponent() {
  const svc = new EmergencyServiceStub();
  const messageService = { add: jasmine.createSpy('add') } as unknown as MessageService;
  const router = { navigate: jasmine.createSpy('navigate') } as any;
  const component = new EmergencyListComponent(
    svc as unknown as EmergencyService,
    messageService,
    router
  );
  return { component, svc, messageService, router };
}

describe('EmergencyListComponent — Sprint 3f admit wiring', () => {
  it('convertToIPD opens the admit modal with source=emergency and correct context', () => {
    const { component } = buildComponent();
    component.emergencyCases = [
      { id: '9', prn: 'JMRH-ER-9', triageCategory: 'red', presentingComplaint: 'Chest pain',
        abcdeAssessment: '', vitalsBP: '120/80', vitalsHR: 90, vitalsRR: 18,
        vitalsSpO2: 96, vitalsTemp: 98, status: 'arrived', docmindsCreated: true, hmisCreated: false } as EmergencyCase,
    ];

    component.convertToIPD('9');

    expect(component.admitModalVisible).toBe(true);
    expect(component.admitContext).toEqual(jasmine.objectContaining({
      sourceId: '9',
      prn: 'JMRH-ER-9',
      referringDoctor: 'Emergency Department',
      summary: 'Chest pain',
      suggestedAdmissionType: 'emergency',
      suggestedRoomType: 'ICU',
    }));
  });

  it('onAdmittedToIpd closes the modal and reloads the list', () => {
    const { component, svc } = buildComponent();
    component.admitModalVisible = true;
    svc.listSpy.calls.reset();

    component.onAdmittedToIpd({ admissionId: 'adm-7', admissionNo: 'JMRH-IPD-0007' });

    expect(component.admitModalVisible).toBe(false);
    expect(svc.listSpy).toHaveBeenCalledTimes(1);
  });
});
