import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalyticsFilterComponent } from './analytics-filter.component';

describe('AnalyticsFilterComponent', () => {
  let component: AnalyticsFilterComponent;
  let fixture: ComponentFixture<AnalyticsFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AnalyticsFilterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalyticsFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
