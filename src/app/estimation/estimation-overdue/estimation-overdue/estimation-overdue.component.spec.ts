import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstimationOverdueComponent } from './estimation-overdue.component';

describe('EstimationOverdueComponent', () => {
  let component: EstimationOverdueComponent;
  let fixture: ComponentFixture<EstimationOverdueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EstimationOverdueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstimationOverdueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
