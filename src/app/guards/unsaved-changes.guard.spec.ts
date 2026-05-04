import { TestBed } from '@angular/core/testing';

import { UnsavedChangesGuard } from './unsaved-changes.guard';

describe('UnsavedChangesGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [UnsavedChangesGuard] });
  });

  it('should be created', () => {
    const guard = TestBed.inject(UnsavedChangesGuard);
    expect(guard).toBeTruthy();
  });
});
