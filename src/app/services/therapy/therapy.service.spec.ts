import { TestBed } from '@angular/core/testing';

import { TherapyService } from './therapy.service';

describe('TherapyService', () => {
  let service: TherapyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TherapyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
