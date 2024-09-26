import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppointmentListOverviewComponent } from './appointment-list-overview.component';

describe('AppointmentListOverviewComponent', () => {
  let component: AppointmentListOverviewComponent;
  let fixture: ComponentFixture<AppointmentListOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppointmentListOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppointmentListOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
