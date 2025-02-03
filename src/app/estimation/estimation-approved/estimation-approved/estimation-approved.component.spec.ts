import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstimationApprovedComponent } from './estimation-approved.component';

describe('EstimationApprovedComponent', () => {
  let component: EstimationApprovedComponent;
  let fixture: ComponentFixture<EstimationApprovedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EstimationApprovedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstimationApprovedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
