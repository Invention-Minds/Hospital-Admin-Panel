/**
 * Sprint 3f — OpdAssessmentComponent admit-wiring tests (2).
 *
 * Narrow focus: the Admit-to-IPD button's enablement rule and the modal-open
 * context. Existing `opd-assessment.component.spec.ts` is a CLI-scaffold
 * stock spec pre-dating Sprint 3, left untouched (3a-2 policy).
 */

import { of } from 'rxjs';
import { MessageService } from 'primeng/api';

import { OpdAssessmentComponent } from './opd-assessment.component';

type AnyFn = (...args: unknown[]) => unknown;

function buildComponent(): OpdAssessmentComponent {
  const opdService: any = {
    saveAssessment: jasmine.createSpy('saveAssessment').and.returnValue(of({ id: 101 })),
    updateAssessment: jasmine.createSpy('updateAssessment').and.returnValue(of({})),
    getAssessmentByAppointmentId: jasmine.createSpy('getAssessmentByAppointmentId').and.returnValue(of(null)),
    admitToIpd: jasmine.createSpy('admitToIpd'),
  };
  const messageService: Pick<MessageService, 'add'> = { add: jasmine.createSpy('add') as unknown as AnyFn } as any;
  const appointmentService: any = {
    getAppointmentById: jasmine.createSpy('getAppointmentById').and.returnValue(of({})),
    getDetailsByPRN: jasmine.createSpy('getDetailsByPRN').and.returnValue(of(null)),
  };
  const voiceOPDService: any = { transcribe: jasmine.createSpy('transcribe').and.returnValue(of({})) };

  return new OpdAssessmentComponent(opdService, messageService as MessageService, appointmentService, voiceOPDService);
}

describe('OpdAssessmentComponent — Sprint 3f admit wiring', () => {
  it('admit button is not eligible until assessment has been saved (no formData.id)', () => {
    const component = buildComponent();
    component.appointmentId = 42;
    component.isEditMode = false;
    component.formData = { ...component.formData, id: undefined };

    expect(component.admitEligible).toBe(false);
  });

  it('after successful save, admitEligible flips true, openAdmitToIpd populates context + modal visibility', () => {
    const component = buildComponent();
    component.appointmentId = 42;

    // Simulate the post-save state that submitForm sets on success.
    component.formData = {
      ...component.formData,
      id: 101,
      uhid: '1001',
      patientName: 'Asha Kumari',
      doctorName: 'Dr. Ravi',
      consultant: 'Dr. Ravi',
      treatmentPlan: 'Admit for BP stabilisation',
      investigation: 'ECG pending',
    };
    component.isEditMode = true;

    expect(component.admitEligible).toBe(true);

    component.openAdmitToIpd();

    expect(component.admitModalVisible).toBe(true);
    expect(component.admitContext).toEqual(jasmine.objectContaining({
      sourceId: 42,
      prn: '1001',
      patientName: 'Asha Kumari',
      referringDoctor: 'Dr. Ravi',
      suggestedAdmissionType: 'elective',
    }));
    expect(component.admitContext?.summary).toContain('Admit for BP stabilisation');
    expect(component.admitContext?.summary).toContain('ECG pending');
  });
});
