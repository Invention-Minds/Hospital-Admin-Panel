import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstimationCancelComponent } from './estimation-cancel.component';

describe('EstimationCancelComponent', () => {
  let component: EstimationCancelComponent;
  let fixture: ComponentFixture<EstimationCancelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EstimationCancelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstimationCancelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
