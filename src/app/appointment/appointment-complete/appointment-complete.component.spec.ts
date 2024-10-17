import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppointmentCompleteComponent } from './appointment-complete.component';

describe('AppointmentCompleteComponent', () => {
  let component: AppointmentCompleteComponent;
  let fixture: ComponentFixture<AppointmentCompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppointmentCompleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppointmentCompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
