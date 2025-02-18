import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodayAnalyticsComponent } from './today-analytics.component';

describe('TodayAnalyticsComponent', () => {
  let component: TodayAnalyticsComponent;
  let fixture: ComponentFixture<TodayAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TodayAnalyticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TodayAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
