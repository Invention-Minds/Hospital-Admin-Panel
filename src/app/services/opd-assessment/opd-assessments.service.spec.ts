import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { OpdAssessmentsService } from './opd-assessments.service';
import { environment } from '../../../environment/environment.prod';
import { installHttpVerify } from '../../shared/testing/test-utils';

describe('OpdAssessmentsService', () => {
  let service: OpdAssessmentsService;
  let http: HttpTestingController;
  const API = `${environment.apiUrl}/opd`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OpdAssessmentsService],
    });
    service = TestBed.inject(OpdAssessmentsService);
    http = TestBed.inject(HttpTestingController);
  });

  installHttpVerify(() => http);

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('admitToIpd — POSTs /opd/admit-to-ipd with expected payload', () => {
    const payload = {
      appointmentId: 42,
      wardId: 'W1',
      bedId: 'B1',
      admittingDoctorId: 7,
      admittingDoctorName: 'Dr. Meera Joshi',
      admissionType: 'elective' as const,
    };
    service.admitToIpd(payload).subscribe();
    const req = http.expectOne(`${API}/admit-to-ipd`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({
      message: 'Patient admitted to IPD from OPD',
      data: { ipdAdmission: { id: 'adm-7', admissionNo: 'JMRH-IPD-0007' } },
    });
  });

  it('admitToIpd — surfaces 400 as HttpErrorResponse', (done) => {
    service
      .admitToIpd({
        appointmentId: 42,
        wardId: 'W1',
        bedId: 'B1',
        admittingDoctorId: null,
        admittingDoctorName: '',
        admissionType: 'elective',
      })
      .subscribe({
        next: () => fail('expected 400'),
        error: (err) => {
          expect(err.status).toBe(400);
          done();
        },
      });
    const req = http.expectOne(`${API}/admit-to-ipd`);
    req.flush({ message: 'Missing required fields' }, { status: 400, statusText: 'Bad Request' });
  });

  it('admitToIpd — surfaces 500', (done) => {
    service
      .admitToIpd({
        appointmentId: 42,
        wardId: 'W1',
        bedId: 'B1',
        admittingDoctorId: 7,
        admittingDoctorName: 'Dr. X',
        admissionType: 'routine',
      })
      .subscribe({
        next: () => fail('expected 500'),
        error: (err) => {
          expect(err.status).toBe(500);
          done();
        },
      });
    const req = http.expectOne(`${API}/admit-to-ipd`);
    req.flush({ message: 'server error' }, { status: 500, statusText: 'Server Error' });
  });
});
