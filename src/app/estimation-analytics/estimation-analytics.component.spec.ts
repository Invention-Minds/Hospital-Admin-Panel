import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstimationAnalyticsComponent } from './estimation-analytics.component';

describe('EstimationAnalyticsComponent', () => {
  let component: EstimationAnalyticsComponent;
  let fixture: ComponentFixture<EstimationAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EstimationAnalyticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstimationAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
