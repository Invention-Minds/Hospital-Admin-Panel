import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TherapyAnalyticsComponent } from './therapy-analytics.component';

describe('TherapyAnalyticsComponent', () => {
  let component: TherapyAnalyticsComponent;
  let fixture: ComponentFixture<TherapyAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TherapyAnalyticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TherapyAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
