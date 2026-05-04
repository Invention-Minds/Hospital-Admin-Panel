/**
 * Sprint 3c — IpdPrescriptionService tests.
 *
 * Service-layer HTTP contract assertions for the endpoints driven by the
 * Pharmacy and MAR screens. Uses HttpTestingController with describe-scope
 * installHttpVerify so any pending mock fails the test loudly.
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import {
  IpdPrescription,
  IpdPrescriptionService,
  MedicationAdminLog,
} from './ipd-prescription.service';
import { environment } from '../../environment/environment.prod';
import { installHttpVerify } from '../shared/testing/test-utils';

describe('IpdPrescriptionService — pharmacy + MAR', () => {
  let service: IpdPrescriptionService;
  let http: HttpTestingController;
  const ADMISSION_ID = 'adm-42';
  const API = `${environment.apiUrl}/ipd-pharmacy`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [IpdPrescriptionService],
    });
    service = TestBed.inject(IpdPrescriptionService);
    http = TestBed.inject(HttpTestingController);
  });

  installHttpVerify(() => http);

  // ---- reviewCarryoverPrescriptions ----------------------------------------

  it('reviewCarryoverPrescriptions — GETs admission-scoped URL and surfaces full tablet detail', () => {
    let captured: unknown;
    service.reviewCarryoverPrescriptions(ADMISSION_ID).subscribe((res) => {
      captured = res;
    });

    const req = http.expectOne(`${API}/admission/${ADMISSION_ID}/review-carryover`);
    expect(req.request.method).toBe('GET');

    const body = {
      message: 'ok',
      data: [
        {
          prescriptionId: 'PRE-100',
          prescribedBy: 'Dr. Jacob Ryan',
          prescribedDate: '2026-04-15',
          patientName: 'Ravi Kumar',
          tablets: [
            { id: 1, genericName: 'Amoxicillin', brandName: 'Mox', frequency: 'q8h', duration: '5 days', route: 'oral', quantity: 15, instructions: 'After food' },
          ],
        },
      ],
    };
    req.flush(body);
    expect(captured).toEqual(body as unknown as []);
  });

  it('reviewCarryoverPrescriptions — surfaces 404 as HttpErrorResponse', (done) => {
    service.reviewCarryoverPrescriptions(ADMISSION_ID).subscribe({
      next: () => fail('expected 404'),
      error: (err) => { expect(err.status).toBe(404); done(); },
    });
    const req = http.expectOne(`${API}/admission/${ADMISSION_ID}/review-carryover`);
    req.flush({ message: 'IPD admission not found' }, { status: 404, statusText: 'Not Found' });
  });

  // ---- continuePrescription ------------------------------------------------

  it('continuePrescription — POSTs admission-scoped URL with the prescription body', () => {
    const payload: IpdPrescription = {
      admissionId: ADMISSION_ID,
      prescribedBy: 'Dr. Jacob Ryan',
      genericName: 'Amoxicillin',
      dose: 'After food',
      frequency: 'q8h',
      duration: '5 days',
      route: 'oral',
      quantity: 15,
      isCarryOver: true,
      carryOverFrom: 'opd',
      adminStatus: 'pending',
      status: 'active',
    };

    service.continuePrescription(ADMISSION_ID, payload).subscribe();
    const req = http.expectOne(`${API}/admission/${ADMISSION_ID}/continue`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ message: 'Prescription continued in IPD', data: { id: 'rx-1' } });
  });

  it('continuePrescription — surfaces 500 as HttpErrorResponse', (done) => {
    service
      .continuePrescription(ADMISSION_ID, { admissionId: ADMISSION_ID } as IpdPrescription)
      .subscribe({
        next: () => fail('expected 500'),
        error: (err) => { expect(err.status).toBe(500); done(); },
      });
    const req = http.expectOne(`${API}/admission/${ADMISSION_ID}/continue`);
    req.flush({ message: 'err' }, { status: 500, statusText: 'Server Error' });
  });

  // ---- modifyPrescription / discontinuePrescription ------------------------

  it('modifyPrescription — PUTs prescription-scoped URL with modification body', () => {
    const mod = { dose: '500 mg', frequency: 'q6h', duration: '7 days', route: 'oral', instructions: 'With meals' };
    service.modifyPrescription('rx-1', mod).subscribe();
    const req = http.expectOne(`${API}/prescription/rx-1/modify`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(mod);
    req.flush({ message: 'Prescription modified successfully', data: {} });
  });

  it('discontinuePrescription — PUTs prescription-scoped URL with reason', () => {
    service.discontinuePrescription('rx-1', 'Adverse reaction').subscribe();
    const req = http.expectOne(`${API}/prescription/rx-1/discontinue`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ reason: 'Adverse reaction' });
    req.flush({ message: 'Prescription discontinued successfully', data: {} });
  });

  // ---- administerMedication ------------------------------------------------

  it('administerMedication — POSTs prescription-scoped URL with admin log', () => {
    const log: MedicationAdminLog = {
      prescriptionId: 'rx-1',
      adminTime: new Date('2026-04-19T10:00:00Z'),
      administeredBy: '',
      dose: '1',
      route: 'iv',
      notes: 'Patient stable',
    };
    service.administerMedication('rx-1', log).subscribe();
    const req = http.expectOne(`${API}/prescription/rx-1/administer`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(log);
    req.flush({ message: 'Medication administered and logged', data: {} });
  });

  it('administerMedication — surfaces 404 as HttpErrorResponse', (done) => {
    service
      .administerMedication('rx-missing', {
        prescriptionId: 'rx-missing',
        adminTime: new Date(),
        administeredBy: '',
        dose: '1',
        route: 'oral',
      })
      .subscribe({
        next: () => fail('expected 404'),
        error: (err) => { expect(err.status).toBe(404); done(); },
      });
    const req = http.expectOne(`${API}/prescription/rx-missing/administer`);
    req.flush({ message: 'Prescription not found' }, { status: 404, statusText: 'Not Found' });
  });

  // ---- getPendingMedications + getMedicationAdministrationRecord ----------

  it('getPendingMedications — GETs admission-scoped URL', () => {
    service.getPendingMedications(ADMISSION_ID).subscribe();
    const req = http.expectOne(`${API}/admission/${ADMISSION_ID}/pending`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'ok', data: [] });
  });

  it('getMedicationAdministrationRecord — GETs admission-scoped URL and preserves enriched shape', () => {
    let captured: unknown;
    service.getMedicationAdministrationRecord(ADMISSION_ID).subscribe((res) => {
      captured = res;
    });

    const req = http.expectOne(`${API}/admission/${ADMISSION_ID}/mar`);
    expect(req.request.method).toBe('GET');

    const body = {
      message: 'ok',
      data: [
        {
          id: 'log-1',
          prescriptionId: 'rx-1',
          admissionId: ADMISSION_ID,
          administeredAt: '2026-04-19T10:00:00Z',
          administeredBy: 'Nurse Kavya',
          quantity: 1,
          route: 'iv',
          remarks: null,
          createdAt: '2026-04-19T10:00:00Z',
          prescription: { id: 'rx-1', genericName: 'Ceftriaxone', brandName: 'Rocephin', frequency: 'q12h', route: 'iv' },
        },
      ],
      pagination: { total: 1, page: 1, limit: 10, pages: 1 },
    };
    req.flush(body);
    expect(captured).toEqual(body as unknown as []);
  });
});
