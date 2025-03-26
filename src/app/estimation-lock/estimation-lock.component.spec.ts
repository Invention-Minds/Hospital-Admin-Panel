import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstimationLockComponent } from './estimation-lock.component';

describe('EstimationLockComponent', () => {
  let component: EstimationLockComponent;
  let fixture: ComponentFixture<EstimationLockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EstimationLockComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstimationLockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
