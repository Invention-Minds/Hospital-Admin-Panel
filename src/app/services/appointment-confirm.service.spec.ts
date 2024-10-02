import { TestBed } from '@angular/core/testing';

import { AppointmentConfirmService } from './appointment-confirm.service';

describe('AppointmentConfirmService', () => {
  let service: AppointmentConfirmService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppointmentConfirmService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
