import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstimationOverviewComponent } from './estimation-overview.component';

describe('EstimationOverviewComponent', () => {
  let component: EstimationOverviewComponent;
  let fixture: ComponentFixture<EstimationOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EstimationOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstimationOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
