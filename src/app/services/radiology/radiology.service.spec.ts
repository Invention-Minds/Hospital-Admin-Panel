import { TestBed } from '@angular/core/testing';

import { RadiologyService } from './radiology.service';

describe('RadiologyService', () => {
  let service: RadiologyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RadiologyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
